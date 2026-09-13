import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser', timeout: 30000, retries: 0, workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'node scripts/dev.mjs', url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI, timeout: 60000, env: { AI_PROVIDER: 'retrieval', AI_DATA_DIR: '.data/browser-tests', AI_PORT: '3002', VITE_PORT: '5174' } },
})
