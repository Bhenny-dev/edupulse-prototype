import { ApiError, type ChatInput, type CourseInput, type Identity } from './contracts.js'
import { invokeModel } from './providers.js'
import { serverConnection, type Connection } from './connections.js'
import { embedTexts } from './ml/onnx.js'
import { hybridSearch, rerank, similarityMatrix } from './rag/search.js'
import { findReferences } from './external/references.js'
import { runAgents } from '../src/lib/rag/agents.js'
import { draftCoursewareAgents } from '../src/lib/rag/courseware.js'
import type { AgentDeps, Generate } from '../src/lib/rag/types.js'
export { validateCitations } from '../src/lib/rag/verify.js'

/** Real server dependencies for the agents: hybrid search, cross-encoder, embeddings and open catalogs. */
export function serverDeps(identity: Identity, connection: Connection | undefined, generate?: Generate): AgentDeps {
  return {
    search: (query, options, signal) => hybridSearch(identity, query, { documentIds: options.documentIds }, signal),
    rerank, similarity: similarityMatrix,
    references: (topic, signal) => findReferences(topic, signal, embedTexts),
    generate: generate || (connection ? (system, prompt, signal, json) => invokeModel(system, prompt, signal, json, connection) : undefined),
    provider: connection?.provider || (generate ? 'model' : 'retrieval'), model: connection?.model || null,
  }
}

export async function runChat(input: ChatInput, identity: Identity, signal: AbortSignal, deps?: AgentDeps, connection = serverConnection()) {
  return runAgents(input, identity, signal, deps || serverDeps(identity, connection))
}

export async function runCourseware(input: CourseInput, identity: Identity, signal: AbortSignal, generate?: Generate, connection: Connection | undefined = serverConnection(), personal = false, deps?: Partial<AgentDeps>) {
  if (!['instructor', 'admin'].includes(identity.role) && !(identity.role === 'guest' && personal)) throw new ApiError(403, 'FORBIDDEN', 'Courseware generation requires an instructor account or your own preview connection.')
  const base = { ...serverDeps(identity, connection, generate), ...deps }
  if (!base.generate) throw new ApiError(503, 'MODEL_UNAVAILABLE', 'Connect a provider or enable the free on-device model in AI settings.')
  return draftCoursewareAgents(input, signal, { ...base, generate: base.generate })
}
