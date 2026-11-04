// Integrity of the knowledge base and quality of retrieval.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { herbs } from '../../src/data/knowledge/herbs.js'
import { CAUTION_GROUPS, DRUG_CLASSES, EVIDENCE_LEVELS, REVIEW_STATUSES, GLOSSARY } from '../../src/data/knowledge/vocabulary.js'
import { retrieve, search, herbsMentioned } from '../lib/knowledge/search.js'
import { buildCorpus } from '../lib/knowledge/corpus.js'
import { buildPrompt } from '../lib/prompt.js'

const DOSHAS = ['vata', 'pitta', 'kapha']

test('every herb entry is complete and uses the fixed vocabularies', () => {
  const ids = new Set()
  for (const h of herbs) {
    const where = `herb ${h.id}`
    assert.ok(!ids.has(h.id), `${where}: duplicate id`)
    ids.add(h.id)
    for (const field of ['name', 'hindi', 'english', 'part', 'kitchenUse']) assert.ok(h[field], `${where}: missing ${field}`)
    assert.ok(['herb', 'spice', 'food', 'formulation'].includes(h.kind), `${where}: bad kind`)
    assert.ok(h.actions.length && h.traditionalUses.length, `${where}: needs actions and uses`)
    assert.ok(h.typicalUse?.adultAmount, `${where}: needs a typical amount`)
    for (const c of h.cautions) assert.ok(CAUTION_GROUPS[c.group] && c.note, `${where}: bad caution ${c.group}`)
    for (const i of h.interactions) {
      assert.ok(DRUG_CLASSES[i.drugClass], `${where}: bad drug class ${i.drugClass}`)
      assert.ok(['caution', 'avoid'].includes(i.level) && i.effect, `${where}: bad interaction`)
    }
    assert.ok(EVIDENCE_LEVELS[h.evidence.level] && h.evidence.summary, `${where}: bad evidence`)
    assert.match(h.evidence.pubmedQuery, /^https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/\?term=/, `${where}: evidence link must be a PubMed search`)
    assert.ok(h.sources.length > 0, `${where}: needs at least one source`)
    assert.ok(REVIEW_STATUSES[h.review.status], `${where}: bad review status`)
    const p = h.properties
    for (const w of [...(p.rasa || []), ...(p.guna || []), p.virya, p.vipaka].filter(Boolean)) assert.ok(GLOSSARY[w], `${where}: unknown classical term ${w}`)
    for (const d of [...p.pacifies, ...p.aggravates]) assert.ok(DOSHAS.includes(d), `${where}: unknown dosha ${d}`)
  }
})

test('nothing is marked reviewed without a named reviewer', () => {
  for (const h of herbs) {
    if (h.review.status === 'reviewed') assert.ok(h.review.reviewer && h.review.reviewedAt, `${h.id}: reviewed entries need reviewer and date`)
  }
})

test('the corpus has an overview and a safety passage per herb, plus the conditions', () => {
  const corpus = buildCorpus()
  for (const h of herbs) {
    assert.ok(corpus.find(c => c.id === `herb:${h.id}:overview`))
    assert.ok(corpus.find(c => c.id === `herb:${h.id}:safety`))
  }
  assert.ok(corpus.some(c => c.kind === 'condition'))
})

// Questions people actually ask, and the entries that must come back for them
const EXPECT = [
  // An array inside the list means any one of those passages is a correct answer
  ['I feel bloated after lunch', [['herb:jeera:overview', 'herb:ajwain:overview', 'herb:saunf:overview', 'herb:hing:overview', 'herb:pudina:overview'], 'condition:indigestion']],
  ['I cannot sleep and feel stressed', ['herb:ashwagandha:overview', 'herb:brahmi:overview']],
  ['Can I take haldi with warfarin?', ['herb:haldi:safety']],
  ['sore throat and dry cough', ['herb:mulethi:overview', 'herb:shahad:overview']],
  ['is mulethi safe with blood pressure medicine', ['herb:mulethi:safety']],
  ['memory for exams', ['herb:brahmi:overview']],
  ['toothache', ['herb:laung:overview']],
  ['can I give honey to my 6 month old baby', ['herb:shahad:safety']],
  ['pimples on face', ['condition:acne', 'herb:neem:overview']],
  ['ashwagandha with thyroxine', ['herb:ashwagandha:safety']],
  ['isabgol for constipation', ['herb:isabgol:overview']],
  ['is green tea extract bad for the liver', ['herb:hari-chai:safety']],
  ['senna with digoxin', ['herb:sonamukhi:safety']],
  ['how much nutmeg is too much', ['herb:jaiphal:safety']],
  ['burning in my chest after dinner, acidity', ['condition:acidity']],
  ['my hair is falling out', ['condition:hair-fall']],
  ['loose motions since morning', ['condition:diarrhoea']],
  ['dry cough at night', ['condition:cough']],
  ['shankhpushpi with seizure medicine', ['herb:shankhpushpi:safety']],
]

