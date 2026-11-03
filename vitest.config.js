import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

// Browser-side tests (the server's own tests run under node --test)
export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
  },
}))
