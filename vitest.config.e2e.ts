import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/e2e/dashboard-ink/**/*.e2e.{js,ts,tsx}'],
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    forceExit: true,
  },
  resolve: {
    alias: {
      // Match Jest's moduleNameMapper: strip .js from relative imports
      // This is needed because the source uses .js extensions in imports
      // but vitest resolves them as ESM
    },
  },
})
