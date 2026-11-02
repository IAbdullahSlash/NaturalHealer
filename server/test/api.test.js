// Exercises the real handlers against the in-memory store with a fake signed-in user.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'

process.env.DEV_MEMORY_STORE = '1'
process.env.DEV_FAKE_UID = 'test-user'
delete process.env.VERCEL
delete process.env.GEMINI_API_KEY

const { resetMemoryStore } = await import('../lib/store.js')
const { QUESTIONS } = await import('../lib/prakriti.js')
const chat = (await import('../../api/chat.js')).default
const chatById = (await import('../../api/chats/[id].js')).default
const chats = (await import('../../api/chats/index.js')).default
const favorites = (await import('../../api/favorites.js')).default
const profile = (await import('../../api/profile.js')).default
const prakriti = (await import('../../api/prakriti.js')).default

let store
before(() => { store = resetMemoryStore() })

// Minimal stand-ins for Node's request and response
function call(handler, { method = 'GET', body, query = {} } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
  Object.assign(req, { method, headers: {}, query, url: '/api' })
  return new Promise((resolve) => {
    const res = new EventEmitter()
    const headers = {}
    let out = ''
    Object.assign(res, {
      statusCode: 200,
      headersSent: false,
      setHeader: (k, v) => { headers[k.toLowerCase()] = v },
      flushHeaders: () => { res.headersSent = true },
      write: (chunk) => { res.headersSent = true; out += chunk },
      end: (chunk = '') => {
        out += chunk
        const type = headers['content-type'] || ''
        resolve({ status: res.statusCode, headers, body: type.includes('json') ? JSON.parse(out) : out })
        res.emit('finish')
      },
    })
    handler(req, res)
  })
}

const events = (sse) => sse.split('\n\n').filter(Boolean).map(block => {
  const [e, d] = block.split('\n')
  return { event: e.slice(7), data: JSON.parse(d.slice(6)) }
})

test('profile is created on first contact and can be renamed', async () => {
  const first = await call(profile)
  assert.equal(first.status, 200)
  assert.equal(first.body.profile.uid, 'test-user')
  const renamed = await call(profile, { method: 'PUT', body: { displayName: '  Asha   Devi ' } })
  assert.equal(renamed.body.profile.displayName, 'Asha Devi')
})

test('favorites keep only known condition ids', async () => {
  const res = await call(favorites, { method: 'PUT', body: { favorites: ['cold', 'not-a-condition', 'cold', 'insomnia'] } })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.favorites, ['cold', 'insomnia'])
  assert.deepEqual((await call(favorites)).body.favorites, ['cold', 'insomnia'])
})

test('prakriti is scored and saved to the profile', async () => {
  const q = await call(prakriti)
  assert.equal(q.body.questions.length, QUESTIONS.length)
  const answers = Object.fromEntries(QUESTIONS.map(x => [x.id, 'kapha']))
  const saved = await call(prakriti, { method: 'POST', body: { answers } })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.result.dominant, 'kapha')
  assert.equal((await call(profile)).body.profile.prakriti.dominant, 'kapha')
  const bad = await call(prakriti, { method: 'POST', body: { answers: { frame: 'vata' } } })
  assert.equal(bad.status, 400)
})

test('chat rejects empty messages', async () => {
  const res = await call(chat, { method: 'POST', body: { message: ' ' } })
  assert.equal(res.status, 400)
})

test('an emergency message gets the safety reply, is saved, and logs an event without the text', async () => {
  const res = await call(chat, { method: 'POST', body: { message: 'my mother has severe chest pain and is sweating' } })
  const ev = events(res.body)
  assert.equal(ev[0].event, 'meta')
  assert.equal(ev[0].data.triage, 'emergency')
  const text = ev.filter(e => e.event === 'delta').map(e => e.data.text).join('')
  assert.match(text, /112/)
  assert.equal(ev.at(-1).event, 'done')

  const chatId = ev[0].data.chatId
  const detail = await call(chatById, { query: { id: chatId } })
  assert.equal(detail.body.messages.length, 2)
  assert.equal(detail.body.messages[1].triage, 'emergency')

  assert.equal(store.safetyEvents.length, 1)
  assert.deepEqual(store.safetyEvents[0].categories, ['chest'])
  assert.equal(JSON.stringify(store.safetyEvents[0]).includes('mother'), false)
})

test('a normal message without an AI key reports an error and leaves no empty chat', async () => {
  const before = (await call(chats)).body.chats.length
  const res = await call(chat, { method: 'POST', body: { message: 'How do I make jeera water?' } })
  const ev = events(res.body)
  assert.equal(ev.at(-1).event, 'error')
  assert.equal((await call(chats)).body.chats.length, before)
})

test('conversations can be renamed and deleted, and unknown ids 404', async () => {
  const [first] = (await call(chats)).body.chats
  const renamed = await call(chatById, { method: 'PATCH', query: { id: first.id }, body: { title: 'Chest pain' } })
  assert.equal(renamed.body.chat.title, 'Chest pain')
  assert.equal((await call(chatById, { method: 'DELETE', query: { id: first.id } })).status, 200)
  assert.equal((await call(chatById, { query: { id: first.id } })).status, 404)
})

test('chat is rate limited per user', async () => {
  let status = 200
  for (let i = 0; i < 25 && status !== 429; i++) {
    status = (await call(chat, { method: 'POST', body: { message: 'my chest hurts badly' } })).status
  }
  assert.equal(status, 429)
})

test('deleting the account needs confirmation, then erases everything the user stored', async () => {
  await call(favorites, { method: 'PUT', body: { favorites: ['cold'] } })
  await call(chat, { method: 'POST', body: { message: 'I have crushing chest pain' } })
  const other = await store.createChat('someone-else', { title: 'Theirs' })
  await store.logSafetyEvent({ uid: 'someone-else', chatId: other.id, level: 'emergency', categories: [] })
  assert.ok((await store.listChats('test-user')).length > 0)

  const unconfirmed = await call(profile, { method: 'DELETE', body: {} })
  assert.equal(unconfirmed.status, 400)
  assert.ok(await store.getProfile('test-user'))

  const res = await call(profile, { method: 'DELETE', body: { confirm: 'DELETE' } })
  assert.equal(res.status, 200)
  assert.equal(await store.getProfile('test-user'), null)
  assert.deepEqual(await store.listChats('test-user'), [])
  assert.ok(store.safetyEvents.every(e => e.uid !== 'test-user'))
  // Other people's data is untouched
  assert.equal((await store.listChats('someone-else')).length, 1)
  assert.equal(store.safetyEvents.filter(e => e.uid === 'someone-else').length, 1)
})
