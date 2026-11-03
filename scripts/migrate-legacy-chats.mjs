// One-off: copy chats saved by the old client code into the API's layout.
//
//   old  Users/{uid}/Chats/{chatId}/messages/{id}  { userMessage, aiResponse, timestamp }
//   new  users/{uid}/chats/{chatId}/messages/{id}  { role, text, triage, createdAt }  (one doc per message)
//
// Safe to run more than once: chats that already exist in the new place are skipped.
// The old documents are left untouched; delete them yourself once you have checked the copy.
//
//   npm run migrate:chats            dry run, prints what it would copy
//   npm run migrate:chats -- --write copy for real

import { Timestamp } from '@google-cloud/firestore'
import { adminDb } from '../server/lib/firebaseAdmin.js'

const write = process.argv.includes('--write')
const db = adminDb()

const legacyUsers = await db.collection('Users').listDocuments()
let copied = 0
let skipped = 0

for (const userRef of legacyUsers) {
  const chats = await userRef.collection('Chats').get()
  for (const chat of chats.docs) {
    const target = db.collection('users').doc(userRef.id).collection('chats').doc(chat.id)
    if ((await target.get()).exists) { skipped++; continue }

    const pairs = await chat.ref.collection('messages').orderBy('timestamp', 'asc').get()
    if (pairs.empty) { skipped++; continue }

    const data = chat.data()
    console.log(`${write ? 'copy' : 'would copy'} ${userRef.id}/${chat.id} "${data.title}" (${pairs.size} turns)`)
    if (!write) { copied++; continue }

    const batch = db.batch()
    batch.set(target, {
      title: data.title || 'Conversation',
      conditionId: null,
      messageCount: pairs.size,
      createdAt: data.createdAt || Timestamp.now(),
      updatedAt: data.updatedAt || Timestamp.now(),
    })
    pairs.docs.forEach((p, i) => {
      const d = p.data()
      const at = (d.timestamp?.toMillis?.() ?? Date.now()) + i * 2
      batch.set(target.collection('messages').doc(), { role: 'user', text: d.userMessage || '', triage: null, createdAt: Timestamp.fromMillis(at) })
      batch.set(target.collection('messages').doc(), { role: 'assistant', text: d.aiResponse || '', triage: null, createdAt: Timestamp.fromMillis(at + 1) })
    })
    await batch.commit()
    copied++
  }
}

console.log(`\n${write ? 'Copied' : 'Would copy'} ${copied} chat(s); skipped ${skipped}.${write ? '' : ' Run again with --write to copy.'}`)
