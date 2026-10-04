import { defineAgent } from './defineAgent'

// Records — FLOW_SPEC Phase 0. Dean and Associate Dean have distinct
// identities and share the same academic records station.
export default defineAgent({
  id: 'records',
  zone: 'records',
  label: 'Records',
  roles: ['dean', 'associate_dean'],
  greeting: () => "This Records view uses sample data. Want to preview the EduSuite import flow or inspect the example blocks and class lists?",
  intents: [
    {
      key: 'import', label: 'Import files from EduSuite',
      steps: [
        { title: 'Pick the file type', body: 'Course records, course loads, or student class lists (blocks) — each has its own template.' },
        { title: 'Upload the export', body: 'Drop the CSV exported from EduSuite. EduPulse never syncs live with EduSuite — this is a manual file handoff each time data changes.' },
        { title: 'Review the parsed rows', body: 'Anything malformed is flagged and reported, not silently dropped.' },
        { title: 'Review the preview result', body: 'The current import control updates only this page’s preview history. It does not persist records or update course loading, syllabi, or class lists. Use EduSuite as the institutional source of truth.' },
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
