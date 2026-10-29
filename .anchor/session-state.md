# Session state (auto-saved — last known reality)

_Updated: 2026-10-29 22:42:22_  ·  branch: `main`

## Uncommitted changes
```
 M edupulse-app/docs/REQUIREMENTS.md
 M edupulse-app/scripts/lib/capture-source.mjs
 M edupulse-app/src/App.jsx
 M edupulse-app/src/agents/editorTools.ts
 M edupulse-app/src/agents/operator.js
 M edupulse-app/src/agents/pageContext.d.ts
 M edupulse-app/src/agents/pageContext.js
 M edupulse-app/src/agents/toolPlanner.ts
 M edupulse-app/src/agents/workTools.d.ts
 M edupulse-app/src/agents/workTools.js
 M edupulse-app/src/components/ai/AgentAnswer.jsx
 M edupulse-app/src/components/courseware/AssessmentEditor.jsx
 M edupulse-app/src/components/courseware/DocumentViewer.jsx
 M edupulse-app/src/components/courseware/PresentationViewer.jsx
 M edupulse-app/src/components/layout/Layout.jsx
 M edupulse-app/src/components/pulse/Pulse.jsx
 M edupulse-app/src/components/pulse/PulseLoading.jsx
 M edupulse-app/src/components/pulse/PulseToolActions.jsx
 M edupulse-app/src/components/pulse/connected-pulse.css
 M edupulse-app/src/components/pulse/targets.js
 D edupulse-app/src/components/ui/KeyboardShortcutsModal.jsx
 M edupulse-app/src/context/WorkspaceContext.jsx
 M edupulse-app/src/pages/HelpSupport.jsx
 M edupulse-app/src/pages/Settings.jsx
 M edupulse-app/src/pages/Syllabus.jsx
 M edupulse-app/tests/browser/baseline-workflows.spec.ts
 M edupulse-app/tests/browser/layout-feedback.spec.ts
 M edupulse-app/tests/browser/ocr.spec.ts
 M edupulse-app/tests/browser/pulse-source-context.spec.ts
 M edupulse-app/tests/browser/pulse-tools.spec.ts
 M edupulse-app/tests/browser/pulse.spec.ts
 M edupulse-app/tests/browser/workflows.spec.ts
 M edupulse-app/tests/browser/workspace-office.spec.ts
 M edupulse-app/tests/snapshots/baseline-workflows.spec.ts
 M edupulse-app/tests/snapshots/capture.spec.ts
 M edupulse-app/tests/snapshots/fixtures.ts
 M edupulse-app/tests/snapshots/interface-captures.ts
 M edupulse-app/tests/snapshots/manual.spec.ts
 M edupulse-app/tests/snapshots/pulse-conversation.spec.ts
 M edupulse-app/tests/snapshots/pulse-drafting.spec.ts
 M edupulse-app/tests/snapshots/pulse-tools.spec.ts
 M edupulse-app/tests/snapshots/walkthrough.spec.ts
 M edupulse-app/tests/snapshots/workspace-office.mobile.spec.ts
 M edupulse-app/tests/snapshots/workspace-office.spec.ts
 M feature-documentation/DOCUMENTATION-POLICY.md
 M feature-documentation/README.md
 M feature-documentation/backend-system/README.md
 M feature-documentation/backend-system/supabase.md
 M feature-documentation/backend-system/vercel.md
 M feature-documentation/capture-runs/image-review.json
 M feature-documentation/doc-map.json
 M feature-documentation/system-manual/01-getting-started/README.md
 M feature-documentation/system-manual/02-syllabus-lifecycle/01-select-course-autofills-section-1.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/02-write-course-outline.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/03-save-as-drafted-button.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/04-my-syllabus-drafted.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/05-marked-as-checked.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/06-downloaded-for-approval.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/07-upload-approved-file-attestation.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/08-approved-file-uploaded.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/09-review-extracted-outline.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/10-active-drives-courseware.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/11-version-history-dialog.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/12-import-preview.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/13-import-error.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/14-pdf-import-preview.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/15-wrapped-pdf-preview.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/16-download-pdf-draft.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/17-mobile-draft-actions.png
 M feature-documentation/system-manual/02-syllabus-lifecycle/README.md
 M feature-documentation/system-manual/03-courseware-generation-and-review/01-courseware-with-active-syllabus.png
 M feature-documentation/system-manual/03-courseware-generation-and-review/02-weekly-outline-ready-to-generate.png
 M feature-documentation/system-manual/03-courseware-generation-and-review/03-generating-with-pulse-thinking.png
 M feature-documentation/system-manual/03-courseware-generation-and-review/04-generated-drafts-for-review.png
 M feature-documentation/system-manual/03-courseware-generation-and-review/05-draft-document-view.png
 M feature-documentation/system-manual/03-courseware-generation-and-review/06-outline-alignment-check.png
 M feature-documentation/system-manual/03-courseware-generation-and-review/README.md
 M feature-documentation/system-manual/04-knowledge-library/01-library-and-drop-zone.png
 M feature-documentation/system-manual/04-knowledge-library/02-extraction-quality-report.png
 M feature-documentation/system-manual/04-knowledge-library/03-review-extracted-text.png
 M feature-documentation/system-manual/04-knowledge-library/04-indexing-stages.png
 M feature-documentation/system-manual/04-knowledge-library/05-indexed-library.png
 M feature-documentation/system-manual/04-knowledge-library/06-pptx-slides-and-notes.png
 M feature-documentation/system-manual/04-knowledge-library/07-rejected-renamed-file.png
 M feature-documentation/system-manual/04-knowledge-library/08-rejected-archive-bomb.png
 M feature-documentation/system-manual/04-knowledge-library/09-instruction-like-text-flagged.png
 M feature-documentation/system-manual/04-knowledge-library/10-scanned-pdf-ocr-offer.png
 M feature-documentation/system-manual/04-knowledge-library/11-ocr-reading-pages.png
 M feature-documentation/system-manual/04-knowledge-library/12-ocr-text-for-review.png
 M feature-documentation/system-manual/04-knowledge-library/13-partly-scanned-pdf.png
 M feature-documentation/system-manual/04-knowledge-library/README.md
 M feature-documentation/system-manual/05-ask-pulse/01-verified-answer.png
 M feature-documentation/system-manual/05-ask-pulse/02-citation-opens-source.png
 M feature-documentation/system-manual/05-ask-pulse/03-agent-timeline.png
 M feature-documentation/system-manual/05-ask-pulse/04-revision-request.png
 M feature-documentation/system-manual/05-ask-pulse/05-revised-answer.png
 M feature-documentation/system-manual/05-ask-pulse/README.md
 M feature-documentation/system-manual/06-compare-and-references/01-select-two-documents.png
 M feature-documentation/system-manual/06-compare-and-references/02-comparison-answer.png
 M feature-documentation/system-manual/06-compare-and-references/03-alignment-table.png
 M feature-documentation/system-manual/06-compare-and-references/04-open-catalog-references.png
 M feature-documentation/system-manual/07-pulse-guidance/01-dragging-over-component.png
 M feature-documentation/system-manual/07-pulse-guidance/02-focused-component-brief.png
 M feature-documentation/system-manual/07-pulse-guidance/03-section-tour-waits-for-input.png
 M feature-documentation/system-manual/07-pulse-guidance/04-section-tour-next-control.png
 M feature-documentation/system-manual/07-pulse-guidance/05-drop-rejected-with-reason.png
 M feature-documentation/system-manual/07-pulse-guidance/06-general-conversation.png
 M feature-documentation/system-manual/07-pulse-guidance/07-situational-exchange.png
 M feature-documentation/system-manual/07-pulse-guidance/README.md
 M feature-documentation/system-manual/08-ai-connections/01-pipeline-status.png
 M feature-documentation/system-manual/08-ai-connections/02-free-provider-options.png
 M feature-documentation/system-manual/08-ai-connections/03-on-device-model.png
 M feature-documentation/system-manual/08-ai-connections/04-saved-provider-credential.png
 M feature-documentation/system-manual/08-ai-connections/05-provider-replacement-error.png
 M feature-documentation/system-manual/08-ai-connections/06-generation-verified.png
 M feature-documentation/system-manual/08-ai-connections/07-model-access-error.png
 M feature-documentation/system-manual/08-ai-connections/08-openrouter-catalog-retry.png
 M feature-documentation/system-manual/08-ai-connections/09-mobile-provider-connection.png
 M feature-documentation/system-manual/08-ai-connections/10-authorization-error.png
 M feature-documentation/system-manual/08-ai-connections/README.md
 M feature-documentation/system-manual/09-pulse-actions/01-attach-class-list.png
 M feature-documentation/system-manual/09-pulse-actions/02-register-card.png
 M feature-documentation/system-manual/09-pulse-actions/03-registered-in-my-courses.png
 M feature-documentation/system-manual/09-pulse-actions/04-search-results.png
 M feature-documentation/system-manual/09-pulse-actions/05-material-course-suggestion.png
 M feature-documentation/system-manual/09-pulse-actions/06-material-added.png
 M feature-documentation/system-manual/09-pulse-actions/07-generate-week-source.png
 M feature-documentation/system-manual/09-pulse-actions/08-class-list-upload-error.png
 M feature-documentation/system-manual/09-pulse-actions/09-undo-preserves-newer-registration.png
 M feature-documentation/system-manual/09-pulse-actions/10-pdf-section-preview.png
 M feature-documentation/system-manual/09-pulse-actions/11-section-applied.png
 M feature-documentation/system-manual/09-pulse-actions/12-private-memory.png
 M feature-documentation/system-manual/09-pulse-actions/13-installed-tools.png
 M feature-documentation/system-manual/09-pulse-actions/14-generated-edit-preview.png
 M feature-documentation/system-manual/09-pulse-actions/15-focused-page-source.png
 M feature-documentation/system-manual/09-pulse-actions/16-mobile-focused-source.png
 M feature-documentation/system-manual/09-pulse-actions/17-course-aware-syllabus-draft.png
 M feature-documentation/system-manual/09-pulse-actions/18-researched-learning-draft.png
 M feature-documentation/system-manual/09-pulse-actions/README.md
 M feature-documentation/system-manual/10-authenticated-academic-records/README.md
 M feature-documentation/system-manual/11-workspace-buddies/01-meet-the-crew.png
 M feature-documentation/system-manual/11-workspace-buddies/02-contextual-loading.png
 M feature-documentation/system-manual/11-workspace-buddies/03-working-and-review.png
 M feature-documentation/system-manual/11-workspace-buddies/README.md
 M feature-documentation/system-manual/12-interface-and-loading/01-page-tabs.png
 M feature-documentation/system-manual/12-interface-and-loading/02-avatar-launcher.png
 M feature-documentation/system-manual/12-interface-and-loading/03-dialog-and-pulse.png
 M feature-documentation/system-manual/12-interface-and-loading/04-records-loading.png
 M feature-documentation/system-manual/12-interface-and-loading/05-file-scan-progress.png
 M feature-documentation/system-manual/12-interface-and-loading/06-mobile-page-tabs.png
 M feature-documentation/system-manual/12-interface-and-loading/07-mobile-dialog-and-pulse.png
 M feature-documentation/system-manual/12-interface-and-loading/08-mobile-records-loading.png
 M feature-documentation/system-manual/12-interface-and-loading/09-mobile-monitor-tabs.png
 M feature-documentation/system-manual/13-restored-account-sections/README.md
 M feature-documentation/system-manual/README.md
 M feature-documentation/system-manual/capture-log.json
 M feature-documentation/system-walkthrough/02-shared-interface/01-top-bar.png
 M feature-documentation/system-walkthrough/02-shared-interface/02-search-overlay.png
 D feature-documentation/system-walkthrough/02-shared-interface/03-keyboard-shortcuts-modal.png
 M feature-documentation/system-walkthrough/02-shared-interface/04-language-menu.png
 M feature-documentation/system-walkthrough/02-shared-interface/05-notifications-dropdown.png
 M feature-documentation/system-walkthrough/02-shared-interface/06-account-menu.png
 M feature-documentation/system-walkthrough/02-shared-interface/08-notifications-page.png
 M feature-documentation/system-walkthrough/02-shared-interface/09-help-and-support.png
 M feature-documentation/system-walkthrough/02-shared-interface/10-settings-account.png
 M feature-documentation/system-walkthrough/02-shared-interface/11-settings-appearance.png
 M feature-documentation/system-walkthrough/02-shared-interface/12-settings-notifications.png
 M feature-documentation/system-walkthrough/02-shared-interface/13-settings-ai-and-knowledge.png
 M feature-documentation/system-walkthrough/02-shared-interface/14-settings-data-and-privacy.png
 M feature-documentation/system-walkthrough/02-shared-interface/15-dark-mode.png
 M feature-documentation/system-walkthrough/02-shared-interface/16-pulse-dock.png
 M feature-documentation/system-walkthrough/02-shared-interface/17-pulse-panel.png
 M feature-documentation/system-walkthrough/02-shared-interface/18-pulse-dwell-help.png
 M feature-documentation/system-walkthrough/02-shared-interface/README.md
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/01-dashboard.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/02-course-loading-loaded-courses.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/03-course-loading-instructors.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/04-monitor-syllabus-status.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/05-monitor-delivery-progress.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/06-monitor-student-oversight.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/07-monitor-alerts.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/08-records-import.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/09-records-blocks-and-class-lists.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/10-records-course-catalog.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/11-pulse-on-course-loading.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/12-associate-dean-dashboard.png
 M feature-documentation/system-walkthrough/03-dean-and-associate-dean/13-performance-access-denied.png
 M feature-documentation/system-walkthrough/04-instructor/01-dashboard.png
 M feature-documentation/system-walkthrough/04-instructor/02-syllabus-my-courses.png
 M feature-documentation/system-walkthrough/04-instructor/03-syllabus-my-syllabus.png
 M feature-documentation/system-walkthrough/04-instructor/04-syllabus-shared-repository.png
 M feature-documentation/system-walkthrough/04-instructor/05-syllabus-builder.png
 M feature-documentation/system-walkthrough/04-instructor/06-syllabus-builder-course-outline.png
 M feature-documentation/system-walkthrough/04-instructor/07-courseware-my-courseware.png
 M feature-documentation/system-walkthrough/04-instructor/08-courseware-builder.png
 M feature-documentation/system-walkthrough/04-instructor/09-student-monitoring-assessment-scores.png
 M feature-documentation/system-walkthrough/04-instructor/10-student-monitoring-material-access.png
 M feature-documentation/system-walkthrough/04-instructor/11-performance-overview.png
 M feature-documentation/system-walkthrough/04-instructor/12-performance-by-topic.png
 M feature-documentation/system-walkthrough/04-instructor/13-performance-alerts.png
 M feature-documentation/system-walkthrough/04-instructor/README.md
 M feature-documentation/system-walkthrough/05-student/01-dashboard.png
 M feature-documentation/system-walkthrough/05-student/02-my-materials.png
 M feature-documentation/system-walkthrough/05-student/03-my-assessments.png
 M feature-documentation/system-walkthrough/05-student/04-performance-overview.png
 M feature-documentation/system-walkthrough/05-student/05-performance-by-topic.png
 M feature-documentation/system-walkthrough/05-student/06-performance-learning-materials.png
 M feature-documentation/system-walkthrough/05-student/07-performance-assessment-scores.png
 M feature-documentation/system-walkthrough/05-student/08-pulse-for-students.png
 M feature-documentation/system-walkthrough/05-student/09-pulse-declines-assessment-answers.png
 M feature-documentation/system-walkthrough/06-mobile/02-instructor-dashboard.png
 M feature-documentation/system-walkthrough/06-mobile/03-navigation-menu.png
 M feature-documentation/system-walkthrough/06-mobile/04-syllabus-builder.png
 M feature-documentation/system-walkthrough/06-mobile/05-pulse-panel.png
 M feature-documentation/system-walkthrough/06-mobile/06-settings-ai-and-knowledge.png
 M feature-documentation/system-walkthrough/06-mobile/README.md
 M feature-documentation/system-walkthrough/07-system-admin/01-system-console.png
 M feature-documentation/system-walkthrough/07-system-admin/02-health-and-role-coverage.png
 M feature-documentation/system-walkthrough/07-system-admin/03-manage-accounts.png
 M feature-documentation/system-walkthrough/07-system-admin/04-audit-activity.png
 M feature-documentation/system-walkthrough/07-system-admin/05-agent-activity.png
 M feature-documentation/system-walkthrough/08-authenticated-records/01-instructor-records.png
 M feature-documentation/system-walkthrough/08-authenticated-records/02-student-material.png
 M feature-documentation/system-walkthrough/08-authenticated-records/03-student-assessment.png
 M feature-documentation/system-walkthrough/08-authenticated-records/04-student-performance.png
 M feature-documentation/system-walkthrough/08-authenticated-records/05-dean-performance.png
 M feature-documentation/system-walkthrough/08-authenticated-records/06-associate-dean-oversight.png
 M feature-documentation/system-walkthrough/08-authenticated-records/07-unenrolled-student.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/01-instructor-dashboard.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/02-student-dashboard.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/03-dean-dashboard.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/04-associate_dean-dashboard.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/05-performance-radar-and-history.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/06-assessment-coverage.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/07-material-access.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/08-assessment-scores.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/09-threshold-review.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/10-student-drilldown.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/11-monitoring-scoring-matrix.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/12-monitoring-material-matrix.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/13-monitor-syllabus-status.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/14-monitor-delivery.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/15-monitor-students.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/16-monitor-alerts.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/17-course-loading.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/18-instructor-delivery.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/19-record-blocks.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/20-record-courses.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/21-course-intake-preview.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/22-course-intake-saved.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/23-load-intake.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/24-roster-intake.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/25-intake-templates.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/26-intake-history.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/27-student-course-weeks.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/28-student-document.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/29-student-presentation.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/30-student-assessment-result.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/31-account-notices.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/32-dark-performance.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/33-mobile-performance.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/34-mobile-materials.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/35-mobile-dark-dashboard.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/36-topic-mastery-heatmap.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/37-instructor-response-marking.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/38-confirmed-in-app-reminder.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/39-loading-proposals.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/40-block-correction.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/41-offline-review-inbox.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/42-timed-written-assessment.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/43-assessment-pending-review-and-appeal.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/44-persisted-academic-notices.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/45-saved-syllabus-versions.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/46-assessment-topic-mapping.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/47-publication-delivery-settings.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/48-mobile-topic-mastery.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/49-mobile-loading-proposal.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/50-account-pulse-guidance.png
 M feature-documentation/system-walkthrough/09-restored-role-pages/README.md
 M feature-documentation/system-walkthrough/README.md
 M feature-documentation/system-walkthrough/capture-manifest.json
?? .anchor/
?? edupulse-app/src/agents/componentScope.ts
?? edupulse-app/src/components/pulse/usePulseFileDrop.js
?? edupulse-app/src/components/syllabus/outline-editor.css
?? edupulse-app/src/components/ui/KeyboardShortcuts.jsx
?? edupulse-app/src/utils/outlineEditing.ts
?? edupulse-app/tests/browser/pulse-components.spec.ts
?? edupulse-app/tests/browser/settings-outline.spec.ts
?? edupulse-app/tests/component-scope.test.ts
?? edupulse-app/tests/pulse-component-fixture.ts
?? edupulse-app/tests/snapshots/component-actions.mobile.spec.ts
?? edupulse-app/tests/snapshots/component-actions.spec.ts
?? feature-documentation/capture-runs/2026-10-28T12-39-59-450Z-e5f139fd.json
?? feature-documentation/capture-runs/2026-10-28T12-50-28-016Z-2c73a892.json
?? feature-documentation/capture-runs/2026-10-28T13-02-35-047Z-3db025ce.json
?? feature-documentation/system-manual/14-pulse-and-outline-workspace/
?? feature-documentation/system-walkthrough/02-shared-interface/03-settings-keyboard-shortcuts.png
?? feature-documentation/versions/2026-10-28-component-actions/
```

