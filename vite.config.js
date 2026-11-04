import { defineConfig } from 'vite'
import { diseases } from './src/data/diseases.js'
import { herbs } from './src/data/knowledge/herbs.js'
import enrichment from './src/data/knowledge/enrichment.js'
import compounds from './src/data/knowledge/compounds.js'
import { conditionCodes } from './src/data/knowledge/conditionCodes.js'
import { EVIDENCE_LEVELS } from './src/data/knowledge/vocabulary.js'
import { shelfInUse } from './src/data/kitchen.js'

// Knowledge base figures for the landing page, worked out here so the first page
// doesn't have to download the whole knowledge base to show a few numbers
const botany = Object.values(enrichment.herbs)
const kbStats = {
  herbs: herbs.length,
  plants: botany.filter(e => e.botanical).length,
  regionalNames: botany.reduce((n, e) => n + Object.keys(e.wikidata?.labels || {}).length, 0),
  languages: new Set(botany.flatMap(e => Object.keys(e.wikidata?.labels || {}))).size,
  cautions: herbs.reduce((n, h) => n + h.cautions.length, 0),
  interactions: herbs.reduce((n, h) => n + h.interactions.length, 0),
  safetyChecked: herbs.filter(h => h.sources.some(s => /nccih\.nih\.gov|ncbi\.nlm\.nih\.gov/.test(s.url || ''))).length,
  withChemistry: Object.keys(compounds.herbs).length,
  conditions: diseases.length,
  coded: Object.keys(conditionCodes).length,
  reviewed: herbs.filter(h => h.review?.status === 'reviewed').length,
}

// The landing page's herb tray: the first kitchen ingredients that have a herb entry, with
// just what the tray shows. Ten keeps the belt's loop narrow enough to fit a laptop screen.
// The ring colour (tier) follows the evidence level.
const TRAY_SIZE = 10
const EVIDENCE_TIER = Object.fromEntries(Object.keys(EVIDENCE_LEVELS).map((level, i) => [level, i + 1]))
const firstSentence = (text) => (text.match(/^.*?[.!?](\s|$)/)?.[0] || text).trim()
const kbTray = shelfInUse
  .map(item => ({ item, herb: herbs.find(h => h.id === item.id) }))
  .filter(({ herb }) => herb)
  .slice(0, TRAY_SIZE)
  .map(({ item, herb }) => ({
    id: herb.id,
    name: herb.name,
    hindi: herb.hindi,
    latin: herb.latin || herb.english,
    fill: item.fill,
    tier: EVIDENCE_TIER[herb.evidence.level],
    evidence: EVIDENCE_LEVELS[herb.evidence.level].label,
    description: firstSentence(herb.kitchenUse),
    part: herb.part,
    cautions: herb.cautions.length,
    interactions: herb.interactions.length,
    benefits: herb.actions,
    uses: herb.traditionalUses,
    // Library remedies that name this ingredient, with the condition each one is for
    remedies: diseases.flatMap(d => d.remedies.filter(r => item.match.test(r)).map(text => ({ text, condition: d.title, conditionId: d.id }))),
  }))
// Legend lists only the ring colours that are on the tray
const trayLegend = Object.fromEntries(Object.entries(EVIDENCE_TIER)
  .filter(([, tier]) => kbTray.some(h => h.tier === tier))
  .map(([level, tier]) => [tier, EVIDENCE_LEVELS[level].label]))

// Public pages search engines may index. Signed-in pages (/home, /prakriti, /account)
// and the sign-in forms are left out and disallowed in robots.txt.
const SITE_URL = (process.env.SITE_URL || 'https://natural-healer.vercel.app').replace(/\/$/, '')
const publicPaths = [
  '/', '/remedies', '/ingredients', '/herbs', '/about', '/safety', '/privacy', '/terms',
  ...diseases.map(d => `/conditions/${d.id}`),
  ...herbs.map(h => `/herbs/${h.id}`),
]

function seoFiles() {
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      const urls = publicPaths.map(p => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: ['User-agent: *', 'Disallow: /api/', 'Disallow: /home', 'Disallow: /prakriti', 'Disallow: /account', 'Disallow: /login', 'Disallow: /signup', 'Disallow: /forgot-password', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n'),
      })
    },
  }
}

// In development the API runs separately (server/dev.js); Vite forwards /api to it.
export default defineConfig({
  plugins: [seoFiles()],
  define: {
    __KB_STATS__: JSON.stringify(kbStats),
    __KB_TRAY__: JSON.stringify({ items: kbTray, legend: trayLegend }),
  },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
})
