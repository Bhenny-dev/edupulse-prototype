// Syllabus lifecycle (FLOW_SPEC Phase 2). The signatory chain — Dean review →
// CAO approval → EVP noting — happens OUTSIDE the system on the downloaded
// file; EduPulse only tracks which station the syllabus is at. `active` means
// the approved file was uploaded back and Section 5 (Course Outline) was
// extracted, which unlocks courseware generation.
export const SYLLABUS_STATUS_META = {
  drafted: { label: 'Drafted', badge: 'drafted', step: 1, hint: 'AI or instructor draft — needs the instructor\'s check before anything else can happen.' },
  checked: { label: 'Checked', badge: 'checked', step: 2, hint: 'Instructor-verified. Ready to download for the signatory route.' },
  downloaded_for_approval: { label: 'Out for Approval', badge: 'out_for_approval', step: 3, hint: 'Downloaded file is routing offline: Dean review → CAO approval → EVP noting.' },
  approved_uploaded: { label: 'Approved — Uploaded', badge: 'approved', step: 4, hint: 'Approved file uploaded. Extract the Course Outline to activate it.' },
  active: { label: 'Active', badge: 'active', step: 5, hint: 'Course Outline extracted — this syllabus now drives courseware generation and monitoring.' },
}
export const SYLLABUS_STATUS_ORDER = ['drafted', 'checked', 'downloaded_for_approval', 'approved_uploaded', 'active']
