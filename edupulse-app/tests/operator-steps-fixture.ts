// Synthetic model/research output for the reported course; never a generation fallback.
export const popularCulturePrompt = 'can you complete the sections based on the course that ived selected in course information. search the internet for your reference to complete'
const topics = ['Popular culture and critical reading', 'Colonial histories and cultural exchange', 'Print, comics and everyday narratives', 'Radio, television and mass audiences', 'Philippine cinema and representation', 'Popular music and identity', 'Language, humor and public discourse', 'Food, consumption and social difference', 'Sport and collective identity', 'Religion and popular practice', 'Fashion, advertising and consumer culture', 'Social media and platform culture', 'Fandom and participatory communities', 'Festivals, tourism and cultural ownership', 'Community media case study', 'Critical cultural analysis portfolio']
export const popularCultureDraft = {
  programOutcomes: ['Analyze representations in Philippine popular media using contextual evidence.'],
  courseRequirements: ['Proposed for instructor review: media analysis portfolio and a documented community case study.'],
  coursePolicy: ['Proposed for instructor review: identify sources and obtain consent for community interviews.'],
  gradingSystem: 'Pending approved institutional grading formula.', books: [],
  onlineReferences: [{ title: 'Sample retrieved cultural source', url: 'https://ncca.gov.ph/' }],
  courseOutline: Array.from({ length: 18 }, (_, i) => {
    const week = i + 1, exam = week === 9 || week === 18
    const topic = topics[i < 8 ? i : i - 1]
    return { week, ilos: exam ? '' : `Analyze ${topic.toLowerCase()} using contextual evidence.`, contents: exam ? [] : [topic], activities: exam ? '' : 'Compare two media artifacts and identify their audiences, assumptions and social context.', assessments: week === 9 ? 'Midterm Examination' : week === 18 ? 'Final Examination' : 'Submit an evidence-based comparison with cited examples.', teachingMaterials: exam ? [] : ['Case Studies'], assessmentTypes: exam ? [] : ['Short Essays'], resources: [] }
  }),
}
export const popularCultureEditor = {
  instance: 'popular-culture-test', kind: 'syllabus' as const, label: 'GE ELEC-PPC syllabus builder',
  data: { courseCode: 'GE ELEC-PPC', courseTitle: 'Philippine Popular Culture', courseDescription: 'Study of cultural trends and their societal impact.',
    programOutcomes: [''], courseOutline: popularCultureDraft.courseOutline.map(row => ({ ...row, ilos: '', contents: /Examination/.test(row.assessments) ? row.contents : [''], activities: '', teachingMaterials: [], assessmentTypes: [], assessments: /Examination/.test(row.assessments) ? row.assessments : '' })) },
}
export function popularCultureStage(prompt: string) {
  const task = JSON.parse(prompt)
  const draft = { ...popularCultureDraft, courseOutline: popularCultureDraft.courseOutline.filter(row => task.editor.data.courseOutline?.some((old: { week: number }) => old.week === row.week)) }
  return Object.fromEntries((task.requestedFields as (keyof typeof draft)[]).map(field => [field, draft[field]]))
}
