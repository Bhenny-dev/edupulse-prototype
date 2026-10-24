import type { Page } from '@playwright/test'
export async function providerFixture(page: Page) {
  const baseline = await (await page.request.get('/api/ai?action=health')).json()
  let connection: { provider: string; model: string; source: string; expiresAt: string; testedAt?: string } | null = null
  let failTest = false, catalogUnavailable = false
  const models = [{ id: 'gpt-4.1-mini', name: 'gpt-4.1-mini' }, { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' }]
  await page.route('**/api/ai?action=*', async route => {
    const action = new URL(route.request().url()).searchParams.get('action')
    if (action === 'health') return route.fulfill({ json: { ...baseline, ready: Boolean(connection?.model), provider: connection?.provider || 'none', model: connection?.model || null, connection, message: connection?.testedAt ? 'The selected model answered a generation request. Provider limits can still change; retest if a prompt fails.' : connection?.model ? 'Credential saved and model listed. Generation has not been tested. Use Test selected model to check inference access and quota.' : connection ? 'Credential saved. Choose a model or use Refresh models to finish setup.' : 'Connect a provider to use generation.' } })
    if (action === 'provider-test') {
      if (failTest) {
        if (connection) delete connection.testedAt
        return route.fulfill({ status: 400, json: { error: { code: 'MODEL_NOT_AVAILABLE', message: 'The selected model is unavailable for this account or API route. Refresh models, choose another model and use Test selected model.' } } })
      }
      if (connection) connection.testedAt = '2026-10-24T12:00:00.000Z'
      return route.fulfill({ json: { tested: true, connection } })
    }
    if (action !== 'providers') return route.fallback()
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON()
      if (input.apiKey === 'synthetic-rejected-key') return route.fulfill({ status: 400, json: { error: { code: 'PROVIDER_AUTH', message: 'The provider rejected this key or model permission.' } } })
      connection = { provider: input.provider, model: input.model || connection?.model || models[0].id, source: 'personal', expiresAt: '2026-10-31T00:00:00.000Z', ...(!input.apiKey && (!input.model || input.model === connection?.model) ? { testedAt: connection?.testedAt } : {}) }
      catalogUnavailable = false
    } else if (route.request().method() === 'DELETE') connection = null
    return route.fulfill({ json: { connection, models: connection && !catalogUnavailable ? models : [], ...(catalogUnavailable ? { warning: 'OpenRouter authorized and saved. Models could not be loaded. Use Refresh models to retry; no need to authorize again.' } : {}) } })
  })
  return { failNextTest(value = true) { failTest = value }, authorize(provider = 'openrouter', outage = false) { catalogUnavailable = outage; connection = { provider, model: outage ? '' : models[0].id, source: 'personal', expiresAt: '2026-10-31T00:00:00.000Z' }; return { connection, models: outage ? [] : models, ...(outage ? { warning: 'OpenRouter authorized and saved. Models could not be loaded. Use Refresh models to retry; no need to authorize again.' } : {}) } } }
}
