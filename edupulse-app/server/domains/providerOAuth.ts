import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { config } from '../config.js'
import { connectionCookie, createConnection, publicConnection, sealProviderState, unsealProviderState } from '../connections.js'

export const providerOAuthInput = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('start'), provider: z.literal('openrouter') }).strict(),
  z.object({ operation: z.literal('complete'), code: z.string().min(1).max(2048), state: z.string().min(32).max(128) }).strict(),
])
const pendingSchema = z.object({ owner: z.string(), origin: z.string().url(), state: z.string(), verifier: z.string(), expires: z.number() }).strict()
const cookieName = () => config().hosted ? '__Host-edupulse-provider-oauth' : 'edupulse-provider-oauth'

export async function providerOAuth(request: Request, identity: Identity, input: z.infer<typeof providerOAuthInput>) {
  if (identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to EduPulse before authorizing a provider.')
  const origin = new URL(request.url).origin
  if (input.operation === 'start') {
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url')
    const pending = { owner: identity.id, origin, state, verifier, expires: Date.now() + 600000 }
    const authorization = new URL('https://openrouter.ai/auth')
    authorization.search = new URLSearchParams({ callback_url: `${origin}/?provider_callback=openrouter`, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', key_label: 'EduPulse' }).toString()
    return { body: { authorizationUrl: authorization.href }, cookie: `${cookieName()}=${sealProviderState(pending)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=600${config().hosted ? '; Secure' : ''}` }
  }
  let pending: z.infer<typeof pendingSchema>
  try {
    const token = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName()}=`))?.slice(cookieName().length + 1)
    pending = pendingSchema.parse(unsealProviderState(token || ''))
    const actual = Buffer.from(input.state), expected = Buffer.from(pending.state)
    if (pending.owner !== identity.id || pending.origin !== origin || pending.expires <= Date.now() || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Mismatched authorization')
  } catch { throw new ApiError(400, 'OAUTH_STATE_INVALID', 'This authorization expired or belongs to another session. Start Connect with OpenRouter again.') }
  let response: Response
  try {
    response = await fetch('https://openrouter.ai/api/v1/auth/keys', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: input.code, code_verifier: pending.verifier, code_challenge_method: 'S256' }) })
  } catch { throw new ApiError(502, 'OAUTH_UNAVAILABLE', 'OpenRouter could not be reached. Your previous connection is unchanged.') }
  if (!response.ok) throw new ApiError(400, 'OAUTH_EXCHANGE_FAILED', 'OpenRouter could not authorize this code. Start the connection again; your previous connection is unchanged.')
  const parsed = z.object({ key: z.string().min(8).max(1024) }).safeParse(await response.json())
  if (!parsed.success) throw new ApiError(502, 'OAUTH_EXCHANGE_FAILED', 'OpenRouter did not return a usable credential.')
  const result = await createConnection({ provider: 'openrouter', apiKey: parsed.data.key }, identity)
  return { body: { connection: publicConnection(result.connection), models: result.models }, cookie: connectionCookie(result.connection) }
}
