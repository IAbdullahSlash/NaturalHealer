// Turns the knowledge base into small, citable passages ("chunks") for retrieval.
// Each herb gives an overview chunk and a safety chunk; each condition gives one chunk.

import { herbs } from '../../../src/data/knowledge/herbs.js'
import enrichment from '../../../src/data/knowledge/enrichment.js'
import { CAUTION_GROUPS, DRUG_CLASSES, EVIDENCE_LEVELS, term } from '../../../src/data/knowledge/vocabulary.js'
import { diseases, aiKnowledge } from '../../../src/data/diseases.js'
import { ingredientsFor } from '../../../src/data/kitchen.js'

const list = (items) => items.filter(Boolean).join('; ')

function herbNames(h) {
  return [h.name, h.hindi, h.sanskrit, h.english, h.latin].filter(Boolean).join(', ')
}

function herbOverview(h) {
  const p = h.properties || {}
  const props = [
    p.rasa?.length ? `Rasa: ${p.rasa.map(term).join(', ')}` : '',
    p.guna?.length ? `Guna: ${p.guna.map(term).join(', ')}` : '',
    p.virya ? `Virya: ${term(p.virya)}` : '',
    p.vipaka ? `Vipaka: ${term(p.vipaka)}` : '',
    p.pacifies?.length ? `Pacifies ${p.pacifies.join(' and ')}` : '',
    p.aggravates?.length ? `can aggravate ${p.aggravates.join(' and ')}` : '',
  ].filter(Boolean).join('. ')

  return [
    `${h.name} (${herbNames(h)}). Part used: ${h.part}.`,
    props ? `Classical properties: ${props}.` : '',
    `Actions: ${list(h.actions)}.`,
    `Traditional uses: ${list(h.traditionalUses)}.`,
    `At home: ${h.kitchenUse}`,
    `Typical adult amount: ${h.typicalUse.adultAmount}.${h.typicalUse.note ? ` ${h.typicalUse.note}` : ''}`,
  ].filter(Boolean).join('\n')
}

function herbSafety(h) {
  const ev = EVIDENCE_LEVELS[h.evidence.level]
  return [
    `Safety for ${h.name} (${h.english || h.sanskrit}).`,
    h.cautions.length ? `Cautions: ${h.cautions.map(c => `${CAUTION_GROUPS[c.group]}: ${c.note}`).join(' ')}` : 'No specific cautions recorded beyond normal food use.',
    h.interactions.length ? `Medicine interactions: ${h.interactions.map(i => `${DRUG_CLASSES[i.drugClass]} (${i.level}): ${i.effect}`).join(' ')}` : 'No medicine interactions recorded.',
    `Evidence: ${ev.label}. ${h.evidence.summary}`,
  ].join('\n')
}

function conditionText(d) {
  const k = aiKnowledge[d.id] || {}
  const shelf = ingredientsFor(d).map(i => `${i.name}${i.english ? ` (${i.english})` : ''}`)
  return [
    `${d.title}: ${d.desc}. Severity: ${d.severity}${d.severity === 'serious' ? ' (needs a doctor)' : ''}. Usually lasts ${d.duration}. Doshas: ${d.doshas.join(', ')}.`,
    k.overview ? `Ayurvedic view: ${k.overview}` : '',
    `Home remedies: ${list(d.remedies)}.`,
    `Prevention: ${list(d.prevention)}.`,
    d.seeDoctor?.length ? `See a doctor if: ${list(d.seeDoctor)}.` : '',
    shelf.length ? `Kitchen ingredients used: ${shelf.join(', ')}.` : '',
  ].filter(Boolean).join('\n')
}

// Names from the openly licensed enrichment: regional-language names (Wikidata, CC0)
// and botanical synonyms (Kew WCVP, CC BY 4.0), so people can ask in their own words
export function extraNames(id) {
  const e = enrichment.herbs[id]
  if (!e) return []
  return [...Object.values(e.wikidata?.labels || {}), ...(e.botanical?.synonyms || [])]
}

// Words a chunk should also be found by: every name of the herb, its uses, its cautions
function herbKeywords(h) {
  return [herbNames(h), ...extraNames(h.id), h.kind, h.part, ...(h.traditionalUses || []), ...(h.actions || [])].join(' ')
}

export function buildCorpus() {
  const chunks = []
  for (const h of herbs) {
    const shared = { kind: 'herb', entityId: h.id, url: `/herbs/${h.id}`, review: h.review.status, sources: h.sources }
    chunks.push({ ...shared, id: `herb:${h.id}:overview`, section: 'overview', title: `${h.name} (${h.english || h.sanskrit})`, text: herbOverview(h), keywords: herbKeywords(h) })
    chunks.push({
      ...shared,
      id: `herb:${h.id}:safety`,
      section: 'safety',
      title: `${h.name}: safety and interactions`,
      text: herbSafety(h),
      keywords: `${herbNames(h)} ${extraNames(h.id).join(' ')} safety side effects caution interaction ${h.cautions.map(c => `${c.group} ${CAUTION_GROUPS[c.group]}`).join(' ')} ${h.interactions.map(i => `${i.drugClass} ${DRUG_CLASSES[i.drugClass]}`).join(' ')}`,
    })
  }
  for (const d of diseases) {
    chunks.push({
      id: `condition:${d.id}`,
      kind: 'condition',
      entityId: d.id,
      section: 'condition',
      title: d.title,
      url: `/conditions/${d.id}`,
      review: 'draft',
      sources: [{ kind: 'library', title: 'Natural Healer remedy library' }],
      text: conditionText(d),
      keywords: `${d.title} ${d.category} ${d.desc} ${d.doshas.join(' ')}`,
    })
  }
  return chunks
}
