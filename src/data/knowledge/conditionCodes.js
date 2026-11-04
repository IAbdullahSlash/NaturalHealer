// Classification codes for the conditions in the remedy library (WHO ICD-11, release v2026-01).
//
// - icd11: the closest ICD-11 MMS code. Verified against the ICD-11 code listings in October 2026.
//   Using a code as a reference is allowed under ICD-11's CC BY-ND 3.0 IGO licence.
// - tm2Group: the ICD-11 Traditional Medicine Module 2 (Ayurveda, Siddha, Unani) group the
//   condition falls under, only where the match is unambiguous. Choosing the exact TM2 disorder
//   code is a clinical judgement, so it is left for a qualified practitioner (status 'draft').
//
// Our library entries are written for home care, so codes describe the closest match, not a diagnosis.

import { conditions } from '../generated/conditions.js'

export const ICD11_RELEASE = '2026-01'
export const ICD11_BROWSER = `https://icd.who.int/browse/${ICD11_RELEASE}/mms/en`

// The codes themselves live with each condition, in data/conditions/<id>.json (codes)
export const conditionCodes = Object.fromEntries(conditions.map(c => [c.id, c.codes]))

export const codeReview = { status: 'draft', reviewer: null, reviewedAt: null }
