import { defineAgent } from './defineAgent'

// Records — FLOW_SPEC Phase 0. Dean and Associate Dean share one role
// ('admin') with identical permissions, so this agent has a single greeting
// rather than branching per persona.
export default defineAgent({
  id: 'records',
  zone: 'records',
  label: 'Records',
  roles: ['admin'],
  greeting: () => "Need to import files from EduSuite, or check on blocks and rosters?",
  intents: [
    {
      key: 'import', label: 'Import files from EduSuite',
      steps: [
        { title: 'Pick the file type', body: 'Course records, course loads, or student rosters (blocks) — each has its own template.' },
        { title: 'Upload the export', body: 'Drop the CSV exported from EduSuite. EduPulse never syncs live with EduSuite — this is a manual file handoff each time data changes.' },
        { title: 'Review the parsed rows', body: 'Anything malformed is flagged and reported, not silently dropped.' },
        { title: 'Confirm the import', body: 'Once confirmed, the records are available across EduPulse — course loading, syllabus building, and block rosters.' },
      ],
    },
    {
      key: 'sections', label: 'Check on blocks and rosters',
      steps: [
        { title: 'Open Blocks & Rosters', body: 'Every block imported from EduSuite — up to 35 students each, first come first served.' },
        { title: 'View a block\'s roster or enlisted courses', body: 'Both come straight from the EduSuite export; EduPulse never creates or edits them here.' },
        { title: 'Need a change?', body: 'Re-export from EduSuite with the correction, then re-import — that\'s the only path.' },
      ],
    },
  ],
})
