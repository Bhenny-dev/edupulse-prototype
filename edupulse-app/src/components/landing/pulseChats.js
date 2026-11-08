import { Ban, BellRing, BookOpen, CheckCircle2, FileText, GraduationCap, Presentation, Quote, ShieldCheck, ShieldX } from 'lucide-react'

// Sample exchanges with Pulse, told in keywords: the request, what Pulse checked, a short reply
// with what to do next, and the outcome. Illustrations only, never live AI output.
export const CHATS = {
  student: {
    view: 'Student view', viewIcon: GraduationCap,
    ask: 'Quiz 2 answers, please.',
    checks: [
      { icon: ShieldX, tone: 'block', name: 'Guardian', state: 'Assessment rule' },
      { icon: BookOpen, tone: 'hint', name: 'Week 4 reading', state: 'Unopened' },
    ],
    reply: 'I can’t give answers. Start with Week 4?',
    actions: [{ icon: BookOpen, label: 'Open Week 4' }, { icon: BellRing, label: 'Remind me' }],
    outcome: { icon: Ban, tone: 'block', label: 'Declined · appropriate use' },
  },
  instructor: {
    view: 'Instructor view', viewIcon: Presentation,
    ask: 'Draft Week 3 notes.',
    checks: [
      { icon: ShieldCheck, tone: 'pass', name: 'Guardian', state: 'Allowed' },
      { icon: FileText, tone: 'hint', name: 'Syllabus · Week 3', state: 'Found' },
    ],
    reply: 'Draft ready, every line cited.',
    actions: [{ icon: Quote, label: '3 sources' }, { icon: CheckCircle2, label: 'Review' }],
    outcome: { icon: FileText, tone: 'pass', label: 'Draft · waits for you' },
  },
}
