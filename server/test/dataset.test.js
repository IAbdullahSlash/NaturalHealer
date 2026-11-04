// The dataset workflow: schema validation catches bad entries, and the public export is
// complete and consistent with the data the site uses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Ajv2020 from 'ajv/dist/2020.js'
import { herbs } from '../../src/data/knowledge/herbs.js'
import { diseases } from '../../src/data/diseases.js'
import { datasetFiles } from '../../scripts/data/export.mjs'

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
  badGroup.cautions.push({ group: 'pregnant-women', note: 'A group that is not in the vocabulary.' })
  assert.equal(validateHerb(badGroup), false)

  const fakeReview = { ...structuredClone(good), review: { status: 'reviewed', reviewer: null, reviewedAt: null } }
  assert.equal(validateHerb(fakeReview), false, 'reviewed entries need a named reviewer')

  const httpLink = structuredClone(good)
  httpLink.sources.push({ kind: 'safety', title: 'Insecure link', url: 'http://example.com' })
  assert.equal(validateHerb(httpLink), false)
})

test('every condition tells people when to see a doctor', () => {
  for (const d of diseases) {
    assert.ok(d.seeDoctor?.length >= 2, `${d.id}: needs warning signs`)
    const { desc, ...file } = d
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
