// References: resolving citations against the source registry, and the coverage rules.
//
// Rules for what counts as support:
// - Safety claims (cautions and medicine interactions) need a checkable source: a
//   government safety monograph or label (kind "safety") or a peer-reviewed paper ("paper").
// - Evidence summaries need the same.
// - Classical properties need a classical text or the pharmacopoeia, and those need a
//   locator (volume and page, or chapter and verse) before they count as checked.
// - Search links (kind "search") never count as support.

export const SUPPORTS_SAFETY = new Set(['safety', 'paper'])
export const CLASSICAL = new Set(['classical', 'pharmacopoeia'])

// What a resolved citation carries into the site, Vanya and the dataset
export function resolveRef(ref, sourcesById) {
  const s = sourcesById.get(ref.source)
  if (!s) return null
  return {
    id: s.id,
    kind: s.kind,
    title: s.title,
    url: s.url,
    publisher: s.publisher,
    updated: s.updated,
    pmid: s.pmid,
    doi: s.doi,
    year: s.year,
    ...(ref.locator ? { locator: ref.locator } : {}),
    // Short note shown after the title on herb pages
    detail: ref.locator || (s.updated ? `Last updated ${s.updated}` : undefined),
  }
}

// Every citation in a herb, with where it sits, for checks and the dataset
export function herbCitations(h) {
  return [
    ...h.sources.map(ref => ({ claim: 'entry', key: '', ref })),
    ...(h.properties.refs || []).map(ref => ({ claim: 'properties', key: '', ref })),
    ...h.cautions.flatMap(c => (c.refs || []).map(ref => ({ claim: 'caution', key: c.group, ref }))),
    ...h.interactions.flatMap(i => (i.refs || []).map(ref => ({ claim: 'interaction', key: i.drugClass, ref }))),
    ...(h.evidence.refs || []).map(ref => ({ claim: 'evidence', key: h.evidence.level, ref })),
  ]
}

const hasProperties = (p) => Boolean(p.rasa?.length || p.guna?.length || p.virya || p.vipaka || p.pacifies?.length || p.aggravates?.length)

// Coverage of the dataset. Metrics are counts of gaps, so lower is better.
export function coverage(herbs, conditions, sourcesById) {
  // Works on raw citations ({ source }) and on resolved ones from the generated modules ({ id, kind })
  const kind = (ref) => ref.kind || sourcesById.get(ref.source)?.kind
  const supported = (refs) => (refs || []).some(r => SUPPORTS_SAFETY.has(kind(r)))
  const issues = []
  const metrics = {
    safetyClaimsWithoutSource: 0,
    evidenceWithoutSource: 0,
    propertiesWithoutClassicalSource: 0,
    classicalCitationsWithoutLocator: 0,
    conditionsWithoutSource: 0,
  }
  const claims = { safety: 0, evidence: herbs.length, properties: 0 }

  for (const h of herbs) {
    const gap = (what) => issues.push({ entity: `herbs/${h.id}`, what })
    for (const c of h.cautions) {
      claims.safety++
      if (!supported(c.refs)) { metrics.safetyClaimsWithoutSource++; gap(`caution "${c.group}" has no safety or paper source`) }
    }
    for (const i of h.interactions) {
      claims.safety++
      if (!supported(i.refs)) { metrics.safetyClaimsWithoutSource++; gap(`interaction "${i.drugClass}" has no safety or paper source`) }
    }
    if (!supported(h.evidence.refs)) { metrics.evidenceWithoutSource++; gap('evidence summary has no safety or paper source') }
    if (hasProperties(h.properties)) {
      claims.properties++
      const classical = [...(h.properties.refs || []), ...h.sources].filter(r => CLASSICAL.has(kind(r)))
      if (!classical.length) { metrics.propertiesWithoutClassicalSource++; gap('classical properties have no classical or pharmacopoeia source') }
    }
    for (const { claim, ref } of herbCitations(h)) {
      if (CLASSICAL.has(kind(ref)) && !ref.locator) { metrics.classicalCitationsWithoutLocator++; gap(`${claim} cites ${ref.source || ref.id} without a volume, page or verse`) }
    }
  }
  for (const c of conditions) {
    if (!c.sources?.length) { metrics.conditionsWithoutSource++; issues.push({ entity: `conditions/${c.id}`, what: 'no sources for its guidance' }) }
  }
  return { metrics, claims, issues }
}
