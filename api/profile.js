import { route, readJson, sendJson, HttpError } from '../server/lib/http.js'
import { requireUser } from '../server/lib/auth.js'
import { enforceLimit, rateLimitBuckets } from '../server/lib/rateLimit.js'
import { adminAuth } from '../server/lib/firebaseAdmin.js'
import { getStore } from '../server/lib/store.js'
import { ensureProfile, publicProfile, clampName } from '../server/lib/profile.js'

// GET  /api/profile            the signed-in user's profile (created on first call)
// PUT  /api/profile {displayName}
// DELETE /api/profile {confirm: 'DELETE'}   erase all the user's data, then their sign-in
export default route({
  async GET(req, res) {
    const user = await requireUser(req)
    const profile = await ensureProfile(user)
    sendJson(res, 200, { profile: publicProfile(profile) })
  },

  async PUT(req, res) {
    const user = await requireUser(req)
    await enforceLimit(user.uid, 'write')
    const body = await readJson(req)
    const displayName = clampName(body.displayName)
    if (displayName.length < 2) throw new HttpError(400, 'Enter a name of at least 2 characters.')
    await ensureProfile(user)
    const profile = await getStore().upsertProfile(user.uid, { displayName })
    sendJson(res, 200, { profile: publicProfile(profile) })
  },

  async DELETE(req, res) {
    const user = await requireUser(req)
    const body = await readJson(req)
    if (body.confirm !== 'DELETE') throw new HttpError(400, 'Confirm by sending confirm: "DELETE".')
    // A token can live for an hour, so ask for a fresh sign-in before something this permanent
    if (Date.now() / 1000 - user.authTime > RECENT_SIGN_IN_SECONDS) {
      throw new HttpError(401, 'For your security, sign in again to delete your account.', { body: { reauth: true } })
    }
    await enforceLimit(user.uid, 'write')
    await getStore().deleteUserData(user.uid, rateLimitBuckets(user.uid))
    // Data first: if this step fails, a retry still works because the sign-in remains
    if (!process.env.DEV_FAKE_UID || process.env.VERCEL) {
      try {
        await adminAuth().deleteUser(user.uid)
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err
      }
    }
    sendJson(res, 200, { deleted: true })
  },
})

const RECENT_SIGN_IN_SECONDS = 5 * 60
