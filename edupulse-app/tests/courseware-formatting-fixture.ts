import type { Page } from '@playwright/test'
import { baselineUI, baselineWorkspace } from './baseline-fixture'

// Saved content and evaluation are synthetic UI examples, not a model evaluation.
export const formattedBody = `**Network foundations** connect devices so they can share information. A **router** connects networks, while a *switch* connects devices within one network. Use a descriptive name such as \`lab_network\`.

### Small network
• **Router:** connect the classroom network to another network.
• **Switch:** connect the classroom devices.

1. Identify the devices in the example.
2. Explain how a message reaches its destination.

| Device | Role |
| --- | --- |
| **Router** | Connects networks |
| Switch | Connects local devices |

\`\`\`text
• This is a literal code example.
**Keep these markers inside code.**
\`\`\``

export const formattingMetadata = {
  provider: 'Synthetic fixture', model: 'Saved content example', requestId: 'synthetic-formatting-example',
  coverage: { coverage: .96, method: 'semantic+lexical', items: [
    { kind: 'topic', text: 'Network foundations', status: 'covered', matchedIn: 'material' },
    { kind: 'outcome', text: 'Explain network device roles', status: 'partial', matchedIn: 'material' },
  ] },
  verification: { supported: 2, total: 3 }, answerKey: { checked: 3, consistent: 3, issues: [] },
  sources: [{ id: 'synthetic-reference', title: 'Synthetic classroom reference', text: 'A router connects networks. A switch connects devices within a network.' }],
}

export const formattedMaterial = {
  title: 'Network foundations', subtitle: 'AI draft — instructor review required',
  sections: [{ heading: 'Concepts', body: formattedBody }, { heading: 'References', body: 'Synthetic classroom reference — supplied for this display example.' }],
  ai: formattingMetadata,
}

export async function coursewareFormattingUI(page: Page) {
  const fixture = await baselineUI(page)
  const workspace = structuredClone(baselineWorkspace)
  const quiz = workspace.content['baseline-quiz']
  fixture.setWorkspace({ ...workspace, content: {
    ...workspace.content,
    'baseline-quiz': { ...quiz, content: { ...quiz.content, ai: {
      ...formattingMetadata,
      coverage: { coverage: .96, method: 'semantic+lexical', items: [
        { kind: 'topic', text: 'Variables', status: 'covered', matchedIn: 'assessment' },
        { kind: 'outcome', text: 'Explain and apply programming concepts', status: 'partial', matchedIn: 'assessment' },
      ] },
      sources: [{ id: 'synthetic-programming-reference', title: 'Synthetic programming reference', text: 'Variables name stored values. Functions group reusable instructions.' }],
    } } },
    'formatted-material': { syllabusId: 'baseline-syllabus', week: 2, type: 'material', status: 'draft', title: formattedMaterial.title, content: structuredClone(formattedMaterial) },
    'formatted-activity': { syllabusId: 'baseline-syllabus', week: 3, type: 'activity', status: 'draft', title: 'Network practice', content: { ...structuredClone(formattedMaterial), title: 'Network practice' } },
  } })
  return fixture
}

export async function openFormattingWeek(page: Page, week = 2) {
  await page.goto(`/#/courseware?tab=builder&course=baseline-syllabus&week=${week}`)
  await page.locator(`[data-week="${week}"] [data-content-id]`).getByRole('button', { name: 'View', exact: true }).click()
}
