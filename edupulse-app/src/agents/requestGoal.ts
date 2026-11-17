import { contentGenerationRequest, explicitWebRequest, webTopic } from '../lib/systemChatPolicy'
import { accountRequest, pageFor } from './operator'

/**
 * The goal of one Pulse request, decided before anything runs. Each goal names the route that
 * handles it, so a request goes to the fastest correct tool: an application action, System Search,
 * the public web, or a model only for content that has to be written.
 */
export type GoalKind = 'files' | 'remember' | 'recall' | 'web-search' | 'open-account' | 'navigate' | 'guide' | 'draft' | 'answer'
export type Goal = { kind: GoalKind; route: 'app' | 'memory' | 'web' | 'model' | 'system-search'; label: string; topic?: string }

export const REMEMBER = /^\s*(?:please\s+)?remember\s+(?:that\s+|I\s+)/i
export const RECALL = /\b(?:recall|previous\s+(?:chat|session|conversation)|last\s+(?:time|chat|session)|remember\s+(?:our|what|my)|what\s+(?:did|have)\s+we\s+discuss)\b/i
const GUIDE = /\b(?:guide|walkthrough|walk\s+me|step.by.step|help\s+me)\b/i

type GoalContext = { attachments?: number; role?: string; canSwitchRoles?: boolean; editor?: boolean; task?: string }

export function requestGoal(message: string, { attachments = 0, role = 'guest', canSwitchRoles = false, editor = false, task = 'auto' }: GoalContext = {}): Goal {
  const text = message.trim()
  if (attachments) return { kind: 'files', route: 'app', label: `Working with your attached file${attachments === 1 ? '' : 's'}` }
  if (REMEMBER.test(text)) return { kind: 'remember', route: 'memory', label: 'Saving your preference' }
  if (RECALL.test(text)) return { kind: 'recall', route: 'memory', label: 'Checking your earlier conversations' }
  if (explicitWebRequest(text)) {
    const topic = webTopic(text)
    return { kind: 'web-search', route: 'web', label: topic ? `Searching the Internet for “${topic}”` : 'Searching the Internet', ...(topic ? { topic } : {}) }
  }
  const account = accountRequest(text)
  if (account) return { kind: 'open-account', route: 'app', label: `Finding the account of ${account.name}` }
  const page = pageFor(text, role === 'admin' && canSwitchRoles ? 'instructor' : role, { canSwitchRoles })
  if (page) return page.denied
    ? { kind: 'navigate', route: 'app', label: `Checking access to ${page.label}` }
    : { kind: GUIDE.test(text) ? 'guide' : 'navigate', route: 'app', label: `Opening ${page.label}` }
  if (contentGenerationRequest(text, task, editor)) return { kind: 'draft', route: 'model', label: editor ? 'Preparing the change for the open form' : 'Preparing educational content' }
  return { kind: 'answer', route: 'system-search', label: 'Searching EduPulse' }
}
