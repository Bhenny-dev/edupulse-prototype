import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { localDb, userDb } from '../database.js'
import { config } from '../config.js'
import { conversationLocalSchema } from './conversationSchema.js'

const storedMessage = z.object({ id: z.string().uuid(), role: z.enum(['user', 'assistant']), text: z.string().max(20000), attachments: z.array(z.string().max(255)).max(3).default([]), kind: z.enum(['chat', 'action', 'receipt', 'error']).default('chat') }).strict()
export const conversationCommand = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('create'), id: z.string().uuid(), title: z.string().trim().min(1).max(160) }).strict(),
  z.object({ operation: z.literal('append'), id: z.string().uuid(), messages: z.array(storedMessage).min(1).max(20) }).strict(),
  z.object({ operation: z.literal('archive'), id: z.string().uuid(), archived: z.boolean() }).strict(),
  z.object({ operation: z.literal('delete'), id: z.string().uuid() }).strict(),
  z.object({ operation: z.literal('remember'), text: z.string().trim().min(3).max(500) }).strict(),
  z.object({ operation: z.literal('forget'), id: z.string().uuid() }).strict(),
  z.object({ operation: z.literal('preferences'), automaticMemory: z.boolean() }).strict(),
])
type Command = z.infer<typeof conversationCommand>
type Message = z.infer<typeof storedMessage> & { thread_id?: string; created_at?: string }
type Thread = { id: string; title: string; archived: boolean; updated_at: string }
type Memory = { id: string; text: string; source_message_id: string | null; created_at: string }
const tables = { threads: 'edupulse_pulse_threads', messages: 'edupulse_pulse_messages', memories: 'edupulse_pulse_memories', preferences: 'edupulse_pulse_preferences' }
const local = () => config().database === 'local'
const initialized = new WeakMap<object, Promise<unknown>>()
async function db() {
  const pg = await localDb()
  if (!initialized.has(pg)) initialized.set(pg, pg.exec(conversationLocalSchema).catch(error => { initialized.delete(pg); throw error }))
  await initialized.get(pg)
  return pg
}
function authorized(identity: Identity) { if (identity.role === 'guest') throw new ApiError(401, 'SIGN_IN_REQUIRED', 'Sign in to save or recall private conversations.') }
function unavailable(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error && error.code === '54000' && 'message' in error && String(error.message).includes('500 messages')) throw new ApiError(409, 'CONVERSATION_FULL', 'This conversation is full. Continue in a new conversation.')
  if (error && typeof error === 'object' && 'code' in error && error.code === '54000') throw new ApiError(409, 'CONVERSATION_CAPACITY', 'Private history capacity reached. Delete an old conversation or preference, then retry.')
  if (error) throw new ApiError(503, 'CONVERSATIONS_UNAVAILABLE', 'Private conversation storage is unavailable. Your open conversation is retained; retry without closing it.')
}

