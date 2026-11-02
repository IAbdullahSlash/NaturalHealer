import { route, sendJson } from '../server/lib/http.js'
import { firebaseCredentialStatus } from '../server/lib/firebaseAdmin.js'
import { isGeminiConfigured } from '../server/lib/gemini.js'

// GET /api/health   which parts of the server are configured (never the values)
export default route({
  async GET(req, res) {
    const memory = process.env.DEV_MEMORY_STORE === '1' && !process.env.VERCEL
    const firebase = memory ? 'ok' : firebaseCredentialStatus()
    const database = memory ? 'memory' : { ok: 'firestore', invalid: 'invalid-credentials', missing: 'not-configured' }[firebase]
    const ai = isGeminiConfigured()
    // ok means sign-in, saving and Vanya can all work with this configuration
    sendJson(res, 200, { ok: firebase === 'ok' && ai, ai, database })
  },
})
