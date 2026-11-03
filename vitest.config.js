import { defineConfig } from 'vitest/config'

// Browser-side tests (the server's own tests run under node --test)
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
  },
})
