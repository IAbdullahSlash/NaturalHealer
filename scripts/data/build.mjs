// Validates the dataset in data/ and writes the modules the site and server import.
//
//   npm run data:build    validate, then regenerate src/data/generated/*.js
//   npm run data:check    validate and fail if the generated modules are out of date (CI)
//
// data/herbs/<id>.json, data/conditions/<id>.json and data/sources/<id>.json are the source of
// truth. Each file is checked against its JSON Schema in data/schema/, then across files: ids
// match file names, every citation points at a source in the registry, the schema's
// vocabularies match src/data/knowledge/vocabulary.js, and no caution group or medicine class
// is repeated within a herb. Citations are resolved into full source details in the output.
// How well claims are referenced is reported separately by npm run data:refs.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { CAUTION_GROUPS, DRUG_CLASSES, EVIDENCE_LEVELS } from '../../src/data/knowledge/vocabulary.js'
import { resolveRef, herbCitations } from './references.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dir = (p) => join(root, p)
const check = process.argv.includes('--check')

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new Error(`${path}: not valid JSON (${err.message})`)
  }
}

const herbSchema = readJson(dir('data/schema/herb.schema.json'))
const conditionSchema = readJson(dir('data/schema/condition.schema.json'))
const sourceSchema = readJson(dir('data/schema/source.schema.json'))
const ajv = new Ajv2020({ allErrors: true, strict: false })
ajv.addSchema(herbSchema, 'herb.schema.json')
const validateHerb = ajv.getSchema('herb.schema.json')
const validateCondition = ajv.compile(conditionSchema)
const validateSource = ajv.compile(sourceSchema)

const problems = []
const problem = (file, message) => problems.push(`${file}: ${message}`)

// The schema's lists must stay in step with the vocabularies the site and safety layer use
const sameKeys = (name, schemaList, vocab) => {
  const a = [...schemaList].sort().join(',')
  const b = Object.keys(vocab).sort().join(',')
  if (a !== b) problem('data/schema/herb.schema.json', `${name} differs from vocabulary.js (schema: ${a}; vocabulary: ${b})`)
}
sameKeys('cautionGroup', herbSchema.$defs.cautionGroup.enum, CAUTION_GROUPS)
sameKeys('drugClass', herbSchema.$defs.drugClass.enum, DRUG_CLASSES)
sameKeys('evidenceLevel', herbSchema.$defs.evidenceLevel.enum, EVIDENCE_LEVELS)

function load(folder, validate) {
  const entries = []
  for (const name of readdirSync(dir(folder)).filter(f => f.endsWith('.json')).sort()) {
    const file = `${folder}/${name}`
    let entry
    try {
      entry = readJson(dir(file))
    } catch (err) {
      problem(file, err.message)
      continue
    }
    if (!validate(entry)) {
      for (const e of validate.errors) problem(file, `${e.instancePath || '(root)'} ${e.message}${e.params?.allowedValues ? ` (${e.params.allowedValues.join(', ')})` : ''}`)
      continue
    }
    if (`${entry.id}.json` !== name) problem(file, `id "${entry.id}" does not match the file name`)
    const { $schema, ...rest } = entry
    entries.push(rest)
  }
  return entries
}

const sources = load('data/sources', validateSource)
const herbs = load('data/herbs', validateHerb)
const conditions = load('data/conditions', validateCondition)
const sourcesById = new Map(sources.map(s => [s.id, s]))

// Every citation must point at a registered source
for (const h of herbs) {
  for (const { claim, key, ref } of herbCitations(h)) {
    if (!sourcesById.has(ref.source)) problem(`data/herbs/${h.id}.json`, `${claim}${key ? ` "${key}"` : ''} cites unknown source "${ref.source}"; add data/sources/${ref.source}.json`)
  }
}
for (const c of conditions) {
  for (const ref of c.sources) if (!sourcesById.has(ref.source)) problem(`data/conditions/${c.id}.json`, `cites unknown source "${ref.source}"`)
}

for (const h of herbs) {
  const groups = h.cautions.map(c => c.group)
  if (new Set(groups).size !== groups.length) problem(`data/herbs/${h.id}.json`, 'repeats a caution group; merge the notes')
  const classes = h.interactions.map(i => i.drugClass)
  if (new Set(classes).size !== classes.length) problem(`data/herbs/${h.id}.json`, 'repeats a medicine class; merge the notes')
  if (h.kind !== 'food' && h.kind !== 'formulation' && !h.latin) problem(`data/herbs/${h.id}.json`, 'plants need a botanical name')
}

if (problems.length) {
  console.error(`Dataset has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n${problems.map(p => `  - ${p}`).join('\n')}`)
  process.exit(1)
}

// Herbs read best alphabetically; conditions are grouped by category in the library's order
const CATEGORY_ORDER = ['respiratory', 'digestive', 'mental', 'skin', 'musculoskeletal', 'chronic']
herbs.sort((a, b) => a.name.localeCompare(b.name))
sources.sort((a, b) => a.id.localeCompare(b.id))
conditions.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.title.localeCompare(b.title))

// Replace citations with the source details the site, Vanya and the dataset show
const resolve = (refs) => refs.map(r => resolveRef(r, sourcesById))
const resolvedHerbs = herbs.map(h => ({
  ...h,
  properties: { ...h.properties, refs: resolve(h.properties.refs) },
  cautions: h.cautions.map(c => ({ ...c, refs: resolve(c.refs) })),
  interactions: h.interactions.map(i => ({ ...i, refs: resolve(i.refs) })),
  evidence: { ...h.evidence, refs: resolve(h.evidence.refs) },
  sources: resolve(h.sources),
}))
const resolvedConditions = conditions.map(c => ({ ...c, sources: resolve(c.sources) }))

const header = (what) => `// Generated by scripts/data/build.mjs from data/${what}/*.json. Do not edit by hand;\n// change the JSON files and run npm run data:build.\n`
const outputs = {
  'src/data/generated/herbs.js': `${header('herbs')}export const herbs = ${JSON.stringify(resolvedHerbs, null, 2)}\n`,
  'src/data/generated/conditions.js': `${header('conditions')}export const conditions = ${JSON.stringify(resolvedConditions, null, 2)}\n`,
  'src/data/generated/sources.js': `${header('sources')}export const sources = ${JSON.stringify(sources, null, 2)}\n`,
}

if (check) {
  const stale = Object.entries(outputs).filter(([path, text]) => !existsSync(dir(path)) || readFileSync(dir(path), 'utf8').replace(/\r\n/g, '\n') !== text)
  if (stale.length) {
    console.error(`Generated data is out of date: ${stale.map(([p]) => p).join(', ')}. Run npm run data:build and commit the result.`)
    process.exit(1)
  }
  console.log(`Dataset valid: ${herbs.length} herbs, ${conditions.length} conditions, ${sources.length} sources; generated modules are up to date.`)
} else {
  mkdirSync(dir('src/data/generated'), { recursive: true })
  for (const [path, text] of Object.entries(outputs)) writeFileSync(dir(path), text)
  console.log(`Dataset valid: ${herbs.length} herbs, ${conditions.length} conditions, ${sources.length} sources. Wrote ${Object.keys(outputs).join(', ')}.`)
}
