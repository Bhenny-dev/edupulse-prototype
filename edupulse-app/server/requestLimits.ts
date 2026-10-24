import { ApiError, type Identity } from './contracts.js'
import { userDb } from './database.js'

export async function changeLease(identity: Identity, lease: string, release = false) {
  const { data, error } = await userDb(identity).rpc('edupulse_ai_lease', { lease, release })
  if (error) throw new ApiError(503, 'REQUEST_LIMIT_UNAVAILABLE', 'The shared request limit is unavailable. Retry when the connection is restored.')
  if (!release && data !== true) throw new ApiError(429, 'RATE_LIMIT', 'Wait for the current request to finish, then retry. Limit: 20 requests per minute per account.')
}
