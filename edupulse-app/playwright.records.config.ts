import { defineConfig } from '@playwright/test'
import voice from './playwright.voice.config'
export default defineConfig({ ...voice, testMatch: 'automatic-records.spec.ts', outputDir: '.data/records-browser-results' })
