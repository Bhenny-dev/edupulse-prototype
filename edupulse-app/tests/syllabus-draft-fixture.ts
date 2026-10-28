// Synthetic transport data for UI regression checks, never a production fallback.
export const researchMethodsDraft = {
  programOutcomes: ['Formulate a research question and design an ethical investigation.'],
  courseOutline: Array.from({ length: 18 }, (_, index) => ({
    week: index + 1,
    ilos: index === 8 || index === 17 ? '' : 'Evaluate research questions and justify an appropriate method.',
    contents: index === 8 || index === 17 ? [] : [index === 0 ? 'Research questions and evidence' : `Research methods workshop ${index + 1}`],
    activities: index === 8 || index === 17 ? '' : 'Critique a sample research question with a partner.',
    assessments: index === 8 ? 'Midterm Examination' : index === 17 ? 'Final Examination' : 'Submit a question and a justified study design.',
    teachingMaterials: index === 8 || index === 17 ? [] : ['Case Studies'],
    assessmentTypes: index === 8 || index === 17 ? [] : ['Short Essays'],
  })),
  courseRequirements: ['Proposed for instructor review: research proposal and methods portfolio.'],
  gradingSystem: 'Pending approved institutional grading formula.',
  coursePolicy: ['Proposed for instructor review: protect participant privacy and cite source material.'],
  books: [],
  onlineReferences: [{ title: 'Research methods — sample retrieved source', url: 'https://en.wikipedia.org/wiki/Research' }],
}
