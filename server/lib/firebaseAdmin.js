import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { createPrivateKey } from 'node:crypto'

// Credentials come from the environment, never from the repo. Either:
//   FIREBASE_SERVICE_ACCOUNT  the service account JSON (raw or base64), or
//   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
function readCredentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const json = JSON.parse(text)
    return { projectId: json.project_id || json.projectId, clientEmail: json.client_email || json.clientEmail, privateKey: json.private_key || json.privateKey }
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // Env UIs often store the newlines escaped
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  }
  return null
}

// Check the credentials can actually be used, so a value damaged when pasted into the
// host's settings is reported as such instead of surfacing as "session expired"
function credentials() {
  let creds
  try {
    creds = readCredentials()
  } catch {
    throw new Error('Firebase Admin credentials are invalid: FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64 JSON.')
  }
  if (!creds) return null
  if (!creds.projectId || !creds.clientEmail || !creds.privateKey) {
    throw new Error('Firebase Admin credentials are invalid: the project ID, client email or private key is missing.')
  }
  try {
    createPrivateKey(creds.privateKey)
  } catch {
    throw new Error('Firebase Admin credentials are invalid: the private key cannot be read.')
  }
  return creds
}

// 'ok', 'invalid' or 'missing', for the health check. Never includes the values.
export function firebaseCredentialStatus() {
  try {
    return credentials() ? 'ok' : 'missing'
  } catch {
    return 'invalid'
  }
}

function app() {
  if (getApps().length) return getApps()[0]
  const creds = credentials()
  if (!creds) throw new Error('Firebase Admin credentials are not configured.')
  return initializeApp({ credential: cert(creds) })
}

export const adminAuth = () => getAuth(app())
export const adminDb = () => getFirestore(app())