for (const [q, ids] of EXPECT) {
  test(`retrieval: "${q}"`, () => {
    const got = retrieve(q).map(c => c.id)
    for (const id of ids) {
      const options = [id].flat()
      assert.ok(options.some(o => got.includes(o)), `expected ${options.join(' or ')} in ${got.join(', ')}`)
    }
  })
}

test('unrelated questions retrieve nothing', () => {
  assert.equal(search('what is the capital of france').length, 0)
})

test('herb names in any language are recognised', () => {
  assert.deepEqual(herbsMentioned('can I take turmeric').sort(), ['haldi'])
  assert.ok(herbsMentioned('Yashtimadhu for throat').includes('mulethi'))
  assert.ok(herbsMentioned('हल्दी वाला दूध').includes('haldi'))
})

test('a condition-scoped chat always includes that condition', () => {
  assert.equal(retrieve('what should I eat?', { conditionId: 'insomnia' })[0].id, 'condition:insomnia')
})

test('the prompt numbers excerpts and tells the model how to cite', () => {
  const passages = retrieve('jeera for bloating')
  const { systemInstruction } = buildPrompt({ message: 'jeera for bloating', passages })
  assert.match(systemInstruction, /\[1\] /)
  assert.match(systemInstruction, /Cite the excerpt/)
  const empty = buildPrompt({ message: 'hello', passages: [] })
  assert.match(empty.systemInstruction, /none matched/)
})

test('only cited excerpts become sources, keeping their numbers', async () => {
  const { citedSources } = await import('../lib/knowledge/cite.js')
  const passages = retrieve('jeera for bloating')
  const sources = citedSources('Jeera water helps [1]. Avoid in pregnancy [3]. Not a real one [42].', passages)
  assert.deepEqual(sources.map(s => s.n), [1, 3])
  assert.equal(sources[0].url, passages[0].url)
  assert.equal(citedSources('No citations here.', passages).length, 0)
})

test('every plant uses its Kew-accepted botanical name', async () => {
  const { default: enrichment } = await import('../../src/data/knowledge/enrichment.js')
  for (const h of herbs.filter(x => x.latin && x.kind !== 'formulation')) {
    const e = enrichment.herbs[h.id]
    assert.ok(e?.botanical, `${h.id}: missing from enrichment; run npm run kb:enrich`)
    const ours = h.latin.split(',')[0].trim().split(/\s+/).slice(0, 2).join(' ')
    assert.equal(e.botanical.matchedStatus, 'ACCEPTED', `${h.id}: "${ours}" is a ${e.botanical.matchedStatus} in WCVP; accepted name is ${e.botanical.acceptedName}`)
    assert.equal(e.botanical.acceptedName, ours, `${h.id}: name differs from WCVP`)
  }
})

test('regional-language names and old botanical names find the right herb', () => {
  assert.ok(herbsMentioned('மஞ்சள் பால் குடிக்கலாமா').includes('haldi'), 'Tamil name for turmeric')
  assert.ok(retrieve('Ocimum sanctum for cough').some(c => c.entityId === 'tulsi'), 'old synonym of tulsi')
})

test('no herb repeats a caution group, and linked sources use https', () => {
  for (const h of herbs) {
    const groups = h.cautions.map(c => c.group)
    assert.equal(new Set(groups).size, groups.length, `${h.id}: repeated caution group`)
    const classes = h.interactions.map(i => i.drugClass)
    assert.equal(new Set(classes).size, classes.length, `${h.id}: repeated interaction`)
    for (const s of h.sources) if (s.url) assert.match(s.url, /^https:\/\//, `${h.id}: source link must be https`)
  }
})

test('safety questions surface the cross-checked warnings', () => {
  const text = (q) => retrieve(q).map(c => c.text).join(' ')
  assert.match(text('is fenugreek safe in pregnancy'), /birth defects/)
  assert.match(text('ashwagandha while breastfeeding'), /breastfeeding/i)
  assert.match(text('aloe vera juice liver'), /hepatitis/)
})

test('every library condition has a well-formed ICD-11 code', async () => {
  const { conditionCodes } = await import('../../src/data/knowledge/conditionCodes.js')
  const { diseases } = await import('../../src/data/diseases.js')
  for (const d of diseases) {
    const c = conditionCodes[d.id]
    assert.ok(c, `${d.id}: missing ICD-11 mapping`)
    assert.match(c.icd11.code, /^[0-9A-Z]{4}(\.[0-9A-Z]{1,2})?$/, `${d.id}: malformed ICD-11 code`)
    if (c.tm2Group) assert.match(c.tm2Group.range, /^S[K-R]\d\d–S[K-R][0-9A-Z]Z$/, `${d.id}: TM2 range outside SK00–SR0Z`)
  }
})
