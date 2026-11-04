// How well the dataset's claims are referenced.
//
//   npm run data:refs                     summary, then every gap by entry
//   npm run data:refs -- --check          fail if any gap count rose above the baseline (CI)
//   npm run data:refs -- --update-baseline  record the current counts after filling gaps
//   npm run data:refs -- --markdown <file>  also append the report to a Markdown file
//
// The baseline (data/references-baseline.json) can only go down: new claims must come with
// sources, and filling gaps lowers it.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { herbs } from '../../src/data/generated/herbs.js'
import { conditions } from '../../src/data/generated/conditions.js'
import { sources } from '../../src/data/generated/sources.js'
import { coverage } from './references.mjs'

const BASELINE = fileURLToPath(new URL('../../data/references-baseline.json', import.meta.url))
const args = process.argv.slice(2)
const { metrics, claims, issues } = coverage(herbs, conditions, new Map(sources.map(s => [s.id, s])))

const LABELS = {
  safetyClaimsWithoutSource: `Safety claims (cautions and interactions) without a safety or paper source, of ${claims.safety}`,
  evidenceWithoutSource: `Evidence summaries without a safety or paper source, of ${claims.evidence}`,
  propertiesWithoutClassicalSource: `Classical properties without a classical or pharmacopoeia source, of ${claims.properties}`,
  classicalCitationsWithoutLocator: 'Classical or pharmacopoeia citations without a volume, page or verse',
  conditionsWithoutSource: `Conditions without sources for their guidance, of ${conditions.length}`,
}

const byEntity = Map.groupBy(issues, i => i.entity)
const lines = [
  '# Reference coverage',
  '',
  ...Object.entries(metrics).map(([k, v]) => `- ${LABELS[k]}: **${v}**`),
  '',
  `${byEntity.size} entries have gaps. Sources in the registry: ${sources.length}.`,
  '',
  ...[...byEntity].flatMap(([entity, list]) => [`## ${entity}`, ...list.map(i => `- ${i.what}`), '']),
]
const report = lines.join('\n')

const mdAt = args.indexOf('--markdown')
if (mdAt >= 0) writeFileSync(args[mdAt + 1], report + '\n')

if (args.includes('--update-baseline')) {
  writeFileSync(BASELINE, JSON.stringify(metrics, null, 2) + '\n')
  console.log(`Baseline updated: ${JSON.stringify(metrics)}`)
} else if (args.includes('--check')) {
  if (!existsSync(BASELINE)) {
    console.error('No baseline yet. Run npm run data:refs -- --update-baseline.')
    process.exit(1)
  }
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
  const worse = Object.keys(metrics).filter(k => metrics[k] > (baseline[k] ?? 0))
  const better = Object.keys(metrics).filter(k => metrics[k] < (baseline[k] ?? 0))
  for (const k of Object.keys(metrics)) console.log(`${metrics[k] > (baseline[k] ?? 0) ? 'WORSE' : metrics[k] < (baseline[k] ?? 0) ? 'better' : 'same  '}  ${LABELS[k]}: ${metrics[k]} (baseline ${baseline[k] ?? 0})`)
  if (worse.length) {
    console.error('\nNew claims need sources. Add refs, or see npm run data:refs for the gaps.')
    process.exit(1)
  }
  if (better.length) console.log('\nCoverage improved. Run npm run data:refs -- --update-baseline to lock it in.')
} else {
  console.log(report)
}
