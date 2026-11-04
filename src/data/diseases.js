// The remedy library: everyday conditions with home remedies, prevention and when to see a
// doctor. The entries live in data/conditions/<id>.json, checked against
// data/schema/condition.schema.json by npm run data:build. Edit those files, not this one.

import { conditions } from './generated/conditions.js'

// desc is the one-line summary the cards show
export const diseases = conditions.map(c => ({ ...c, desc: c.summary }))

// The Ayurvedic view and tips that ground Vanya's answers about a condition
export const aiKnowledge = Object.fromEntries(conditions.map(c => [c.id, { overview: c.ayurvedicView, tips: c.tips, herbs: c.herbs }]))
