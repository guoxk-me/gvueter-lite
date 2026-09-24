import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCi = process.env.CI !== undefined && process.env.CI !== ''

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: 'html',
  // AI modified: keep browser test settings without starting the removed app.
  use: {
    trace: 'on-first-retry',
    headless: isCi,
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
})
