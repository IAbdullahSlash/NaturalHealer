// The public dataset: the knowledge base as a Frictionless Data Package (datapackage.json)
// with JSON and CSV files, published at /data/ on every build (see vite.config.js) and
// described on the /dataset page.
//
//   npm run data:export   write the files locally to dataset-export/
//
// Our own entries carry DATASET_LICENSE. Merged open data keeps its source's licence and is
// published in separate files, so attribution stays clear.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { herbs } from '../../src/data/generated/herbs.js'
import { conditions } from '../../src/data/generated/conditions.js'
import { sources } from '../../src/data/generated/sources.js'
import { herbCitations } from './references.mjs'
import enrichment from '../../src/data/knowledge/enrichment.js'
import compounds from '../../src/data/knowledge/compounds.js'
import { CAUTION_GROUPS, DRUG_CLASSES, EVIDENCE_LEVELS } from '../../src/data/knowledge/vocabulary.js'

const root = fileURLToPath(new URL('../../', import.meta.url))

// The owner decides this licence. CC BY 4.0 lets anyone reuse the entries, including
// commercially, as long as they credit Natural Healer.
export const DATASET_LICENSE = { name: 'CC-BY-4.0', title: 'Creative Commons Attribution 4.0', path: 'https://creativecommons.org/licenses/by/4.0/' }

const csvCell = (v) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csv = (columns, rows) => [columns.map(c => c.name).join(','), ...rows.map(r => columns.map(c => csvCell(c.get(r))).join(','))].join('\n') + '\n'
const field = (name, type, description) => ({ name, type, description })

