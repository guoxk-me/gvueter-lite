import { defineConfig, devices } from '@playwright/test';

// AI modified: exercise both serving paths; production checks never reuse a dev server.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: { trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  projects: [
    {
      name: 'examples',
      testMatch: 'contacts.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4175' },
    },
    {
      name: 'development',
      testMatch: 'foundation.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173' },
    },
    {
      name: 'production',
      testMatch: 'foundation.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: [
    {
      command: 'GVUETER_E2E=1 vp run dev:examples --host 127.0.0.1 --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175/examples/contacts/',
      reuseExistingServer: false,
    },
    {
      command: 'GVUETER_E2E=1 vp run dev --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
    {
      command: 'vp run preview --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: false,
    },
  ],
});
