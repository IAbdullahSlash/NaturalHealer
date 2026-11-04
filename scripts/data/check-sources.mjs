// Checks every source in the registry against the live web. Runs weekly in CI
// (.github/workflows/references.yml) rather than on every push, so a slow website
// can't block a deploy.
//
//   npm run data:sources
//
// - Links: each URL must load. NCBI Bookshelf (LiverTox) shows scripts a CAPTCHA, so those
//   are listed for checking by hand instead of being marked broken.
// - NIH fact sheets: the page's "Last Updated" date must match the registry. A newer date
//   means the sheet changed, so the entries citing it should be re-checked.
// - Papers: each PMID (PubMed) or DOI (Crossref) must exist, and its title and year must
//   match the registry, which catches mistyped or invented citations.

import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const UA = { 'User-Agent': 'NaturalHealer-reference-check/1.0 (+https://natural-healer.vercel.app/dataset)' }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// "Last Updated: </p><p>February 2025" on NCCIH pages
export function nccihUpdated(html) {
  return html.match(/Last Updated:\s*(?:<[^>]+>\s*)*([A-Z][a-z]+ \d{4})/)?.[1] || null
}

const normal = (t) => String(t || '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
// Titles match when one starts with the other, so a registry may shorten a long title
export function titlesMatch(ours, theirs) {
  const a = normal(ours)
  const b = normal(theirs)
  return Boolean(a && b) && (a.startsWith(b) || b.startsWith(a))
}

async function get(url, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    return await fetch(url, { ...init, headers: { ...UA, ...(init.headers || {}) }, redirect: 'follow', signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function checkSource(s) {
  const results = []
  const add = (status, message) => results.push({ id: s.id, status, message })

  if (s.url) {
    try {
      const res = await get(s.url)
      const body = await res.text()
      if (res.status >= 400) add('broken', `${s.url} returned ${res.status}`)
      // Judge by the page title: ordinary pages can mention reCAPTCHA in a signup form
      else if (/<title>[^<]*(recaptcha|checking your browser)/i.test(body)) add('manual', `${s.url} asks for a CAPTCHA; check by hand`)
      else if (s.url.includes('nccih.nih.gov/health/')) {
        const live = nccihUpdated(body)
        if (!live) add('manual', `could not read the "Last Updated" date on ${s.url}`)
        else if (live !== s.updated) add('changed', `NIH updated this fact sheet: ${s.updated || 'no date recorded'} → ${live}. Re-check the entries citing it, then update "updated" and "accessed".`)
        else add('ok', `loads; last updated ${live}`)
      } else add('ok', 'loads')
    } catch (err) {
      add('broken', `${s.url} failed to load (${err.name === 'AbortError' ? 'timed out' : err.message})`)
    }
  }

  if (s.pmid) {
    try {
      const res = await get(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${s.pmid}&retmode=json`)
      const rec = (await res.json()).result?.[s.pmid]
      if (!rec || rec.error) add('mismatch', `PMID ${s.pmid} was not found in PubMed`)
      else {
        const year = Number(String(rec.pubdate).slice(0, 4))
        if (!titlesMatch(s.title, rec.title)) add('mismatch', `PMID ${s.pmid} is "${rec.title}", not "${s.title}"`)
        else if (s.year && year && s.year !== year) add('mismatch', `PMID ${s.pmid} is from ${year}, not ${s.year}`)
        else add('ok', `PMID ${s.pmid} matches`)
      }
    } catch (err) {
      add('broken', `PubMed lookup for ${s.pmid} failed (${err.message})`)
    }
  }

  if (s.doi) {
    try {
      const res = await get(`https://api.crossref.org/works/${encodeURIComponent(s.doi)}`)
      if (res.status === 404) add('mismatch', `DOI ${s.doi} does not exist`)
      else {
        const work = (await res.json()).message
        const year = work?.issued?.['date-parts']?.[0]?.[0]
        if (!titlesMatch(s.title, work?.title?.[0])) add('mismatch', `DOI ${s.doi} is "${work?.title?.[0]}", not "${s.title}"`)
        else if (s.year && year && s.year !== year) add('mismatch', `DOI ${s.doi} is from ${year}, not ${s.year}`)
        else add('ok', `DOI ${s.doi} matches`)
      }
    } catch (err) {
      add('broken', `Crossref lookup for ${s.doi} failed (${err.message})`)
    }
  }
  return results
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { sources } = await import('../../src/data/generated/sources.js')
  const results = []
  for (const s of sources) {
    results.push(...await checkSource(s))
    await sleep(400) // stay well under NCBI's three requests a second
  }
  const order = ['broken', 'mismatch', 'changed', 'manual', 'ok']
  results.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.id.localeCompare(b.id))
  for (const r of results) console.log(`${r.status.padEnd(8)} ${r.id.padEnd(36)} ${r.message}`)
  const count = (st) => results.filter(r => r.status === st).length
  const summary = order.map(st => `${count(st)} ${st}`).join(', ')
  console.log(`\n${summary}`)

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = results.filter(r => r.status !== 'ok').map(r => `| ${r.status} | ${r.id} | ${r.message.replace(/\|/g, '\\|')} |`)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Source check\n\n${summary}\n\n${rows.length ? `| Status | Source | Detail |\n| --- | --- | --- |\n${rows.join('\n')}\n` : 'Every source checked out.\n'}`)
  }
  // Broken links, mismatched papers and changed NIH sheets need a person; CAPTCHA pages do not fail the run
  if (count('broken') + count('mismatch') + count('changed') > 0) process.exit(1)
}
