// Keyword retrieval (BM25) over the knowledge base, with an everyday-language
// dictionary so people can ask the way they talk. No network calls: fast, free,
// deterministic and testable. Semantic (embedding) search can be layered on later.

import { buildCorpus, extraNames } from './corpus.js'
import { herbs } from '../../../src/data/knowledge/herbs.js'

// Everyday words -> terms the knowledge base uses. Keys and values are matched as tokens.
const SYNONYMS = {
  bloat: 'bloating gas', bloated: 'bloating gas', bloating: 'gas', gassy: 'gas bloating', flatulence: 'gas bloating', fart: 'gas',
  heartburn: 'acidity reflux', reflux: 'acidity', acid: 'acidity', acidic: 'acidity', gerd: 'acidity reflux',
  indigestion: 'digestion digestive', digest: 'digestion', stomach: 'digestion digestive', tummy: 'digestion', appetite: 'digestion appetite',
  constipated: 'constipation bowel', constipation: 'bowel', loose: 'diarrhoea stools', diarrhea: 'diarrhoea',
  nausea: 'nausea', nauseous: 'nausea', vomit: 'nausea', vomiting: 'nausea', queasy: 'nausea',
  sleep: 'sleep insomnia', insomnia: 'sleep', sleepless: 'sleep insomnia', awake: 'sleep insomnia',
  stress: 'stress calming anxiety', stressed: 'stress calming anxiety', anxious: 'anxiety calming', anxiety: 'calming stress', worry: 'anxiety', tension: 'stress',
  memory: 'memory focus', forget: 'memory', focus: 'memory concentration', concentration: 'focus memory', exam: 'memory focus',
  cold: 'cold congestion', cough: 'cough congestion', sneeze: 'cold', congestion: 'congestion', blocked: 'congestion', runny: 'cold', throat: 'throat cough', sore: 'throat',
  fever: 'fever', flu: 'fever cold', immunity: 'immunity rasayana', immune: 'immunity',
  joint: 'joint joints', joints: 'joint', knee: 'joint', arthritis: 'joint joints', stiff: 'joint stiffness', stiffness: 'joint',
  skin: 'skin', acne: 'skin acne', pimple: 'skin acne', pimples: 'skin acne', rash: 'skin rashes', itch: 'skin itching', itchy: 'skin itching', burn: 'burns skin', sunburn: 'burns skin',
  tooth: 'toothache dental', toothache: 'dental', teeth: 'dental', gum: 'dental', breath: 'breath',
  sugar: 'blood sugar diabetes', diabetes: 'blood sugar antidiabetics diabetes', diabetic: 'diabetes antidiabetics blood sugar',
  bp: 'blood pressure hypertension', pressure: 'blood pressure', hypertension: 'blood pressure antihypertensives',
  heart: 'heart', cholesterol: 'cholesterol',
  weak: 'weakness strengthening', weakness: 'strengthening', tired: 'fatigue weakness', fatigue: 'weakness strengthening',
  pregnant: 'pregnancy', pregnancy: 'pregnancy', expecting: 'pregnancy', breastfeeding: 'breastfeeding', nursing: 'breastfeeding',
  baby: 'infants children', babies: 'infants children', infant: 'infants', child: 'children', kid: 'children', kids: 'children', toddler: 'children',
  warfarin: 'anticoagulants blood thinners', aspirin: 'anticoagulants blood thinners', clopidogrel: 'anticoagulants', thinner: 'anticoagulants', thinners: 'anticoagulants',
  metformin: 'antidiabetics diabetes', insulin: 'antidiabetics diabetes', thyroxine: 'thyroid', levothyroxine: 'thyroid',
  medicine: 'interaction', medicines: 'interaction', medication: 'interaction', tablets: 'interaction', pills: 'interaction', drug: 'interaction',
  safe: 'safety caution', safety: 'caution', side: 'safety', dose: 'amount', dosage: 'amount', much: 'amount',
  periods: 'menstrual women', menstrual: 'women', women: 'women',
}

const STOP = new Set('a an the and or of to in on for with is are be can i me my it this that what which how do does should take taking have has from at as by not no any about you your we our help helps good best'.split(' '))

