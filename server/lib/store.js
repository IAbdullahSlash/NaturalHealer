import { FieldValue, Timestamp } from '@google-cloud/firestore'
import { adminDb } from './firebaseAdmin.js'

// Persistence for the API. Firestore in production; an in-memory store for local
// development when DEV_MEMORY_STORE=1 (never on Vercel).
//
// Data model (Firestore):
//   users/{uid}                          profile: displayName, email, favorites[], prakriti, timestamps
//   users/{uid}/chats/{chatId}           title, messageCount, conditionId, createdAt, updatedAt
//   users/{uid}/chats/{chatId}/messages  role ('user' | 'assistant'), text, triage, createdAt
//   safetyEvents/{id}                    uid, chatId, level, categories, createdAt (no message text)
//   rateLimits/{bucket}                  count, windowStart
//   Users/{uid}/Chats/...                legacy layout, kept until migrated (scripts/migrate-legacy-chats.mjs)

const toDate = (v) => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : v ? new Date(v) : null)

function firestoreStore() {
  const db = adminDb()
  const user = (uid) => db.collection('users').doc(uid)
  const chats = (uid) => user(uid).collection('chats')
  const messages = (uid, chatId) => chats(uid).doc(chatId).collection('messages')

  const chatOut = (doc) => {
    const d = doc.data()
    return { id: doc.id, title: d.title, messageCount: d.messageCount || 0, conditionId: d.conditionId || null, createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt) }
  }

  return {
    async getProfile(uid) {
      const snap = await user(uid).get()
      if (!snap.exists) return null
      const d = snap.data()
      return { ...d, createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt), prakriti: d.prakriti ? { ...d.prakriti, assessedAt: toDate(d.prakriti.assessedAt) } : null }
    },

    async upsertProfile(uid, fields, { create } = {}) {
      const data = { ...fields, updatedAt: FieldValue.serverTimestamp() }
      if (create) data.createdAt = FieldValue.serverTimestamp()
      await user(uid).set(data, { merge: true })
      return this.getProfile(uid)
    },

    async listChats(uid, limit = 50) {
      const snap = await chats(uid).orderBy('updatedAt', 'desc').limit(limit).get()
      return snap.docs.map(chatOut)
    },

    async getChat(uid, chatId) {
      const snap = await chats(uid).doc(chatId).get()
      return snap.exists ? chatOut(snap) : null
    },

    async createChat(uid, { title, conditionId = null }) {
      const ref = chats(uid).doc()
      await ref.set({ title, conditionId, messageCount: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
      return { id: ref.id, title, conditionId, messageCount: 0 }
    },

    async updateChat(uid, chatId, fields) {
      await chats(uid).doc(chatId).update({ ...fields, updatedAt: FieldValue.serverTimestamp() })
    },

    async deleteChat(uid, chatId) {
      await db.recursiveDelete(chats(uid).doc(chatId))
    },

    async listMessages(uid, chatId, { limit = 200 } = {}) {
      const snap = await messages(uid, chatId).orderBy('createdAt', 'desc').limit(limit).get()
      return snap.docs.reverse().map(doc => {
        const d = doc.data()
        return { id: doc.id, role: d.role, text: d.text, triage: d.triage || null, sources: d.sources || [], createdAt: toDate(d.createdAt) }
      })
    },

    // Append a turn and bump the chat's counters in one batch
    async addTurn(uid, chatId, turn) {
      const batch = db.batch()
      const now = Date.now()
      turn.forEach((m, i) => {
        batch.set(messages(uid, chatId).doc(), { role: m.role, text: m.text, triage: m.triage || null, sources: m.sources || [], createdAt: Timestamp.fromMillis(now + i) })
      })
      batch.update(chats(uid).doc(chatId), { messageCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
      await batch.commit()
    },

    async logSafetyEvent(event) {
      await db.collection('safetyEvents').add({ ...event, createdAt: FieldValue.serverTimestamp() })
    },

    // Erase everything stored for a user: profile, chats and messages, the legacy copy
    // of their chats, their safety events and their rate-limit counters
    async deleteUserData(uid, rateLimitBuckets = []) {
      await db.recursiveDelete(user(uid))
      await db.recursiveDelete(db.collection('Users').doc(uid))
      const refs = [
        ...(await db.collection('safetyEvents').where('uid', '==', uid).select().get()).docs.map(d => d.ref),
        ...rateLimitBuckets.map(b => db.collection('rateLimits').doc(b)),
      ]
      for (let i = 0; i < refs.length; i += 400) {
        const batch = db.batch()
        refs.slice(i, i + 400).forEach(ref => batch.delete(ref))
        await batch.commit()
      }
    },

    // Fixed-window counter, transactional so concurrent function instances agree
    async hitRateLimit(bucket, limit, windowMs) {
      const ref = db.collection('rateLimits').doc(bucket)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        const now = Date.now()
        const d = snap.exists ? snap.data() : null
        const start = d ? toDate(d.windowStart).getTime() : 0
        if (!d || now - start >= windowMs) {
          tx.set(ref, { count: 1, windowStart: Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + windowMs) })
          return { ok: true, remaining: limit - 1 }
        }
        if (d.count >= limit) return { ok: false, retryAfter: Math.ceil((start + windowMs - now) / 1000) }
        tx.update(ref, { count: FieldValue.increment(1) })
        return { ok: true, remaining: limit - d.count - 1 }
      })
    },
  }
}