export function datasetFiles({ siteUrl = 'https://natural-healer.vercel.app' } = {}) {
  const generated = new Date().toISOString().slice(0, 10)

  const herbColumns = [
    { ...field('id', 'string', 'Stable id; the page is /herbs/<id>'), get: h => h.id },
    { ...field('name', 'string', 'Household name'), get: h => h.name },
    { ...field('hindi', 'string', 'Name in Hindi'), get: h => h.hindi },
    { ...field('sanskrit', 'string', 'Classical Sanskrit name'), get: h => h.sanskrit },
    { ...field('english', 'string', 'English name'), get: h => h.english },
    { ...field('latin', 'string', 'Botanical name (Kew-accepted for plants)'), get: h => h.latin },
    { ...field('kind', 'string', 'herb, spice, food or formulation'), get: h => h.kind },
    { ...field('part', 'string', 'Part used'), get: h => h.part },
    { ...field('rasa', 'string', 'Tastes, semicolon-separated; empty when unsure'), get: h => h.properties.rasa },
    { ...field('virya', 'string', 'Potency: ushna (heating) or shita (cooling); empty when unsure'), get: h => h.properties.virya },
    { ...field('pacifies', 'string', 'Doshas it pacifies'), get: h => h.properties.pacifies },
    { ...field('aggravates', 'string', 'Doshas it can aggravate'), get: h => h.properties.aggravates },
    { ...field('evidence_level', 'string', `One of: ${Object.keys(EVIDENCE_LEVELS).join(', ')}`), get: h => h.evidence.level },
    { ...field('evidence_summary', 'string', 'Plain-language summary of the research'), get: h => h.evidence.summary },
    { ...field('adult_amount', 'string', 'Typical adult amount; never for children'), get: h => h.typicalUse.adultAmount },
    { ...field('caution_groups', 'string', 'Groups that should take care, semicolon-separated'), get: h => h.cautions.map(c => c.group) },
    { ...field('interaction_classes', 'string', 'Medicine classes it interacts with'), get: h => h.interactions.map(i => i.drugClass) },
    { ...field('review_status', 'string', 'draft until a qualified practitioner reviews it'), get: h => h.review.status },
  ]
  const cautionColumns = [
    { ...field('herb_id', 'string', 'Herb id'), get: r => r.herb },
    { ...field('group', 'string', `One of: ${Object.keys(CAUTION_GROUPS).join(', ')}`), get: r => r.group },
    { ...field('group_label', 'string', 'Readable group name'), get: r => CAUTION_GROUPS[r.group] },
    { ...field('note', 'string', 'What to watch for'), get: r => r.note },
  ]
  const interactionColumns = [
    { ...field('herb_id', 'string', 'Herb id'), get: r => r.herb },
    { ...field('drug_class', 'string', `One of: ${Object.keys(DRUG_CLASSES).join(', ')}`), get: r => r.drugClass },
    { ...field('drug_class_label', 'string', 'Readable medicine class'), get: r => DRUG_CLASSES[r.drugClass] },
    { ...field('level', 'string', 'caution or avoid'), get: r => r.level },
    { ...field('effect', 'string', 'What can happen'), get: r => r.effect },
  ]
  const conditionColumns = [
    { ...field('id', 'string', 'Stable id; the page is /conditions/<id>'), get: c => c.id },
    { ...field('title', 'string', 'Condition'), get: c => c.title },
    { ...field('category', 'string', 'Library category'), get: c => c.category },
    { ...field('severity', 'string', 'mild, moderate or serious (needs a doctor)'), get: c => c.severity },
    { ...field('duration', 'string', 'How long it usually lasts'), get: c => c.duration },
    { ...field('doshas', 'string', 'Doshas involved'), get: c => c.doshas },
    { ...field('icd11_code', 'string', 'Closest WHO ICD-11 code'), get: c => c.codes.icd11.code },
    { ...field('icd11_title', 'string', 'ICD-11 title'), get: c => c.codes.icd11.title },
    { ...field('tm2_group', 'string', 'ICD-11 Traditional Medicine Module 2 group, where unambiguous'), get: c => c.codes.tm2Group?.range },
    { ...field('see_doctor', 'string', 'Warning signs that need a doctor, semicolon-separated'), get: c => c.seeDoctor },
    { ...field('review_status', 'string', 'draft until a qualified practitioner reviews it'), get: c => c.review.status },
  ]
  const remedyColumns = [
    { ...field('condition_id', 'string', 'Condition id'), get: r => r.condition },
    { ...field('position', 'integer', 'Order within the condition'), get: r => r.n },
    { ...field('remedy', 'string', 'Home remedy or habit'), get: r => r.text },
  ]
  const nameColumns = [
    { ...field('herb_id', 'string', 'Herb id'), get: r => r.herb },
    { ...field('language', 'string', 'ISO 639-1 code'), get: r => r.lang },
    { ...field('name', 'string', 'Name in that language'), get: r => r.name },
    { ...field('wikidata', 'string', 'Wikidata item'), get: r => r.qid },
  ]
  const botanyColumns = [
    { ...field('herb_id', 'string', 'Herb id'), get: r => r.id },
    { ...field('accepted_name', 'string', 'Accepted name with author'), get: r => r.b.acceptedWithAuthor },
    { ...field('family', 'string', 'Plant family'), get: r => r.b.family },
    { ...field('gbif_key', 'integer', 'GBIF taxon key'), get: r => r.b.gbifKey },
    { ...field('synonyms', 'string', 'Older botanical names, semicolon-separated'), get: r => r.b.synonyms },
  ]

  const sourceColumns = [
    { ...field('id', 'string', 'Source id, used in claim-references.csv'), get: s => s.id },
    { ...field('kind', 'string', 'classical, pharmacopoeia, safety, paper, database or search'), get: s => s.kind },
    { ...field('title', 'string', 'Title'), get: s => s.title },
    { ...field('publisher', 'string', 'Publisher'), get: s => s.publisher },
    { ...field('url', 'string', 'Link'), get: s => s.url },
    { ...field('updated', 'string', 'Version or last-updated date the publisher states'), get: s => s.updated },
    { ...field('accessed', 'date', 'When we last checked our entries against it'), get: s => s.accessed },
    { ...field('pmid', 'string', 'PubMed id, for papers'), get: s => s.pmid },
    { ...field('doi', 'string', 'DOI, for papers'), get: s => s.doi },
    { ...field('year', 'integer', 'Year of publication'), get: s => s.year },
  ]
  const claimRefColumns = [
    { ...field('herb_id', 'string', 'Herb id'), get: r => r.herb },
    { ...field('claim', 'string', 'entry (the whole entry), properties, caution, interaction or evidence'), get: r => r.claim },
    { ...field('claim_key', 'string', 'Caution group, medicine class or evidence level the citation supports'), get: r => r.key },
    { ...field('source_id', 'string', 'Source id from references.csv'), get: r => r.ref.id },
    { ...field('locator', 'string', 'Page, section or verse within the source'), get: r => r.ref.locator },
  ]
  const claimRefRows = herbs.flatMap(h => herbCitations(h).map(c => ({ herb: h.id, ...c })))

  const cautionRows = herbs.flatMap(h => h.cautions.map(c => ({ herb: h.id, ...c })))
  const interactionRows = herbs.flatMap(h => h.interactions.map(i => ({ herb: h.id, ...i })))
  const remedyRows = conditions.flatMap(c => c.remedies.map((text, i) => ({ condition: c.id, n: i + 1, text })))
  const nameRows = Object.entries(enrichment.herbs).flatMap(([herb, e]) => Object.entries(e.wikidata?.labels || {}).map(([lang, name]) => ({ herb, lang, name, qid: e.wikidata.qid })))
  const botanyRows = Object.entries(enrichment.herbs).filter(([, e]) => e.botanical).map(([id, e]) => ({ id, b: e.botanical }))

  const ours = [DATASET_LICENSE]
  const wcvp = [{ name: 'CC-BY-4.0', title: 'Creative Commons Attribution 4.0 (WCVP, Royal Botanic Gardens, Kew)', path: 'https://creativecommons.org/licenses/by/4.0/' }]
  const cc0 = [{ name: 'CC0-1.0', title: 'Public domain', path: 'https://creativecommons.org/publicdomain/zero/1.0/' }]
  const schemaOf = (columns) => ({ fields: columns.map(({ name, type, description }) => ({ name, type, description })) })
  const resource = (name, path, title, columns, licenses, extra = {}) => ({ name, path, title, format: 'csv', mediatype: 'text/csv', encoding: 'utf-8', schema: schemaOf(columns), licenses, ...extra })

  const datapackage = {
    name: 'natural-healer-knowledge-base',
    title: 'Natural Healer knowledge base',
    description: 'Ayurvedic herbs, spices and kitchen remedies for everyday conditions, with cautions, medicine interactions, evidence ratings and ICD-11 codes. Every entry is a draft until a qualified Ayurvedic practitioner reviews it. Educational information, not medical advice.',
    homepage: `${siteUrl}/dataset`,
    version: generated,
    created: generated,
    licenses: ours,
    contributors: [{ title: 'Natural Healer', role: 'author', path: siteUrl }],
    sources: [
      { title: 'Natural Healer editorial entries', path: siteUrl },
      { title: 'World Checklist of Vascular Plants, Royal Botanic Gardens, Kew, via GBIF.org', path: 'https://www.gbif.org/dataset/f382f0ce-323a-4091-bb9f-add557f3a9a2' },
      { title: 'Wikidata', path: 'https://www.wikidata.org' },
      { title: "Dr. Duke's Phytochemical and Ethnobotanical Databases (USDA ARS)", path: 'https://doi.org/10.15482/USDA.ADC/1239279' },
      { title: 'WHO ICD-11, release 2026-01 (codes used as references)', path: 'https://icd.who.int' },
    ],
    resources: [
      { name: 'herbs-full', path: 'herbs.json', title: 'Herb entries, complete (JSON)', format: 'json', mediatype: 'application/json', schema: 'schema/herb.schema.json', licenses: ours },
      { name: 'conditions-full', path: 'conditions.json', title: 'Condition entries, complete (JSON)', format: 'json', mediatype: 'application/json', schema: 'schema/condition.schema.json', licenses: ours },
      resource('herbs', 'herbs.csv', 'Herbs, one row each', herbColumns, ours),
      resource('herb-cautions', 'herb-cautions.csv', 'Who should take care with each herb', cautionColumns, ours),
      resource('herb-interactions', 'herb-interactions.csv', 'Medicine interactions', interactionColumns, ours),
      resource('conditions', 'conditions.csv', 'Conditions, one row each', conditionColumns, ours),
      resource('remedies', 'remedies.csv', 'Home remedies for each condition', remedyColumns, ours),
      resource('botany', 'botany.csv', 'Accepted botanical names and synonyms (WCVP)', botanyColumns, wcvp),
      resource('regional-names', 'regional-names.csv', 'Names in Indian languages (Wikidata)', nameColumns, cc0),
      resource('references', 'references.csv', 'Every source cited', sourceColumns, ours),
      resource('claim-references', 'claim-references.csv', 'Which source supports which claim', claimRefColumns, ours),
      { name: 'plant-chemistry', path: 'plant-chemistry.json', title: "Recorded compounds per plant (Dr. Duke's databases)", format: 'json', mediatype: 'application/json', licenses: cc0 },
    ],
  }

  const readme = `# Natural Healer knowledge base

${datapackage.description}

Version ${generated}. ${herbs.length} herb entries, ${conditions.length} conditions, ${remedyRows.length} remedies, ${cautionRows.length} cautions and ${interactionRows.length} medicine interactions.

## Files

${datapackage.resources.map(r => `- \`${r.path}\`: ${r.title}`).join('\n')}
- \`datapackage.json\`: Frictionless Data Package descriptor with column definitions and licences
- \`schema/\`: JSON Schemas the entries are validated against

Lists inside CSV cells are separated by semicolons. \`claim-references.csv\` links each claim (a caution, an interaction, the evidence summary or the classical properties) to the sources in \`references.csv\` that support it. Claims with no row there have not yet been linked to a source.

## Licences

- Natural Healer's own entries (herbs, conditions, remedies, cautions, interactions): ${DATASET_LICENSE.title}. Credit "Natural Healer" with a link to ${siteUrl}.
- \`botany.csv\`: The World Checklist of Vascular Plants, Royal Botanic Gardens, Kew, via GBIF.org, CC BY 4.0.
- \`regional-names.csv\`: Wikidata, CC0.
- \`plant-chemistry.json\`: Dr. Duke's Phytochemical and Ethnobotanical Databases, USDA ARS, CC0.
- ICD-11 codes are WHO's (CC BY-ND 3.0 IGO) and are included as references only.

## Important

Every entry is a draft until a qualified Ayurvedic practitioner (BAMS or higher) reviews it; \`review_status\` says which. This is educational information, not medical advice, and must not be used to diagnose or treat anyone. Amounts are for adults only.
`

  const json = (v) => JSON.stringify(v, null, 2) + '\n'
  return {
    'datapackage.json': json(datapackage),
    'README.md': readme,
    'herbs.json': json(herbs),
    'conditions.json': json(conditions),
    'herbs.csv': csv(herbColumns, herbs),
    'herb-cautions.csv': csv(cautionColumns, cautionRows),
    'herb-interactions.csv': csv(interactionColumns, interactionRows),
    'conditions.csv': csv(conditionColumns, conditions),
    'remedies.csv': csv(remedyColumns, remedyRows),
    'botany.csv': csv(botanyColumns, botanyRows),
    'regional-names.csv': csv(nameColumns, nameRows),
    'references.csv': csv(sourceColumns, sources),
    'claim-references.csv': csv(claimRefColumns, claimRefRows),
    'plant-chemistry.json': json({ attribution: compounds.attribution, source: compounds.source, herbs: compounds.herbs }),
    'schema/herb.schema.json': readFileSync(join(root, 'data/schema/herb.schema.json'), 'utf8'),
    'schema/condition.schema.json': readFileSync(join(root, 'data/schema/condition.schema.json'), 'utf8'),
    'schema/source.schema.json': readFileSync(join(root, 'data/schema/source.schema.json'), 'utf8'),
  }
}

// Run directly to write the files locally
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = join(root, 'dataset-export')
  for (const [name, text] of Object.entries(datasetFiles())) {
    mkdirSync(join(out, name, '..'), { recursive: true })
    writeFileSync(join(out, name), text)
  }
  console.log(`Wrote the dataset to ${out}`)
}
