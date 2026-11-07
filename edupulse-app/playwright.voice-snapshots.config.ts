import { defineConfig } from '@playwright/test'
import snapshots from './playwright.snapshots.config'
const port = process.env.SNAPSHOT_WEB_PORT || '5249'
export default defineConfig({ ...snapshots, projects: snapshots.projects?.map(project => ({ ...project, testMatch: project.name === 'mobile' ? /voice-quota.mobile.spec.ts/ : /voice-quota.spec.ts/ })), use: { ...snapshots.use, baseURL: `http://127.0.0.1:${port}` }, webServer: { command: `node node_modules/vite/bin/vite.js preview --outDir dist-capture --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 60000 } })