Diff stat:
```
 .../35-mobile-dark-dashboard.png                   |  Bin 1585317 -> 1568424 bytes
 .../36-topic-mastery-heatmap.png                   |  Bin 594619 -> 588953 bytes
 .../37-instructor-response-marking.png             |  Bin 718792 -> 714571 bytes
 .../38-confirmed-in-app-reminder.png               |  Bin 648234 -> 641047 bytes
 .../39-loading-proposals.png                       |  Bin 367369 -> 364190 bytes
 .../09-restored-role-pages/40-block-correction.png |  Bin 362017 -> 358615 bytes
 .../41-offline-review-inbox.png                    |  Bin 318989 -> 313653 bytes
 .../42-timed-written-assessment.png                |  Bin 339932 -> 334139 bytes
 .../43-assessment-pending-review-and-appeal.png    |  Bin 406808 -> 399876 bytes
 .../44-persisted-academic-notices.png              |  Bin 257569 -> 258319 bytes
 .../45-saved-syllabus-versions.png                 |  Bin 58793 -> 58391 bytes
 .../46-assessment-topic-mapping.png                |  Bin 341138 -> 338911 bytes
 .../47-publication-delivery-settings.png           |  Bin 243088 -> 241082 bytes
 .../48-mobile-topic-mastery.png                    |  Bin 1482751 -> 1469031 bytes
 .../49-mobile-loading-proposal.png                 |  Bin 1172555 -> 1116111 bytes
 .../50-account-pulse-guidance.png                  |  Bin 450553 -> 376301 bytes
 .../09-restored-role-pages/README.md               |    5 +-
 feature-documentation/system-walkthrough/README.md |    2 +-
 .../system-walkthrough/capture-manifest.json       |   12 +-
 281 files changed, 1794 insertions(+), 416 deletions(-)
```

## Recent commits
```
c053bd4 Record landing v2 deployment and hosted checks
354b0a1 Rebuild the landing page as an editorial page with shared design tokens
38d9f5e Record baseline restoration production verification
e976ae3 Restore approved academic workflows and role-page features
26679c2 Record landing and motion release validation and hosted checks
952107c Redesign the landing page around the CIT and add interface transitions
5072b49 feat: Add restored role pages and validation for course-aware Pulse drafting
87bea6b Record interface release validation and hosted checks
```

## Resume
Read `memory/HANDOFF.md` for intent/next-step, then reconcile against the diff above. If HANDOFF.md is older than this checkpoint, trust the diff.