/** Redact obvious pasted credentials before database archival. Do not infer memories from files or model text. */
export function redactConversation(text: string) {
  return text.replace(/\b(?:sk-(?:proj-|ant-api\d*-)?[A-Za-z0-9_-]{16,}|sk-or-v1-[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9_-]+)\b/g, '[credential redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~-]{16,}/gi, 'Bearer [redacted]')
    .replace(/((?:api[_ -]?key|password|access[_ -]?token)\s*[:=]\s*)\S+/gi, '$1[redacted]')
}
export function safeMemory(text: string) {
  return redactConversation(text) === text && !/@|\b(?:students?|learners?|rosters?|class\s*lists?|password|secret|token|api\s*key|diagnosis|bank|credit\s*card|grades?|scores?)\b/i.test(text)
}
export function preferenceCandidate(text: string) {
  const explicit = text.match(/^\s*(?:please\s+)?remember\s+(?:that\s+)?((?:I\b|my preferred\b).{3,490})[.!]?$/i)?.[1]?.trim()
  const format = /\b(?:I prefer|please always|always use|please use)\b/i.test(text) && /\b(?:bullet|concise|detailed|plain language|English|Filipino|Tagalog|Cebuano|format|examples|step.by.step)\b/i.test(text) ? text.trim().slice(0, 500) : null
  const value = explicit || format
  return value && safeMemory(value) ? value : null
}
async function threadOwned(identity: Identity, id: string) {
  if (local()) { if (!(await (await db()).query('SELECT id FROM ep_pulse_threads WHERE id=$1 AND owner_id=$2', [id, identity.id])).rows.length) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'This conversation is unavailable for your account.') }
  else { const { data, error } = await userDb(identity).from(tables.threads).select('id').eq('id', id).maybeSingle(); unavailable(error); if (!data) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'This conversation is unavailable for your account.') }
}
export async function readConversations(identity: Identity, id?: string | null) {
  authorized(identity)
  if (id && !z.string().uuid().safeParse(id).success) throw new ApiError(400, 'INVALID_INPUT', 'Invalid conversation identifier.')
  if (id) await threadOwned(identity, id)
  if (local()) {
    const pg = await db()
    const threads = (await pg.query<Thread>('SELECT id,title,archived,updated_at FROM ep_pulse_threads WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 100', [identity.id])).rows
    const memories = (await pg.query<Memory>('SELECT id,text,source_message_id,created_at FROM ep_pulse_memories WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100', [identity.id])).rows
    const preferences = (await pg.query<{ automatic_memory: boolean }>('SELECT automatic_memory FROM ep_pulse_preferences WHERE owner_id=$1', [identity.id])).rows[0]
    const messages = id ? (await pg.query<Message>('SELECT id,role,text,attachments,kind,created_at FROM ep_pulse_messages WHERE owner_id=$1 AND thread_id=$2 ORDER BY sequence DESC LIMIT 100', [identity.id, id])).rows.reverse() : []
    return { threads, memories, messages, automaticMemory: preferences?.automatic_memory ?? true, mode: 'local' }
  }
  const client = userDb(identity)
  const [threads, memories, preferences, messages] = await Promise.all([
    client.from(tables.threads).select('id,title,archived,updated_at').order('updated_at', { ascending: false }).limit(100),
    client.from(tables.memories).select('id,text,source_message_id,created_at').order('created_at', { ascending: false }).limit(100),
    client.from(tables.preferences).select('automatic_memory').maybeSingle(),
    id ? client.from(tables.messages).select('id,role,text,attachments,kind,created_at').eq('thread_id', id).order('sequence', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
  ])
  for (const result of [threads, memories, preferences, messages]) unavailable(result.error)
  return { threads: threads.data || [], memories: memories.data || [], messages: (messages.data || []).reverse(), automaticMemory: preferences.data?.automatic_memory ?? true, mode: 'cloud' }
}

async function remember(identity: Identity, text: string, source?: string) {
  if (!safeMemory(text)) throw new ApiError(400, 'MEMORY_SENSITIVE', 'Keep credentials and sensitive student or personal records out of reusable memory. They can stay in authorized records instead.')
  const id = randomUUID()
  if (local()) {
    const pg = await db()
    try { await pg.query('INSERT INTO ep_pulse_memories(id,owner_id,text,source_message_id) VALUES($1,$2,$3,$4) ON CONFLICT(owner_id,text) DO NOTHING', [id, identity.id, text, source || null]) } catch (error) { unavailable(error) }
  } else { const { error } = await userDb(identity).from(tables.memories).upsert({ id, owner_id: identity.id, text, source_message_id: source || null }, { onConflict: 'owner_id,text', ignoreDuplicates: true }); unavailable(error) }
}
export async function executeConversation(identity: Identity, command: Command) {
  authorized(identity)
  const client = !local() ? userDb(identity) : null
  if (command.operation === 'remember') { await remember(identity, command.text); return { saved: true } }
  if (command.operation === 'preferences') {
    if (local()) await (await db()).query('INSERT INTO ep_pulse_preferences(owner_id,automatic_memory) VALUES($1,$2) ON CONFLICT(owner_id) DO UPDATE SET automatic_memory=EXCLUDED.automatic_memory', [identity.id, command.automaticMemory])
    else unavailable((await client!.from(tables.preferences).upsert({ owner_id: identity.id, automatic_memory: command.automaticMemory })).error)
    return { saved: true }
  }
  if (command.operation === 'forget') {
    if (local()) await (await db()).query('DELETE FROM ep_pulse_memories WHERE id=$1 AND owner_id=$2', [command.id, identity.id])
    else unavailable((await client!.from(tables.memories).delete().eq('id', command.id)).error)
    return { deleted: true }
  }
  if (command.operation === 'create') {
    if (local()) { try { await (await db()).query('INSERT INTO ep_pulse_threads(id,owner_id,title) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING', [command.id, identity.id, redactConversation(command.title)]) } catch(error) { unavailable(error) } }
    else unavailable((await client!.from(tables.threads).upsert({ id: command.id, owner_id: identity.id, title: redactConversation(command.title) }, { onConflict: 'id', ignoreDuplicates: true })).error)
    await threadOwned(identity, command.id)
    return { id: command.id }
  }
  await threadOwned(identity, command.id)
  if (command.operation === 'archive' || command.operation === 'delete') {
    if (local()) await (await db()).query(command.operation === 'delete' ? 'DELETE FROM ep_pulse_threads WHERE id=$1 AND owner_id=$2' : 'UPDATE ep_pulse_threads SET archived=$3,updated_at=now() WHERE id=$1 AND owner_id=$2', command.operation === 'delete' ? [command.id, identity.id] : [command.id, identity.id, command.archived])
    else unavailable((await (command.operation === 'delete' ? client!.from(tables.threads).delete().eq('id', command.id) : client!.from(tables.threads).update({ archived: command.archived, updated_at: new Date().toISOString() }).eq('id', command.id))).error)
    return { saved: true }
  }
  const messages = command.messages.map(message => ({ ...message, text: redactConversation(message.text), attachments: message.attachments.map(redactConversation) }))
  if (local()) {
    const pg = await db()
    await pg.transaction(async tx => {
      for (const message of messages) await tx.query('INSERT INTO ep_pulse_messages(id,thread_id,owner_id,role,text,attachments,kind) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT(id) DO NOTHING', [message.id, command.id, identity.id, message.role, message.text, JSON.stringify(message.attachments), message.kind])
      await tx.query('UPDATE ep_pulse_threads SET updated_at=now() WHERE id=$1 AND owner_id=$2', [command.id, identity.id])
    }).catch(unavailable)
  } else {
    unavailable((await client!.from(tables.messages).upsert(messages.map(message => ({ ...message, thread_id: command.id, owner_id: identity.id })), { onConflict: 'id', ignoreDuplicates: true })).error)
    unavailable((await client!.from(tables.threads).update({ updated_at: new Date().toISOString() }).eq('id', command.id)).error)
  }
  const preferences = await readConversations(identity)
  for (const message of messages.filter(message => message.role === 'user')) {
    const candidate = preferenceCandidate(message.text)
    if (candidate && preferences.memories.length < 100 && (preferences.automaticMemory || /^\s*(please\s+)?remember\b/i.test(message.text))) await remember(identity, candidate, message.id)
  }
  return { saved: true, messages: messages.length }
}

/** Recalled transcripts are evidence with provenance, never instructions or authorization. */
export async function conversationRecall(identity: Identity, query: string, threadId?: string) {
  if (identity.role === 'guest') return { memories: [], matches: [] }
  if (threadId && !z.string().uuid().safeParse(threadId).success) throw new ApiError(400, 'INVALID_INPUT', 'Invalid conversation identifier.')
  const { memories } = await readConversations(identity)
  const words = query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)?.filter(word => !['what', 'when', 'where', 'remember', 'recall', 'previous', 'conversation', 'about', 'that', 'this', 'from', 'please', 'have', 'were', 'did', 'you', 'our', 'the', 'and', 'last', 'time', 'chat', 'session', 'discussed', 'before', 'earlier', 'said', 'tell', 'can', 'could'].includes(word)).slice(0, 6) || []
  let matches: { id: string; text: string; role: string; thread_id: string; created_at: string }[] = []
  if (words.length && /\b(remember|recall|previous|earlier|last\s+(?:time|chat|session)|discussed|before)\b/i.test(query)) {
    if (local()) {
      matches = (await (await db()).query<typeof matches[number]>(`SELECT id,text,role,thread_id,created_at FROM ep_pulse_messages WHERE owner_id=$1 AND ($3::uuid IS NULL OR thread_id<>$3) AND to_tsvector('simple',text) @@ websearch_to_tsquery('simple',$2) ORDER BY ts_rank(to_tsvector('simple',text),websearch_to_tsquery('simple',$2)) DESC,sequence DESC LIMIT 5`, [identity.id, words.join(' OR '), threadId || null])).rows
    } else { const { data, error } = await userDb(identity).rpc('edupulse_recall_pulse', { query_text: words.join(' OR '), excluded_thread: threadId || null }); unavailable(error); matches = data || [] }
  }
  return { memories: memories.slice(0, 12), matches: matches.map(message => ({ ...message, text: message.text.slice(0, 1500) })) }
}
