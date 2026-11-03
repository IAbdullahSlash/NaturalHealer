// Load every API route the way Vercel's runtime does, which refuses require() of an
// ES module. Run with: node --no-experimental-require-module scripts/check-api-load.mjs
// A dependency that only loads under newer local Node (as jwks-rsa 4 did) fails here
// instead of crashing every route after a deploy.
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../api/', import.meta.url))
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (name.endsWith('.js')) files.push(path)
  }
}
walk(root)

let failed = 0
for (const file of files) {
  try {
    const mod = await import(pathToFileURL(file).href)
    if (typeof mod.default !== 'function') throw new Error('no default handler export')
    console.log(`ok    ${file.slice(root.length)}`)
  } catch (err) {
    failed++
    console.error(`FAIL  ${file.slice(root.length)}: ${err.code || ''} ${err.message.split('\n')[0]}`)
  }
}
// firebase-admin loads its token checker lazily; load it too
try {
  await import('firebase-admin/auth')
  await import('firebase-admin/firestore')
} catch (err) {
  failed++
  console.error(`FAIL  firebase-admin: ${err.code || ''} ${err.message.split('\n')[0]}`)
}
if (failed) process.exit(1)
console.log(`All ${files.length} API routes load under Vercel's module rules.`)
