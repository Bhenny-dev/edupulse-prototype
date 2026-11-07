import { defineConfig } from '@playwright/test'
import browser from './playwright.config'
const port = process.env.PW_WEB_PORT || '5248'
// Browser speech/provider transports are synthetic; backend adapters have real handler tests.
export default defineConfig({ ...browser, testMatch: 'voice-quota.spec.ts', use: { ...browser.use, baseURL: `http://127.0.0.1:${port}` }, webServer: { command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 60000 } })