function stem(t) {
  if (t.length > 5 && t.endsWith('ing')) return t.slice(0, -3)
  if (t.length > 4 && t.endsWith('es') && !t.endsWith('ses')) return t.slice(0, -2)
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1)
  return t
}

export function tokenize(text) {
  return (String(text).toLowerCase().normalize('NFKC').match(/[\p{L}\p{M}\p{N}]+/gu) || [])
    .filter(t => !STOP.has(t) && t.length > 1)
}

function expand(tokens) {
  const out = [...tokens]
  for (const t of tokens) if (SYNONYMS[t]) out.push(...tokenize(SYNONYMS[t]))
  return out.map(stem)
}

const K1 = 1.4
const B = 0.7

function buildIndex() {
  const chunks = buildCorpus()
  const docs = chunks.map(c => {
    // Names and keywords count three times so a herb's own entry outranks passing mentions
    const tokens = [...tokenize(c.text), ...Array(3).fill(tokenize(`${c.title} ${c.keywords}`)).flat()].map(stem)
    const tf = new Map()
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1)
    return { chunk: c, tf, len: tokens.length }
  })
  const df = new Map()
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1)
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length
  return { docs, df, avgLen, N: docs.length, byId: new Map(chunks.map(c => [c.id, c])) }
}

let index = null
const getIndex = () => (index ||= buildIndex())

export function search(query, { limit = 6 } = {}) {
  const { docs, df, avgLen, N } = getIndex()
  const terms = [...new Set(expand(tokenize(query)))]
  if (!terms.length) return []
  const scored = docs.map(d => {
    let score = 0
    for (const t of terms) {
      const f = d.tf.get(t)
      if (!f) continue
      const idf = Math.log(1 + (N - df.get(t) + 0.5) / (df.get(t) + 0.5))
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (d.len / avgLen))))
    }
    return { chunk: d.chunk, score }
  }).filter(x => x.score > 0)
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

// Herbs whose names appear in the text (used to pull in their safety notes)
const nameIndex = herbs.flatMap(h =>
  [h.name, h.hindi, h.english, ...(h.sanskrit || '').split(/[,()]/), h.id.replace('-', ' '), ...extraNames(h.id)]
    .flatMap(n => String(n || '').split('/'))
    .map(n => n.trim().toLowerCase())
    .filter(n => n.length > 2)
    .map(n => [n, h.id])
)

export function herbsMentioned(text) {
  const lower = String(text).toLowerCase()
  return [...new Set(nameIndex.filter(([n]) => new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u').test(lower)).map(([, id]) => id))]
}

/**
 * The passages to ground an answer in.
 * - the best keyword matches for the question
 * - the condition the user is reading, when scoped to one
 * - safety notes for every herb that comes up, because safety is never optional
 */
// A condition must score at least this share of the top passage to be kept in view
const CONDITION_SHARE = 0.35

export function retrieve(query, { conditionId = null, limit = 6, maxSafety = 3 } = {}) {
  const { byId } = getIndex()
  const picked = new Map()
  const add = (chunk) => { if (chunk && !picked.has(chunk.id)) picked.set(chunk.id, chunk) }

  if (conditionId) add(byId.get(`condition:${conditionId}`))
  const ranked = search(query, { limit: Infinity })
  for (const { chunk } of ranked.slice(0, limit)) add(chunk)

  // Keep the best-matching library condition in view even when many herbs score higher,
  // so its remedies and doctor guidance still reach the answer
  if (![...picked.values()].some(c => c.kind === 'condition')) {
    const best = ranked.find(r => r.chunk.kind === 'condition')
    if (best && best.score >= ranked[0].score * CONDITION_SHARE) add(best.chunk)
  }

  const herbIds = new Set([...picked.values()].filter(c => c.kind === 'herb').map(c => c.entityId))
  for (const id of herbsMentioned(query)) herbIds.add(id)
  let safetyAdded = 0
  for (const id of herbIds) {
    if (safetyAdded >= maxSafety) break
    const before = picked.size
    add(byId.get(`herb:${id}:safety`))
    if (picked.size > before) safetyAdded++
  }
  return [...picked.values()].slice(0, limit + maxSafety + 1)
}

export function getChunk(id) {
  return getIndex().byId.get(id) || null
}
