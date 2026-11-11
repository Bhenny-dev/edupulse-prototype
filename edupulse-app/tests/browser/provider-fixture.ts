import type { Page } from '@playwright/test'
type SavedConnection = { provider: string; model: string; source: string; expiresAt: string | null; testedAt?: string }
export async function providerFixture(page: Page, baselineOverride?: Record<string, unknown>) {
  const baseline = baselineOverride || await (await page.request.get('/api/ai?action=health')).json()
  let connection: SavedConnection | null = null
  const saved = new Map<string, SavedConnection>()
  const summaries = () => [...saved.values()].map(item => ({ ...item, active: item.provider === connection?.provider }))
  let failTest = false, catalogUnavailable = false
  const models = [{ id: 'gpt-6.1-terra', name: 'gpt-6.1-terra' }, { id: 'gpt-6-luna', name: 'gpt-6-luna' }]
  const modelsFor = (provider?: string) => provider === 'anthropic' ? [{ id: 'claude-synthetic', name: 'Claude (synthetic fixture)' }] : provider === 'gemini' ? [{ id: 'gemini-synthetic', name: 'Gemini (synthetic fixture)' }] : models
  await page.route('**/api/ai?*', async route => {
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
      const previous = saved.get(input.provider)
      if (input.apiKey === 'synthetic-rejected-key') return route.fulfill({ status: 400, json: { error: { code: 'PROVIDER_AUTH', message: 'The provider rejected this key or model permission.' } } })
      connection = { provider: input.provider, model: input.model || previous?.model || modelsFor(input.provider)[0].id, source: 'personal', expiresAt: null, ...(!input.apiKey && (!input.model || input.model === previous?.model) ? { testedAt: previous?.testedAt } : {}) }
      saved.set(connection.provider, connection)
      catalogUnavailable = false
    } else if (route.request().method() === 'DELETE') {
      const query = new URL(route.request().url()).searchParams
      if (query.get('sessionOnly') !== 'true') {
        const provider = query.get('provider') || connection?.provider
        if (provider) saved.delete(provider)
        if (provider === connection?.provider) connection = null
      }
    }
    return route.fulfill({ json: { connection, connections: summaries(), models: connection && !catalogUnavailable ? modelsFor(connection.provider) : [], ...(catalogUnavailable ? { warning: 'OpenRouter authorized and saved. Models could not be loaded. Use Refresh models to retry; no need to authorize again.' } : {}) } })
  })
  return { failNextTest(value = true) { failTest = value }, authorize(provider = 'openrouter', outage = false) { catalogUnavailable = outage; connection = { provider, model: outage ? '' : models[0].id, source: 'personal', expiresAt: null }; saved.set(provider, connection); return { connection, models: outage ? [] : models, ...(outage ? { warning: 'OpenRouter authorized and saved. Models could not be loaded. Use Refresh models to retry; no need to authorize again.' } : {}) } } }
}
