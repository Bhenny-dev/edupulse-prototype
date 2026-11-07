import { z } from 'zod'
import { config } from './config.js'
import { ApiError, type Identity } from './contracts.js'
import { localDb, userDb } from './database.js'
import { connectionSchema, readConnection, sealProviderState, unsealProviderState, type Connection, type ProviderName } from './connections.js'

type Stored = { provider: ProviderName; ciphertext: string | null; active: boolean }
const failure = () => new ApiError(503, 'CONNECTION_STORAGE_UNAVAILABLE', 'Saved AI connections could not be loaded. Retry when the account connection is restored; do not reconnect yet.')
const persistent = (identity: Identity) => Boolean(identity.token || identity.local)
export async function saveProvider(identity: Identity, connection: Connection, activate = true, importOnly = false): Promise<Connection> {
  if (connection.owner !== identity.id) throw new ApiError(403, 'FORBIDDEN', 'A provider connection belongs only to its account.')
  if (!persistent(identity)) return connection
  // EduPulse retention has no artificial seven-day expiry. Provider revocation,
  // key expiry and explicit Disconnect still take effect at the provider/store.
  const saved = { ...connection, expires: Number.MAX_SAFE_INTEGER }
  const ciphertext = sealProviderState({ purpose: 'account-provider-v1', connection: saved })
  if (config().database === 'local') {
    const db = await localDb()
    await db.transaction(async tx => {
      if (importOnly && (await tx.query('SELECT 1 FROM ep_provider_connections WHERE owner_id=$1 LIMIT 1', [identity.id])).rows.length) return
      if (activate) await tx.query('UPDATE ep_provider_connections SET active=false WHERE owner_id=$1 AND active', [identity.id])
      if (activate) await tx.query(`INSERT INTO ep_provider_connections(owner_id,provider,ciphertext,connection_id,active) VALUES($1,$2,$3,$4,true) ON CONFLICT(owner_id,provider) DO UPDATE SET ciphertext=excluded.ciphertext,connection_id=excluded.connection_id,active=true,updated_at=now()`, [identity.id, saved.provider, ciphertext, saved.id])
      else await tx.query('UPDATE ep_provider_connections SET ciphertext=$3,updated_at=now() WHERE owner_id=$1 AND provider=$2 AND connection_id=$4 AND ciphertext IS NOT NULL', [identity.id, saved.provider, ciphertext, saved.id])
    })
  } else {
    const { error } = await userDb(identity).rpc(importOnly ? 'edupulse_import_provider' : 'edupulse_save_provider', { provider_name: saved.provider, protected_value: ciphertext, saved_id: saved.id, ...(!importOnly ? { activate } : {}) })
    if (error) throw failure()
  }
  return saved
}
async function storedProviders(identity: Identity): Promise<Stored[]> {
  if (!persistent(identity)) return []
  let rows: Stored[]
  if (config().database === 'local') rows = (await (await localDb()).query<Stored>('SELECT provider,ciphertext,active FROM ep_provider_connections WHERE owner_id=$1 ORDER BY provider', [identity.id])).rows
  else {
    const { data, error } = await userDb(identity).from('edupulse_provider_connections').select('provider,ciphertext,active').eq('owner_id', identity.id).order('provider')
    if (error) throw failure()
    rows = data || []
  }
  return rows
}
function decodeProviders(identity: Identity, rows: Stored[]): { connection: Connection; active: boolean }[] {
  return rows.filter((row): row is Stored & { ciphertext: string } => row.ciphertext !== null).map(row => {
    try {
      const envelope = z.object({ purpose: z.literal('account-provider-v1'), connection: connectionSchema }).strict().parse(unsealProviderState(row.ciphertext, 6000))
      if (envelope.connection.owner !== identity.id || envelope.connection.provider !== row.provider) throw failure()
      return { connection: envelope.connection, active: row.active }
    } catch { throw failure() }
  })
}
export async function loadProviders(identity: Identity) {
  return decodeProviders(identity, await storedProviders(identity))
}
export async function resolveProvider(request: Request, identity: Identity) {
  if (!persistent(identity)) return readConnection(request, identity)
  const rows = await storedProviders(identity)
  // A non-secret disconnect marker also prevents another device's old cookie
  // from importing a credential the account has explicitly removed.
  if (rows.length) return decodeProviders(identity, rows).find(row => row.active)?.connection
  const legacy = readConnection(request, identity)
  if (!legacy) return undefined
  await saveProvider(identity, legacy, true, true)
  return (await loadProviders(identity)).find(row => row.active)?.connection
}
export async function removeProvider(identity: Identity, provider?: ProviderName) {
  if (!persistent(identity)) return
  if (config().database === 'local') {
    const db = await localDb()
    await db.transaction(async tx => {
      if (provider) await tx.query('INSERT INTO ep_provider_connections(owner_id,provider,ciphertext,active) VALUES($1,$2,NULL,false) ON CONFLICT(owner_id,provider) DO UPDATE SET ciphertext=NULL,connection_id=NULL,active=false,updated_at=now()', [identity.id, provider])
      else await tx.query('UPDATE ep_provider_connections SET ciphertext=NULL,connection_id=NULL,active=false,updated_at=now() WHERE owner_id=$1', [identity.id])
    })
  } else {
    const { error } = await userDb(identity).rpc('edupulse_disconnect_provider', { provider_name: provider || null })
    if (error) throw failure()
  }
}
