import { defineConfig, devices } from '@playwright/test'

const web = '5188', api = '3018'
export default defineConfig({
  testDir: './tests/snapshots', testMatch: /authenticated.spec.ts/, timeout: 120000, workers: 1, retries: 0,
  reporter: [['list'], ['./tests/snapshots/reporter.ts']], outputDir: '.data/authenticated-capture-results',
  use: { baseURL: process.env.SNAPSHOT_AUTH_ORIGIN || `http://127.0.0.1:${web}`, colorScheme: 'light', locale: 'en-US', timezoneId: 'Asia/Manila', trace: 'off' },
  projects: [{ name: 'authenticated-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }],
  webServer: process.env.SNAPSHOT_AUTH_ORIGIN ? undefined : {
    command: 'node scripts/serve-preview.mjs', url: `http://127.0.0.1:${web}/api/ai?action=health`, timeout: 120000,
    env: { AI_PROVIDER: 'retrieval', AI_VECTOR_STORE: 'supabase', AI_LOCAL_MODE: 'false', AI_PORT: api, VITE_PORT: web },
  },
})
