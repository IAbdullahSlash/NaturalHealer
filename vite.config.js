import { defineConfig } from 'vite'
import { diseases } from './src/data/diseases.js'
import { herbs } from './src/data/knowledge/herbs.js'
import enrichment from './src/data/knowledge/enrichment.js'
import compounds from './src/data/knowledge/compounds.js'
import { conditionCodes } from './src/data/knowledge/conditionCodes.js'

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
  define: { __KB_STATS__: JSON.stringify(kbStats) },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
})
