import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e/playwright',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'atlas-cli',
      testDir: './test/e2e/playwright/cli',
    },
  ],
})
