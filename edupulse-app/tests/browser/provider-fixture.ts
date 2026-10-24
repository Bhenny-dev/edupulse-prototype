import type { Page } from '@playwright/test'
export async function providerFixture(page: Page) {
  const baseline = await (await page.request.get('/api/ai?action=health')).json()
  let connection: { provider: string; model: string; source: string; expiresAt: string } | null = null
  const models = [{ id: 'gpt-4.1-mini', name: 'gpt-4.1-mini' }, { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' }]
  await page.route('**/api/ai?action=*', async route => {
    const action = new URL(route.request().url()).searchParams.get('action')
    if (action === 'health') return route.fulfill({ json: { ...baseline, ready: Boolean(connection), provider: connection?.provider || 'none', model: connection?.model || null, connection, message: connection ? 'Model connection verified. Ready for conversation, drafting and document help.' : 'Connect a provider to use generation.' } })
    if (action !== 'providers') return route.fallback()
    if (route.request().method() === 'POST') {
      const input = route.request().postDataJSON()
      if (input.apiKey === 'synthetic-rejected-key') return route.fulfill({ status: 400, json: { error: { code: 'PROVIDER_AUTH', message: 'The provider rejected this key or model permission.' } } })
      connection = { provider: input.provider, model: input.model || connection?.model || models[0].id, source: 'personal', expiresAt: '2026-10-31T00:00:00.000Z' }
    } else if (route.request().method() === 'DELETE') connection = null
    return route.fulfill({ json: { connection, models: connection ? models : [] } })
  })
  return { authorize(provider = 'openrouter') { connection = { provider, model: models[0].id, source: 'personal', expiresAt: '2026-10-31T00:00:00.000Z' }; return { connection, models } } }
}
