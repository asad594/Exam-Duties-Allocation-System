import { defineConfig } from '@playwright/test'

// End-to-end tests run against the real API (port 5080) through the Vite dev server (port 5173).
// Start both first; tests run one at a time because they share one database.
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'msedge',
    headless: true,
    screenshot: 'only-on-failure',
  },
})
