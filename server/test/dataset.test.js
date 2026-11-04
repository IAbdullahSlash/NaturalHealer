// The dataset workflow: schema validation catches bad entries, and the public export is
// complete and consistent with the data the site uses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { herbs } from '../../src/data/knowledge/herbs.js'
import { diseases } from '../../src/data/diseases.js'
import { datasetFiles } from '../../scripts/data/export.mjs'
import { coverage, herbCitations } from '../../scripts/data/references.mjs'
import { nccihUpdated, titlesMatch, checkSource } from '../../scripts/data/check-sources.mjs'

const schema = (name) => JSON.parse(readFileSync(new URL(`../../data/schema/${name}`, import.meta.url), 'utf8'))
const ajv = new Ajv2020({ allErrors: true, strict: false })
ajv.addSchema(schema('herb.schema.json'), 'herb.schema.json')
const validateHerb = ajv.getSchema('herb.schema.json')
const validateCondition = ajv.compile(schema('condition.schema.json'))
const herbFile = (id) => JSON.parse(readFileSync(new URL(`../../data/herbs/${id}.json`, import.meta.url), 'utf8'))

test('the schema accepts real entries and rejects broken ones', () => {
  const good = herbFile('haldi')
  assert.ok(validateHerb(good), JSON.stringify(validateHerb.errors))

  const badGroup = structuredClone(good)
  badGroup.cautions.push({ group: 'pregnant-women', note: 'A group that is not in the vocabulary.', refs: [] })
  assert.equal(validateHerb(badGroup), false)

  const fakeReview = { ...structuredClone(good), review: { status: 'reviewed', reviewer: null, reviewedAt: null } }
  assert.equal(validateHerb(fakeReview), false, 'reviewed entries need a named reviewer')

  const inlineSource = structuredClone(good)
  inlineSource.sources.push({ kind: 'safety', title: 'Sources are cited by id, not written inline' })
  assert.equal(validateHerb(inlineSource), false)

  const noRefs = structuredClone(good)
  delete noRefs.cautions[0].refs
  assert.equal(validateHerb(noRefs), false, 'every caution carries a refs list, even if empty')
})

test('the source registry rejects insecure links and papers without an identifier', () => {
  const validateSource = ajv.compile(schema('source.schema.json'))
  const base = { id: 'example', kind: 'safety', title: 'Example sheet', publisher: null, url: 'https://example.org', updated: null, accessed: null, pmid: null, doi: null, year: null, licence: null, notes: null }
  assert.ok(validateSource(base), JSON.stringify(validateSource.errors))
  assert.equal(validateSource({ ...base, url: 'http://example.org' }), false)
  assert.equal(validateSource({ ...base, kind: 'paper', url: null }), false, 'a paper needs a PMID or DOI')
  assert.ok(validateSource({ ...base, kind: 'paper', url: null, pmid: '12345678', year: 2020 }))
  assert.equal(validateSource({ ...base, pmid: 'PMC123' }), false)
})

test('only safety sources and papers count as support for a safety claim', () => {
  const sourcesById = new Map([
    ['sheet', { id: 'sheet', kind: 'safety' }],
    ['search', { id: 'search', kind: 'search' }],
    ['text', { id: 'text', kind: 'classical' }],
  ])
  const herb = (refs) => ({ id: 'x', sources: [{ source: 'text', locator: 'Ch. 1' }], properties: { rasa: ['katu'], refs: [] }, cautions: [{ group: 'pregnancy', note: 'Avoid in pregnancy.', refs }], interactions: [], evidence: { level: 'traditional', refs: [] } })
  assert.equal(coverage([herb([{ source: 'sheet' }])], [], sourcesById).metrics.safetyClaimsWithoutSource, 0)
  assert.equal(coverage([herb([{ source: 'search' }])], [], sourcesById).metrics.safetyClaimsWithoutSource, 1)
  assert.equal(coverage([herb([{ source: 'text' }])], [], sourcesById).metrics.safetyClaimsWithoutSource, 1)
  const noLocator = herb([])
  noLocator.sources = [{ source: 'text' }]
  assert.equal(coverage([noLocator], [], sourcesById).metrics.classicalCitationsWithoutLocator, 1)
})

test('the source checker reads NIH dates and catches papers that do not match', async () => {
  assert.equal(nccihUpdated('<p>Last Updated: </p></div><p>February 2025</p>'), 'February 2025')
  assert.ok(titlesMatch('Psyllium for constipation: a trial', 'Psyllium for Constipation: A Trial.'))
  assert.equal(titlesMatch('Psyllium for constipation', 'Senna in children'), false)

  const realFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ result: { 12345678: { title: 'Senna in children', pubdate: '2019 Aug' } } }))
  try {
    const [r] = await checkSource({ id: 'p', kind: 'paper', title: 'Psyllium for constipation', url: null, pmid: '12345678', doi: null, year: 2019 })
    assert.equal(r.status, 'mismatch')
    const [ok] = await checkSource({ id: 'p', kind: 'paper', title: 'Senna in children', url: null, pmid: '12345678', doi: null, year: 2019 })
    assert.equal(ok.status, 'ok')
  } finally {
    globalThis.fetch = realFetch
  }
})

test('every condition tells people when to see a doctor', () => {
  for (const d of diseases) {
    assert.ok(d.seeDoctor?.length >= 2, `${d.id}: needs warning signs`)
    const file = JSON.parse(readFileSync(new URL(`../../data/conditions/${d.id}.json`, import.meta.url), 'utf8'))
    assert.ok(validateCondition(file), `${d.id}: ${JSON.stringify(validateCondition.errors)}`)
  }
})

test('the public dataset lists every file it ships, with matching row counts', () => {
  const files = datasetFiles()
  const pkg = JSON.parse(files['datapackage.json'])
  for (const r of pkg.resources) assert.ok(files[r.path], `missing ${r.path}`)
  const rows = (name) => files[name].trim().split('\n').length - 1
  assert.equal(rows('herbs.csv'), herbs.length)
  assert.equal(rows('conditions.csv'), diseases.length)
  assert.equal(rows('remedies.csv'), diseases.reduce((n, d) => n + d.remedies.length, 0))
  assert.equal(rows('herb-cautions.csv'), herbs.reduce((n, h) => n + h.cautions.length, 0))
  assert.equal(JSON.parse(files['herbs.json']).length, herbs.length)
  assert.equal(rows('claim-references.csv'), herbs.reduce((n, h) => n + herbCitations(h).length, 0))
  // CSV headers match the column definitions in the descriptor
  for (const r of pkg.resources.filter(x => x.format === 'csv')) {
    assert.equal(files[r.path].split('\n')[0], r.schema.fields.map(f => f.name).join(','), r.path)
  }
})

test('the dataset says entries are drafts and credits every source', () => {
  const files = datasetFiles()
  assert.match(files['README.md'], /draft until a qualified Ayurvedic practitioner/)
  const pkg = JSON.parse(files['datapackage.json'])
  for (const source of ['Kew', 'Wikidata', 'Duke', 'ICD-11']) assert.ok(pkg.sources.some(s => s.title.includes(source)), source)
})
