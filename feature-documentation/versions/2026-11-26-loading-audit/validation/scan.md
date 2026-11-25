# Scan findings

Method: enumerate every JSX/TSX file, inventory async/promise work and pending flags, inspect pending button branches and status text, trace shared/parent feedback and inspect every Suspense fallback. Imported loaders alone are not accepted as evidence that each pending surface has feedback. The operational inventory stays under ignored `.data/loading-audit-20261126`.

| Area | Gaps corrected |
|---|---|
| Dean / Program Coordinator | Account, course, block, student-list, term and import saves; initial teaching-package reads; course/student/academic file reads; shared confirmation feedback. |
| Instructor / Admin support | Class-code changes, invitations, announcement save/delete, roster saves, schedules, teaching edits/revision/move, submission-bin changes, file attachments/downloads and source inspection. |
| Student | Class lookup/join and invitation startup, class startup, assessment start, practice list/generation/submission, reading confirmations, comments and work submission. |
| Shared Pulse and authentication | Password sign-in, conversation history/read, model/connection selection, edit/roster proposals, lazy office opening and waiting desk status. |
| Lazy dialogs | Instructor's null class fallback, student's text-only class fallback, QR and office fallbacks. |

Existing provider, file extraction/OCR, knowledge-library, support-account, page/workspace, directory, document/PDF and system-console feedback was reviewed and retained. The generation form already presents its shared LoadingStatus; its button's separate text branch is not another missing animation. Voice already uses dots or a voice meter. Clipboard-only/instant UI interactions, passive image decoding, GSAP scene preparation, hidden save journals and recorded reading/progress values are not blocking loading surfaces. Context providers delegate visible feedback to their consuming views.

No account, role, enrollment, publication, grading, provider, payment or reload authorization is changed. Loading states follow existing requests. Added practice/file-read flags expose real work and settle on error/abort; no timer fabricates progress or reloads an already loaded page.

Changed presentation files (40):

- `edupulse-app/src/components/academic/AcademicLibrary.jsx`
- `edupulse-app/src/components/academic/AcademicPerformance.jsx`
- `edupulse-app/src/components/academic/AcademicPortal.jsx`
- `edupulse-app/src/components/academic/AcademicRecords.jsx`
- `edupulse-app/src/components/academic/DeanAccountDialog.jsx`
- `edupulse-app/src/components/academic/DeanBlockSectionDialog.jsx`
- `edupulse-app/src/components/academic/DeanCatalogActions.jsx`
- `edupulse-app/src/components/academic/DeanClassListImport.jsx`
- `edupulse-app/src/components/academic/DeanCommon.jsx`
- `edupulse-app/src/components/academic/DeanCourseAssignment.jsx`
- `edupulse-app/src/components/academic/DeanCourses.jsx`
- `edupulse-app/src/components/academic/DeanStudents.jsx`
- `edupulse-app/src/components/academic/DeanTermCalendar.jsx`
- `edupulse-app/src/components/academic/JoinClassDialog.jsx`
- `edupulse-app/src/components/academic/MonitoringRoster.jsx`
- `edupulse-app/src/components/academic/StudentHome.jsx`
- `edupulse-app/src/components/academic/StudentPractice.jsx`
- `edupulse-app/src/components/academic/TeachingLoadImport.jsx`
- `edupulse-app/src/components/auth/LoginPanel.jsx`
- `edupulse-app/src/components/classroom/ClassCodes.jsx`
- `edupulse-app/src/components/classroom/ClassStream.jsx`
- `edupulse-app/src/components/classroom/InstructorHome.jsx`
- `edupulse-app/src/components/classroom/LinkAttachments.jsx`
- `edupulse-app/src/components/classroom/TopicWorkPanel.jsx`
- `edupulse-app/src/components/courseware/AssessmentEditor.jsx`
- `edupulse-app/src/components/courseware/CourseBlockSections.jsx`
- `edupulse-app/src/components/courseware/CourseTopicWeeks.jsx`
- `edupulse-app/src/components/courseware/DocumentViewer.jsx`
- `edupulse-app/src/components/courseware/OriginalDocument.jsx`
- `edupulse-app/src/components/courseware/SourcePassageInspector.jsx`
- `edupulse-app/src/components/courseware/TeachingAttachments.jsx`
- `edupulse-app/src/components/courseware/TeachingFileAttachment.jsx`
- `edupulse-app/src/components/pulse/Pulse.jsx`
- `edupulse-app/src/components/pulse/PulseModelPicker.jsx`
- `edupulse-app/src/components/pulse/PulseSessions.jsx`
- `edupulse-app/src/components/pulse/PulseToolActions.jsx`
- `edupulse-app/src/components/pulse/office/WorkspaceOffice.jsx`
- `edupulse-app/src/components/syllabus/SharedSyllabusRepository.jsx`
- `edupulse-app/src/pages/ClassInvitation.jsx`

- `edupulse-app/src/components/ui/LoadingSkeleton.css`

Lazy class feedback uses a fixed status panel so it stays visible above long Home grids without adding a temporary modal focus layer.
