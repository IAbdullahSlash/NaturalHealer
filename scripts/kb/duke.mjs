// Builds src/data/knowledge/compounds.js from Dr. Duke's Phytochemical and
// Ethnobotanical Databases (USDA Agricultural Research Service), which are CC0.
//   https://doi.org/10.15482/USDA.ADC/1239279
//
// For each plant in the knowledge base it records which compounds Duke lists, in which
// plant parts, and the highest reported amounts. The data dates from 2015 and is uneven,
// so it is shown as background chemistry, never as evidence a remedy works.
//
// Run when herbs change: npm run kb:compounds
// Plants are matched by their accepted name and older names from enrichment.js, so run
// npm run kb:enrich first when adding a herb.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
import { herbs } from '../../src/data/knowledge/herbs.js'
import enrichment from '../../src/data/knowledge/enrichment.js'

const OUT = fileURLToPath(new URL('../../src/data/knowledge/compounds.js', import.meta.url))
const SOURCE = 'https://ndownloader.figshare.com/files/43363335' // Duke-Source-CSV.zip on Ag Data Commons
const TOP = 12

// The few files we need from the archive, read straight from its central directory
function unzip(buf, wanted) {
  const out = {}
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  let p = buf.readUInt32LE(eocd + 16)
  const count = buf.readUInt16LE(eocd + 10)
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    const size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen).split('/').pop()
    if (wanted.includes(name)) {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
      const data = buf.subarray(start, start + size)
      out[name] = (method === 8 ? inflateRawSync(data) : data).toString('latin1')
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

// Quoted CSV, header row first
function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [head, ...body] = rows
  return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

// "QUERCETIN-3-DIGLUCOSIDE" -> "Quercetin-3-diglucoside"; keep Greek-letter prefixes readable
const chemName = (s) => {
  const lower = s.toLowerCase().replace(/\balpha\b/g, 'α').replace(/\bbeta\b/g, 'β').replace(/\bgamma\b/g, 'γ').replace(/\bdelta\b/g, 'δ')
  return lower
    .replace(/desmethoxy/g, 'demethoxy') // Duke spells it both ways
    .replace(/-(acids?)\b/g, ' $1') // "ursolic-acid" -> "ursolic acid"
    .replace(/-([a-d])(-\d+)?$/, (_, l, n = '') => ` ${l.toUpperCase()}${n}`) // "withaferin-a" -> "withaferin A"
    .replace(/[a-z]/, ch => ch.toUpperCase())
}
// Basic food composition (water, starch, minerals, vitamins and so on) would crowd out
// the plant's own chemistry in a list ranked by amount
const NUTRIENT = /^(water|ash|fat|fiber|carbohydrates|starch|sugars?|protein|kcal|calories|energy|moisture|nitrogen|cellulose|lignin|pectin|pentosans|mucilage|(ascorbic|folic|pantothenic|oleic|linoleic|linolenic|palmitic|stearic|myristic|lauric|arachidic|behenic)-acid|thiamin|riboflavin|niacin|vitamin|beta-carotene|tocopherol|phytosterols|(calcium|iron|potassium|sodium|magnesium|phosphorus|zinc|copper|manganese|selenium|chromium|cobalt|aluminum|boron|silicon|sulfur|chlorine|fluorine|iodine|lead|cadmium|nickel|tin|strontium|barium|titanium|rubidium|bromine|lithium|molybdenum|vanadium|mercury|arsenic|silver|gold|antimony|bismuth|cesium|europium|hafnium|lanthanum|samarium|scandium|tantalum|terbium|thorium|uranium|ytterbium|zirconium))\b/i
// Sugars, proteins, amino acids, fat totals and broad class totals ("alkaloids", "eo" for
// the whole essential oil) say little about a particular plant either
const SUGAR = /oses?$|^fructans?$|^hexouronic/
const BULK = /^(eo|kilocalories|aldehydes|alcohols|ketones|esters|monoterpenes|sesquiterpenes|terpenes|anthraquinones|steroids|sterols|chloride|cholesterol|sfa|mufa|pufa|kno3|albumins?|globulins?|glutelins?|prolamines?|amino-acids|alkaloids|tannins?|phenols|flavonoids|saponins?|oxalates?|resins?|gums?|fiber.*|(alanine|arginine|asparagine|aspartic-acid|cystine|cysteine|glutamic-acid|glutamine|glycine|histidine|isoleucine|leucine|lysine|methionine|phenylalanine|proline|serine|threonine|tryptophan|tyrosine|valine))$/
const isNutrient = (chem) => {
  const k = chem.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '-').replace(/^(l|d|dl)-/, '')
  return NUTRIENT.test(k) || SUGAR.test(k) || BULK.test(k)
}