function memoryStore() {
  const users = new Map()
  const chats = new Map() // `${uid}/${chatId}` -> chat
  const msgs = new Map() // `${uid}/${chatId}` -> messages[]
  const limits = new Map()
  const safety = []
  let seq = 0
  const id = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

  return {
    safetyEvents: safety,
    async getProfile(uid) { return users.get(uid) || null },
    async upsertProfile(uid, fields, { create } = {}) {
      const now = new Date()
      const prev = users.get(uid) || {}
      users.set(uid, { ...prev, ...fields, ...(create && !prev.createdAt ? { createdAt: now } : {}), updatedAt: now })
      return users.get(uid)
    },
    async listChats(uid, limit = 50) {
      return [...chats.entries()].filter(([k]) => k.startsWith(`${uid}/`)).map(([, c]) => c)
        .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit)
    },
    async getChat(uid, chatId) { return chats.get(`${uid}/${chatId}`) || null },
    async createChat(uid, { title, conditionId = null }) {
      const chat = { id: id(), title, conditionId, messageCount: 0, createdAt: new Date(), updatedAt: new Date() }
      chats.set(`${uid}/${chat.id}`, chat)
      msgs.set(`${uid}/${chat.id}`, [])
      return chat
    },
    async updateChat(uid, chatId, fields) {
      const c = chats.get(`${uid}/${chatId}`)
      if (c) Object.assign(c, fields, { updatedAt: new Date() })
    },
    async deleteChat(uid, chatId) {
      chats.delete(`${uid}/${chatId}`)
      msgs.delete(`${uid}/${chatId}`)
    },
    async listMessages(uid, chatId, { limit = 200 } = {}) { return (msgs.get(`${uid}/${chatId}`) || []).slice(-limit) },
    async addTurn(uid, chatId, turn) {
      const list = msgs.get(`${uid}/${chatId}`) || []
      turn.forEach(m => list.push({ id: id(), role: m.role, text: m.text, triage: m.triage || null, sources: m.sources || [], createdAt: new Date() }))
      msgs.set(`${uid}/${chatId}`, list)
      const c = chats.get(`${uid}/${chatId}`)
      if (c) { c.messageCount += 1; c.updatedAt = new Date() }
    },
    async logSafetyEvent(event) { safety.push({ ...event, createdAt: new Date() }) },
    async deleteUserData(uid, rateLimitBuckets = []) {
      users.delete(uid)
      for (const key of [...chats.keys()]) if (key.startsWith(`${uid}/`)) { chats.delete(key); msgs.delete(key) }
      for (let i = safety.length - 1; i >= 0; i--) if (safety[i].uid === uid) safety.splice(i, 1)
      rateLimitBuckets.forEach(b => limits.delete(b))
    },
    async hitRateLimit(bucket, limit, windowMs) {
      const now = Date.now()
      const d = limits.get(bucket)
      if (!d || now - d.start >= windowMs) {
        limits.set(bucket, { count: 1, start: now })
        return { ok: true, remaining: limit - 1 }
      }
      if (d.count >= limit) return { ok: false, retryAfter: Math.ceil((d.start + windowMs - now) / 1000) }
      d.count += 1
      return { ok: true, remaining: limit - d.count }
    },
  }
}

let instance = null

export function getStore() {
  if (instance) return instance
  const memory = process.env.DEV_MEMORY_STORE === '1' && !process.env.VERCEL
  instance = memory ? memoryStore() : firestoreStore()
  return instance
}

// Tests swap in a fresh memory store
export function resetMemoryStore() {
  instance = memoryStore()
  return instance
}
