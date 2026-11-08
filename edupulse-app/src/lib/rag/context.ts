import type { ChatInput } from '../../../server/contracts.js'
import type { AgentDeps, Evidence } from './types.js'
import { planRequest } from './plan.js'

export type PreparedChatContext = { input: ChatInput; evidence: Evidence[]; warnings: string[]; privateContext: boolean }
/** Both inference runtimes use identical record provenance and public-search boundaries. */
export function contextualDeps(prepared: PreparedChatContext, base: AgentDeps): AgentDeps {
  const { input } = prepared
  return { ...base,
    search: async (query, options, abort) => {
      const found = await base.search(query, options, abort)
      return { ...found, evidence: [...(!input.documentIds.length && input.grounding !== 'sources' ? prepared.evidence : []), ...found.evidence] }
    },
    webSearch: async (query, abort) => {
      if (prepared.privateContext && !['draft','references'].includes(planRequest(input).task) || /@|\b\d{4}-\d-\d{4}\b/.test(query)) return { evidence: [], warning: 'Private account questions are answered from authorized EduPulse records, without sending account information to public search.' }
      return base.webSearch ? base.webSearch(query, abort) : { evidence: [], warning: 'Public search is unavailable. No live Internet verification is claimed.' }
    },
  }
}
