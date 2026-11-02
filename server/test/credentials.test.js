// The health check must spot a service account value damaged when pasted into the host
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'

const { firebaseCredentialStatus } = await import('../lib/firebaseAdmin.js')

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
const account = JSON.stringify({ type: 'service_account', project_id: 'demo', client_email: 'admin@demo.iam.gserviceaccount.com', private_key: privateKey }, null, 2)

beforeEach(() => {
  for (const k of ['FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) delete process.env[k]
})

test('no credentials are reported as missing', () => {
  assert.equal(firebaseCredentialStatus(), 'missing')
})

test('a complete service account is accepted as JSON or base64', () => {
  process.env.FIREBASE_SERVICE_ACCOUNT = account
  assert.equal(firebaseCredentialStatus(), 'ok')
  process.env.FIREBASE_SERVICE_ACCOUNT = Buffer.from(account).toString('base64')
  assert.equal(firebaseCredentialStatus(), 'ok')
})

test('a value missing its closing brace is reported as invalid', () => {
  process.env.FIREBASE_SERVICE_ACCOUNT = account.slice(0, -1)
  assert.equal(firebaseCredentialStatus(), 'invalid')
})

test('a missing field or an unreadable private key is reported as invalid', () => {
  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'demo', private_key: privateKey })
  assert.equal(firebaseCredentialStatus(), 'invalid')
  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'demo', client_email: 'a@b.c', private_key: privateKey.slice(0, 200) })
  assert.equal(firebaseCredentialStatus(), 'invalid')
})

test('separate variables with escaped newlines are accepted', () => {
  Object.assign(process.env, { FIREBASE_PROJECT_ID: 'demo', FIREBASE_CLIENT_EMAIL: 'admin@demo.iam.gserviceaccount.com', FIREBASE_PRIVATE_KEY: privateKey.replace(/\n/g, '\n') })
  assert.equal(firebaseCredentialStatus(), 'ok')
})
