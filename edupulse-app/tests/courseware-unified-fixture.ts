import type { Page } from '@playwright/test'
import { baselineUI, baselineWorkspace } from './baseline-fixture'

export function unifiedWorkspace() {
  const base = structuredClone(baselineWorkspace)
  const first = base.syllabi[0]
  const outline = first.courseOutline.map((row, i) => ({ ...row, contents: [['Variables'], ['Functions'], ['Arrays']][i] }))
  const exam = { week: 9, contents: [], ilos: '', activities: '', assessments: 'Midterm Examination' }
  const syllabus = { ...first, courseOutline: [...outline, exam] }
  return { ...base, syllabi: [syllabus, { ...structuredClone(syllabus), id: 'empty-course', courseCode: 'IT 103', courseTitle: 'Programming Lab' }], content: {
    'baseline-quiz': { ...base.content['baseline-quiz'], title: 'Variables quiz', status: 'published' },
    'unified-material': { syllabusId: first.id, week: 1, type: 'material', status: 'draft', title: 'Variables lesson', content: { title: 'Variables lesson', sections: [{ heading: 'Concepts', body: 'A **variable** names a stored value.\nUse a descriptive name.' }] } },
    'unified-activity': { syllabusId: first.id, week: 1, type: 'activity', status: 'checked', title: 'Variables practice', content: { title: 'Variables practice', sections: [{ heading: 'Practice', body: 'Declare and explain a variable for a learner name.' }] } },
  } }
}

export async function unifiedCoursewareUI(page: Page) {
  const fixture = await baselineUI(page)
  fixture.setWorkspace(unifiedWorkspace())
  return fixture
}

export function generatedWeek(week: number) {
  return { requestId: `synthetic-week-${week}`, provider: 'Synthetic transport', model: 'Saved UI fixture', sources: [], trace: [], coverage:{items:[],coverage:0,method:'lexical'},verification:{claims:[],supported:0,unsupported:0,corroborated:0,invalidCitations:[],groundedness:null,citationAccuracy:null,method:'lexical'},answerKey:{checked:0,consistent:0,issues:[]}, content: {
    material: { title: `Week ${week} learning material`, sections: [{ heading: 'Concepts', body: 'A **function** groups reusable instructions. Explain its inputs, steps and result.' }, { heading: 'Practice', body: 'Write a function that adds two values, then check its result.' }] },
    activity: { title: `Week ${week} activity`, sections: [{ heading: 'Task', body: '1. Read the example.\n2. Write and test your own function.' }] },
    assessment: { title: `Week ${week} assessment`, questions: [1, 2, 3].map((n, i) => ({ text: `Synthetic question ${n}`, options: ['A', 'B', 'C', 'D'], correctIndex: i, explanation: 'Check this synthetic question against the course reference.' })) },
  } }
}
