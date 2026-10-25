import { quickReply } from './quickReplies'
/** Fictional personalities; capabilities and activity always come from real application events. */
export const BUDDIES = [
  { id: 'pip', name: 'Pip', title: 'Workspace guide', color: '#20b8e5', station: 'Welcome desk', motto: 'One clear next step.', role: 'I open authorized pages, find the right control and guide you through real form steps. I never skip approval or save a record just because a tour ended.', goals: 'Get you to the correct page and wait for each real step to finish.', habit: 'Collects tiny maps and keeps every pencil pointed north.', agents: ['Planner', 'Navigator', 'Guide'] },
  { id: 'luma', name: 'Luma', title: 'Sources & syllabus', color: '#8b78e6', station: 'Reading room', motto: 'Show me the page.', role: 'I read PDF and Word sources, help map syllabus sections, retrieve library passages and find references. Missing text stays missing until you supply or correct it.', goals: 'Keep every imported section traceable to its file and preserve unrelated work.', habit: 'Color-codes bookmarks and gives every book a little wave.', agents: ['Researcher', 'Ranker', 'Librarian', 'Syllabus'] },
  { id: 'quill', name: 'Quill', title: 'Drafting studio', color: '#f4b04d', station: 'Writing desk', motto: 'Draft boldly. Review carefully.', role: 'I prepare courseware and editable draft proposals from your instructions and available sources. I can revise text, outcomes and questions; an instructor reviews and confirms changes.', goals: 'Produce useful, structured drafts without inventing institutional policies or claiming publication.', habit: 'Thinks best beside a warm mug and a very tidy stack of paper.', agents: ['Writer', 'Corrector'] },
  { id: 'ro', name: 'Ro', title: 'Class-list coordinator', color: '#ed839e', station: 'Records desk', motto: 'The right row, every time.', role: 'I parse authorized class lists, identify exact student rows and prepare merges, replacements, removals or field corrections. You inspect the preview and confirm; I do not invent students.', goals: 'Preserve identities, avoid duplicates and keep newer changes safe.', habit: 'Squares every paper stack before the first sip of coffee.', agents: ['Registrar'] },
  { id: 'sage', name: 'Sage', title: 'Review & safeguards', color: '#59b69a', station: 'Review bench', motto: 'Evidence before confidence.', role: 'I enforce appropriate-use rules, compare sources and check whether citations support claims. Support scores are evidence checks, not a guarantee of truth, grades or authorship.', goals: 'Flag missing support, reject inappropriate assessment help and preserve human review.', habit: 'Keeps a magnifying glass beside a deliberately tiny coffee cup.', agents: ['Guardian', 'Verifier', 'Comparator'] },
  { id: 'milo', name: 'Milo', title: 'Memory keeper', color: '#6b9cdc', station: 'Archive nook', motto: 'Remember usefully. Forget on request.', role: 'I archive private conversations and save recognized non-sensitive preferences from your statements. I recall attributed excerpts and provide review, archive and deletion controls. Files and model replies do not become reusable memory.', goals: 'Keep context private, attributable, limited and easy to delete.', habit: 'Files sticky notes by color, then takes a well-earned tea break.', agents: ['Memory'] },
] as const
export type BuddyId = typeof BUDDIES[number]['id']
export type OfficeTask = { id: string; buddy: BuddyId; label: string; status: 'working' | 'review' | 'done' | 'error' | 'stopped'; detail?: string; at: number }
export function buddyForRequest(message: string, files = false): BuddyId {
  if (/\b(memory|remember|recall|conversation|archive|forget)\b/i.test(message)) return 'milo'
  if (/\b(student|roster|class.?list|enroll|register)\b/i.test(message)) return 'ro'
  if (/\b(open|redirect|navigate|guide|walkthrough|take me|where can)\b/i.test(message)) return 'pip'
  if (/\b(compare|verify|citation|evidence|check sources)\b/i.test(message)) return 'sage'
  if (files || /\b(import|upload|reference|source|library)\b/i.test(message)) return 'luma'
  return 'quill'
}
export function buddyReply(id: BuddyId, question: string, tasks: OfficeTask[]) {
  const buddy = BUDDIES.find(item => item.id === id)!
  const greeting = quickReply(question)
  if (greeting) return { text: `${buddy.motto} ${buddy.name} here. ${greeting}` }
  if (/\b(?:accomplish(?:ed|ments)?|finish(?:ed)?|complet(?:e|ed)|done|history)\b/i.test(question)) {
    const done = tasks.filter(task => task.buddy === id && task.status === 'done')
    return { text: done.length ? `${buddy.name} here. My completed events in this session: ${done.slice(-4).map(task => task.detail || task.label).join(' • ')}. These are recorded results, not a lifetime achievement count.` : `${buddy.name} here. I haven’t recorded a completed task in this session yet. Open conversation history for earlier receipts; I won’t invent achievements.` }
  }
  if (/\b(?:role|job|goals?|how do you|what do you|who are you|personality|coffee|habit|about yourself)\b/i.test(question)) return { text: `${buddy.motto} I’m ${buddy.name}, your ${buddy.title.toLowerCase()}. ${buddy.role} My goal: ${buddy.goals} Office quirk: ${buddy.habit}` }
  const target = buddyForRequest(question)
  return { text: target === id ? `${buddy.motto} I can help with that through Pulse. Let’s prepare the appropriate tool or answer; record changes still need your confirmation.` : `That belongs with ${BUDDIES.find(item => item.id === target)!.name}. I’ll pass the request to their desk; your role and confirmation rules still apply.`, handoff: target, request: question }
}
const waits = {
  pip: ['Pip is finding the right door…', 'Tiny map, clear next step…', 'Keeping the shortcut inside your permissions…'],
  luma: ['Luma has the reading glasses on…', 'Following the paper trail, one page at a time…', 'Bookmarks at the ready; checking your source…'],
  quill: ['Quill is warming up the drafting desk…', 'A little ink, a little thinking…', 'The draft is still brewing. Your changes aren’t saved yet.'],
  ro: ['Ro is lining up the right rows…', 'No mystery students on this clipboard…', 'Checking the list before the stamp comes out…'],
  sage: ['Sage has the evidence board out…', 'Giving the claims a careful once-over…', 'Coffee can wait. Source checks first…'],
  milo: ['Milo is opening your private archive…', 'Looking for your words, not making up memories…', 'Turning the right pages in your history…'],
}
export function loadingLine(buddy: BuddyId, tick: number) { return waits[buddy][tick % waits[buddy].length] }
