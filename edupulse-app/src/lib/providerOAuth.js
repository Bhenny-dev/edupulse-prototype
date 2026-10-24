export const PROVIDER_CALLBACK_PATH = '/auth/provider/openrouter'
const PENDING_KEY = 'edupulse-provider-authorization'

/** The marker contains only a random state identifier, never a key or PKCE verifier.
 * @param {string} authorizationUrl
 * @param {Storage} [storage]
 */
export function rememberProviderAuthorization(authorizationUrl, storage) {
  const url = new URL(authorizationUrl)
  if (url.origin !== 'https://openrouter.ai' || url.pathname !== '/auth' || !url.searchParams.get('state')) throw new Error('Invalid provider authorization address.')
  try { (storage || window.sessionStorage).setItem(PENDING_KEY, JSON.stringify({ state: url.searchParams.get('state'), expires: Date.now() + 600000 })) } catch { /* The dedicated callback also works without this optional marker. */ }
}
/** @param {URL} url @param {Storage} [storage] */
export function providerAuthorizationReturn(url, storage) {
  let pending
  try { pending = JSON.parse((storage || window.sessionStorage).getItem(PENDING_KEY) || 'null') } catch { /* A dedicated callback does not depend on browser storage. */ }
  const dedicated = url.pathname === PROVIDER_CALLBACK_PATH
  const legacy = url.searchParams.get('provider_callback') === 'openrouter'
  const pendingReturn = pending?.expires > Date.now() && url.searchParams.has('code') && url.searchParams.get('state') === pending.state
  if (!dedicated && !legacy && !pendingReturn) return null
  return { code: url.searchParams.get('code'), state: url.searchParams.get('state'), error: url.searchParams.get('error') }
}
/** @param {Storage} [storage] */
export function clearProviderAuthorization(storage) {
  try { (storage || window.sessionStorage).removeItem(PENDING_KEY) } catch { /* Optional browser marker; server state remains authoritative. */ }
}
