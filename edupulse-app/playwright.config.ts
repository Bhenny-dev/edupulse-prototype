import { defineConfig, devices } from '@playwright/test'

// Ports, data and output folders can be overridden so parallel runs (other
// agents, CI jobs) never share a server or delete each other's artifacts.
const web = process.env.PW_WEB_PORT || '5174', api = process.env.PW_API_PORT || '3002'
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, retries: 0, workers: 1,
  reporter: 'list', outputDir: process.env.PW_OUTPUT_DIR || 'test-results',
  use: { baseURL: `http://127.0.0.1:${web}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'node scripts/dev.mjs', url: `http://127.0.0.1:${web}/api/ai?action=health`, reuseExistingServer: !process.env.CI, timeout: 60000, env: { AI_PROVIDER: 'retrieval', AI_DATA_DIR: process.env.PW_DATA_DIR || '.data/browser-tests', AI_PORT: api, VITE_PORT: web } },
})
