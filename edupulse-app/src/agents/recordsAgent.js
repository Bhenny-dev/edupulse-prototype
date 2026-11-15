import { defineAgent } from './defineAgent'

// Records — FLOW_SPEC Phase 0. Dean and Program Coordinator have distinct
// identities and share the same academic records station.
export default defineAgent({
  id: 'records',
  zone: 'records',
  label: 'Records',
  roles: ['dean', 'associate_dean'],
  greeting: () => "This Records view uses sample data. Want to preview the EduSuite upload flow or inspect the example blocks and class lists?",
  intents: [
    {key:'courses',label:'Review course activity',roles:['dean','associate_dean'],steps:[]},
    {key:'instructors',label:'Review instructor activity',roles:['dean','associate_dean'],steps:[]},
    {
      key: 'import', label: 'Upload an EduSuite file', roles: ['dean', 'associate_dean'],
      steps: [
        { title: 'Choose what to upload', body: 'Course loads on the Course page, or the student list on the Students page.' },
        { title: 'Review the plan', body: 'Matches, irregular students and rows that cannot be placed are shown with the reason.' },
        { title: 'Confirm the upload', body: 'Confirming saves shared records and the matching class lists. Nothing is saved before that.' },
      ],
    },
    {
      key: 'sections', label: 'Check on blocks and class lists',
      steps: [
        { title: 'Open Blocks & Class Lists', body: 'This tab illustrates the intended block and class-list view with sample records.' },
        { title: 'View an example block', body: 'Its class list and enlisted courses are examples, not verified EduSuite imports.' },
        { title: 'Need a change?', body: 'Re-export from EduSuite with the correction, then re-import — that\'s the only path.' },
      ],
    },
  ],
})
