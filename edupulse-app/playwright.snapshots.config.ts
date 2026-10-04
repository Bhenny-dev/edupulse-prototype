import { defineConfig, devices } from '@playwright/test'

// Documentation snapshots: the production build with real models and real documents.
// Run with `npm run snapshots` (builds dist-capture first); generation uses the local Ollama model in SNAPSHOT_MODEL.
const web = process.env.SNAPSHOT_WEB_PORT || '5186', api = process.env.SNAPSHOT_API_PORT || '3016'
export default defineConfig({
  testDir: './tests/snapshots', timeout: 600_000, retries: 0, workers: 1, reporter: 'list', outputDir: '.data/snapshot-results',
  use: { baseURL: `http://127.0.0.1:${web}`, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, testIgnore: /mobile/ },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' }, testMatch: /mobile/ },
  ],
  webServer: {
    command: 'node scripts/serve-preview.mjs', url: `http://127.0.0.1:${web}/api/ai?action=health`, reuseExistingServer: !process.env.CI, timeout: 120_000,
    env: { AI_PROVIDER: 'ollama', OLLAMA_MODEL: process.env.SNAPSHOT_MODEL || 'qwen2.5:1.5b', AI_ONNX_THREADS: '1', AI_DATA_DIR: '.data/snapshots-db', AI_PORT: api, VITE_PORT: web },
  },
})
