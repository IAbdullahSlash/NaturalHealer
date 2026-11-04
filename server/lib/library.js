// The remedy library is shared with the frontend so both always agree on content.
import { diseases, aiKnowledge } from '../../src/data/diseases.js'

export const conditionIds = new Set(diseases.map(d => d.id))

export function getCondition(id) {
  return diseases.find(d => d.id === id) || null
}

// Plain-text summary of a condition for grounding the model
export function conditionBrief(id) {
  const d = getCondition(id)
  if (!d) return ''
  const k = aiKnowledge[id] || {}
  return [
    `Condition: ${d.title} (severity: ${d.severity}, usual duration: ${d.duration}, doshas: ${d.doshas.join(', ')})`,
    `Summary: ${d.desc}`,
    k.overview ? `Ayurvedic view: ${k.overview}` : '',
    `Library remedies:\n${d.remedies.map(r => `- ${r}`).join('\n')}`,
    `Prevention:\n${d.prevention.map(p => `- ${p}`).join('\n')}`,
    d.seeDoctor?.length ? `See a doctor if:\n${d.seeDoctor.map(p => `- ${p}`).join('\n')}` : '',
  ].filter(Boolean).join('\n')
}

// A compact index so the model can point general questions to library entries
export function libraryIndex() {
  return diseases.map(d => `- ${d.title}${d.severity === 'serious' ? ' (needs a doctor)' : ''}`).join('\n')
}
