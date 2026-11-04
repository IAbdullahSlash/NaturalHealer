// Natural Healer knowledge base: herbs, spices and kitchen substances (dravya).
//
// The entries live in data/herbs/<id>.json, one file per herb, checked against
// data/schema/herb.schema.json by npm run data:build. Edit those files, not this one.
//
// Editorial rules, in short:
// - Every entry starts as review.status 'draft' until a qualified practitioner (BAMS) checks it.
// - Classical properties are filled only where widely agreed; unknown fields stay null.
// - Sources are named only at the level we are sure of. No invented verse numbers or studies.
// - `cautions[].group` and `interactions[].drugClass` use the fixed vocabularies in
//   ./vocabulary.js so the safety layer can match them against a person's profile.

import { herbs } from '../generated/herbs.js'

export { herbs }
export const herbById = Object.fromEntries(herbs.map(h => [h.id, h]))