const binomial =(latin) => (latin || '').split(',')[0].trim().split(/\s+/).slice(0, 2).join(' ')
const num = (v) => (v === '' || v == null ? null : Number(v))

console.log('Downloading Duke-Source-CSV.zip from Ag Data Commons…')
const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`${res.status} ${res.statusText} downloading ${SOURCE}`)
const files = unzip(Buffer.from(await res.arrayBuffer()), ['FNFTAX.csv', 'FARMACY_NEW.csv', 'PARTS.csv'])
const taxa = parseCsv(files['FNFTAX.csv'])
const farmacy = parseCsv(files['FARMACY_NEW.csv'])
const parts = Object.fromEntries(parseCsv(files['PARTS.csv']).map(p => [p.PPCO, p.PPNA]))

// Species-level records win; otherwise the typical variety ("Allium sativum var. sativum"),
// which Duke sometimes lists in place of the species itself
const byTaxon = new Map()
const rank = (t) => {
  const [genus, species, ...rest] = t.TAXON.split(/\s+/)
  if (!rest.length) return 0
  return rest[1]?.toLowerCase() === species?.toLowerCase() ? 1 : 2
}
for (const t of taxa) {
  const key = t.TAXON.split(/\s+/).slice(0, 2).join(' ').toLowerCase()
  const prev = byTaxon.get(key)
  if (rank(t) < 2 && (!prev || rank(t) < rank(prev))) byTaxon.set(key, t)
}
const rowsByPlant = new Map()
for (const r of farmacy) {
  if (!rowsByPlant.has(r.FNFNUM)) rowsByPlant.set(r.FNFNUM, [])
  rowsByPlant.get(r.FNFNUM).push(r)
}

const result = {}
for (const h of herbs.filter(x => x.latin && x.kind !== 'formulation')) {
  const b = enrichment.herbs[h.id]?.botanical
  const names = [b?.acceptedName, binomial(h.latin), ...(b?.synonyms || [])].filter(Boolean)
  const match = names.map(n => byTaxon.get(n.toLowerCase())).find(t => t && rowsByPlant.has(t.FNFNUM))
  if (!match) { console.log(`  ${h.id.padEnd(12)} not in Duke`); continue }

  const rows = rowsByPlant.get(match.FNFNUM)
  const compounds = new Map()
  for (const r of rows) {
    const name = chemName(r.CHEM)
    const ppm = num(r.AMT_HI) ?? num(r.AMT_OR_HI) ?? num(r.AMT_OR_LO) ?? num(r.AMT_LO)
    const part = parts[r.PPCO] || r.PPCO
    const c = compounds.get(name) || { name, nutrient: isNutrient(r.CHEM), parts: new Set(), ppm: null }
    if (part) c.parts.add(part)
    // Amounts measured in an essential oil are per part of oil, not of the plant, so they
    // can't be ranked against the rest
    if (ppm != null && !/essent/i.test(part) && (c.ppm == null || ppm > c.ppm)) c.ppm = ppm
    compounds.set(name, c)
  }
  const list = [...compounds.values()]
  const top = list.filter(c => c.ppm != null && !c.nutrient).sort((a, z) => z.ppm - a.ppm).slice(0, TOP)
  const partCounts = {}
  list.forEach(c => c.parts.forEach(p => { partCounts[p] = (partCounts[p] || 0) + 1 }))

  result[h.id] = {
    dukeTaxon: match.TAXON,
    compoundCount: list.length,
    parts: Object.entries(partCounts).sort((a, z) => z[1] - a[1]).map(([part, count]) => ({ part, count })),
    highestAmounts: top.map(c => ({ name: c.name, ppm: c.ppm, parts: [...c.parts].sort() })),
  }
  console.log(`  ${h.id.padEnd(12)} ${match.TAXON.padEnd(28)} ${list.length} compounds`)
}

const attribution = "Dr. Duke's Phytochemical and Ethnobotanical Databases, U.S. Department of Agriculture, Agricultural Research Service, 1992-2016. doi:10.15482/USDA.ADC/1239279. Licence: CC0 1.0 (public domain)."
const header = [
  '// Generated by scripts/kb/duke.mjs. Do not edit by hand; rerun npm run kb:compounds.',
  `// ${attribution}`,
  '// Amounts are the highest reported, in parts per million of the plant part. Background chemistry only.',
].join('\n')
writeFileSync(OUT, `${header}\nexport default ${JSON.stringify({ attribution, source: 'https://doi.org/10.15482/USDA.ADC/1239279', herbs: result }, null, 2)}\n`)
console.log(`\nWrote ${OUT}`)
