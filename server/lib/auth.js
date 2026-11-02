import { HttpError } from './http.js'
import { adminAuth } from './firebaseAdmin.js'

/**
 * Verify the Firebase ID token in `Authorization: Bearer <token>` and return the user.
 *
 * Local development only: when DEV_FAKE_UID is set and the code is not running on
 * Vercel, requests are treated as that user so the API can be exercised without a
 * service account. Vercel always sets VERCEL=1, so this path cannot activate there.
 */
export async function requireUser(req) {
  if (process.env.DEV_FAKE_UID && !process.env.VERCEL) {
    return { uid: process.env.DEV_FAKE_UID, email: 'dev@localhost', name: 'Local Developer', authTime: Math.floor(Date.now() / 1000) }
  }

  const header = req.headers.authorization || req.headers.Authorization || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  if (!match) throw new HttpError(401, 'Sign in to continue.')

  try {
    const decoded = await adminAuth().verifyIdToken(match[1])
    // authTime: when the person last entered their password or picked their Google account
    return { uid: decoded.uid, email: decoded.email || null, name: decoded.name || null, authTime: decoded.auth_time || 0 }
  } catch (err) {
    if (err.message?.includes('credentials are not configured')) {
      console.error('[auth]', err.message)
      throw new HttpError(503, 'The server is not configured yet.')
    }
    console.error('[auth] token rejected:', err.code, err.message)
    throw new HttpError(401, 'Your session has expired. Sign in again.')
  }
}
