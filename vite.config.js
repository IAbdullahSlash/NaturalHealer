import { defineConfig } from 'vite'
import { diseases } from './src/data/diseases.js'
import { herbs } from './src/data/knowledge/herbs.js'

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
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
})
