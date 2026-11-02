import { HttpError } from './http.js'
import { getStore } from './store.js'

// Per-user budgets. AI calls cost money, so they get the tightest limits.
export const LIMITS = {
  chat: { limit: 20, windowMs: 10 * 60 * 1000 },
  chatDaily: { limit: 150, windowMs: 24 * 60 * 60 * 1000 },
  write: { limit: 60, windowMs: 60 * 1000 },
  prakriti: { limit: 10, windowMs: 60 * 60 * 1000 },
}

// Every counter a user can have, so deleting an account can remove them all
export const rateLimitBuckets = (uid) => Object.keys(LIMITS).map(name => `${uid}_${name}`)

export async function enforceLimit(uid, name) {
  const { limit, windowMs } = LIMITS[name]
  const result = await getStore().hitRateLimit(`${uid}_${name}`, limit, windowMs)
  if (!result.ok) {
    const minutes = Math.max(1, Math.ceil(result.retryAfter / 60))
    throw new HttpError(429, `You've reached the limit for now. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`, {
      headers: { 'Retry-After': String(result.retryAfter) },
      body: { retryAfter: result.retryAfter },
    })
  }
}
