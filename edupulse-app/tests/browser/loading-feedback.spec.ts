import { test } from '@playwright/test'
import { providerLoading, recordLoading, directoryLoading, pulseLoading, modalLoading, systemLoading } from '../loading-feedback-fixture'
test('saved providers and API test show pending feedback and recover', async ({ page }) => { await providerLoading(page) })
test('academic page and notification popover load together', async ({ page }) => { await recordLoading(page) })
test('student directory waits for actual results', async ({ page }) => { await directoryLoading(page) })
test('Pulse uses dots while waiting and respects reduced motion', async ({ page }) => { await pulseLoading(page) })
test('approved upload waits for the real file read and parser', async ({ page }) => { await modalLoading(page) })
test('system console waits for account counts and service checks', async ({ page }) => { await systemLoading(page) })
