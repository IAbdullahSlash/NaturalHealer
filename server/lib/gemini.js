import { GoogleGenerativeAI } from '@google/generative-ai'

// Primary model, then fallbacks tried in order when a model is overloaded (503),
// rate limited (429) or retired (404). Override with GEMINI_MODEL and
// GEMINI_FALLBACK_MODELS (comma-separated).
const MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  ...(process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash,gemini-flash-lite-latest').split(','),
].map(m => m.trim()).filter((m, i, all) => m && all.indexOf(m) === i)

const RETRYABLE = new Set([404, 429, 500, 503])
// Time allowed for a model to start answering. Overloaded models sometimes hang rather
// than return 503, so earlier attempts get a short leash; the last one gets longer.
const FIRST_TOKEN_TIMEOUT_MS = 12_000
const LAST_ATTEMPT_TIMEOUT_MS = 25_000
// Hard cap on a whole answer, inside Vercel's 60s function limit
const ANSWER_TIMEOUT_MS = 50_000

// A model that just failed is likely to fail again for a while (overload tends to last
// minutes), so skip it until the cooldown ends instead of making every question wait on
// it. It still gets tried last if nothing else answers. Kept per warm function instance.
const COOLDOWN_MS = 5 * 60 * 1000
const coolingUntil = new Map()

export function markUnavailable(name, now = Date.now()) {
  coolingUntil.set(name, now + COOLDOWN_MS)
}

// Healthy models in the configured order, then cooling ones, soonest to recover first
export function modelOrder(now = Date.now(), models = MODELS) {
  const cooling = (m) => (coolingUntil.get(m) || 0) > now
  return [
    ...models.filter(m => !cooling(m)),
    ...models.filter(cooling).sort((a, b) => coolingUntil.get(a) - coolingUntil.get(b)),
  ]
}

export function resetModelHealth() {
  coolingUntil.clear()
}

const isRetryable = (err) => RETRYABLE.has(err.status) || err.name === 'AbortError' || /aborted|timed? ?out|fetch failed/i.test(String(err.message))

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

let client = null
function getModel(name, systemInstruction, signal) {
  if (!process.env.GEMINI_API_KEY) throw Object.assign(new Error('GEMINI_API_KEY is not set.'), { code: 'not-configured' })
  client ||= new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return client.getGenerativeModel(
    { model: name, systemInstruction, generationConfig: { temperature: 0.6, maxOutputTokens: 4096 } },
    { signal },
  )
}

// Open a stream on the first model that accepts the request. Falling back is only
// safe before any text has been sent, which is exactly when these errors occur.
// (The SDK's own `timeout` option is never cleared and would cut answers off
// mid-stream, so we drive cancellation with our own signal.)
async function openStream({ systemInstruction, contents }) {
  let lastError
  const order = modelOrder()
  for (const [i, name] of order.entries()) {
    const controller = new AbortController()
    const wait = i === order.length - 1 ? LAST_ATTEMPT_TIMEOUT_MS : FIRST_TOKEN_TIMEOUT_MS
    const startTimer = setTimeout(() => controller.abort(), wait)
    try {
      const result = await getModel(name, systemInstruction, controller.signal).generateContentStream({ contents })
      clearTimeout(startTimer)
      const capTimer = setTimeout(() => controller.abort(), ANSWER_TIMEOUT_MS)
      return { result, release: () => clearTimeout(capTimer) }
    } catch (err) {
      clearTimeout(startTimer)
      lastError = err
      if (err.code === 'not-configured' || !isRetryable(err)) throw err
      markUnavailable(name)
      const why = controller.signal.aborted ? `no answer within ${wait / 1000}s` : `${err.status || err.name}: ${String(err.message).slice(0, 120)}`
      console.warn(`[gemini] ${name} unavailable (${why}); skipping it for ${COOLDOWN_MS / 60000} minutes`)
    }
  }
  throw lastError
}

/** Stream text chunks from Gemini. Yields strings. */
export async function* streamAnswer(prompt) {
  const { result, release } = await openStream(prompt)
  try {
    for await (const chunk of result.stream) {
      let text = ''
      try {
        text = chunk.text()
      } catch {
        // A chunk with no text (for example a safety block) throws; the final check below reports it
      }
      if (text) yield text
    }
    const final = await result.response
    const reason = final.candidates?.[0]?.finishReason
    if (reason === 'SAFETY' || final.promptFeedback?.blockReason) {
      throw Object.assign(new Error('blocked'), { code: 'blocked' })
    }
    if (reason === 'MAX_TOKENS') console.warn('[gemini] answer hit the output limit and was cut short')
  } finally {
    release()
  }
}

// Turn provider errors into messages that are safe and useful to show users
export function friendlyAIError(err) {
  const msg = String(err?.message || '')
  if (err?.code === 'not-configured') return 'The guide is not configured on the server yet.'
  if (err?.code === 'blocked') return 'I can’t answer that one. Try rephrasing your question.'
  if (err?.status === 429 || err?.status === 503 || err?.name === 'AbortError' || /quota|RESOURCE_EXHAUSTED|high demand|aborted/.test(msg)) return 'The guide is very busy right now. Please try again in a minute.'
  if (/API key|PERMISSION_DENIED|403/.test(msg)) return 'The guide is not configured correctly on the server.'
  return 'The guide couldn’t answer just now. Please try again.'
}
