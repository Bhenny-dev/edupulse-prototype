import { defineConfig } from '@playwright/test'
import snapshots from './playwright.snapshots.config'
const port = process.env.SNAPSHOT_WEB_PORT || '5251'
process.env.SNAPSHOT_UI_ONLY = '1'
// Use only with UI fixture suites. Native SQL/API behavior is verified independently.
export default defineConfig({ ...snapshots, use: { ...snapshots.use, baseURL: `http://127.0.0.1:${port}` }, webServer: { command: `node node_modules/vite/bin/vite.js preview --outDir dist-capture --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 60000 } })
