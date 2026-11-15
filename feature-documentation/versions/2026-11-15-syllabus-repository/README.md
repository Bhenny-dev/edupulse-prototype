# Separate Instructor syllabus repository - 15 November 2026

Instructor navigation again contains Dashboard, Syllabus, Course and Student Monitoring. Syllabus directly opens My Syllabus, Shared Repository and Syllabus Builder. All owned records are listed, with received copies and sender provenance; the former seeded teaching-set slice is removed. Outgoing shares remain in Shared Repository.

My Syllabus offers Upload draft PDF or DOCX and Build a syllabus. Import opens the existing parser/preview and editable seven-section builder; explicit save persists a Drafted record, reload reopens the saved ID, and Download PDF draft rebuilds the current structured fields. An explicit keyboard file chooser accompanies the drop area. A repository draft does not create a teaching-load assignment or fabricate approval.

Course retains its single active approved teaching basis, chronological weeks/topics, materials/assessments and review/delivery. It no longer embeds the repository or builder. The intake is absent once the course is ready, and the local selection commit rechecks for an existing active basis. Old nested syllabus URLs redirect to the standalone tab/edit target without a save, generation or publication. Original-file viewing and comprised-week extraction from the latest main changes remain intact.

The existing live-account/support authorization, revision conflicts, offline approval, registered sharing, private sources, suspension before deletion and no-write reload rules remain. This release neither restores rejected seeds nor adds courseware or learner records. The upload archive explicitly excludes the root local environment files created by CLI linking, in addition to the existing ignored application data and credentials.

## Verification

- Before integrating the concurrent original-file viewer update, npm run verify passed lint, both TypeScript projects, pinned model fetch, all 384 native tests, production build and deployment diagnostics. Existing lint/chunk-size warnings remain.
- The initial targeted browser run passed 28/32 cases; four test-only failures were the old regular-expression escape and selectors aimed at the hidden desktop navbar on phones. The corrected selection/legacy-link tests passed all six desktop/phone cases. All 32 unique target cases therefore passed, including actual PDF extraction/export, saved-draft reload, sharing/recipient provenance, suspension/deletion, topic authoring, review/delivery and source-dialog read-only restoration. Controlled authenticated UI transports were used; they do not establish live hosted student or instructor writes.
- After integrating source 5f020a11, TypeScript and 18 affected native tests passed. All 12 integration browser cases passed on desktop/phone, covering actual original PDF canvas pages, isolated Word display, long-file page recycling, the standalone repository PDF round trip and course/legacy navigation.
- The normal local API startup hit machine memory pressure before the first browser run. The executed UI suites used an isolated Vite server with read-only defaults and explicit test transports. No test data was written to the production workspace. The code still uses the existing API/DB save and sharing paths, separately covered by the native suites.
- Desktop and phone repository screenshots were captured privately and visually inspected. Capture-pipeline assertions and current guides are updated; broad screenshot recapture remains paused by the owner in doc-map.json.

## Release

Runtime source `4d3b9d474fcce31397db026c8ac747992a1feed7` was pushed to main and deployed Ready through Git as `dpl_s22GGPTv7GDNYCUMrSkFsKkQ1JFS`. The canonical [EduPulse site](https://edupulse-prototype.vercel.app) resolves to this deployment. Vercel independently passed the complete final-source verification gate with **388/388 native tests**, TypeScript, production build and deployment diagnostics.

All **12 production-UI browser checks** passed on desktop and phone against the canonical site's actual built assets. These exercised original-file readers, standalone navigation and PDF draft extraction/save/reload/export using controlled account/academic transports; they are not claims of live authenticated workspace writes. Actual canonical health and application-help requests returned HTTP 200. The detailed syllabus-import/export question used system-search, system scope and one source without generative fallback.

The connected deployment tools did not expose this project, so the verified existing CLI team/project supplied release metadata and logs. A duplicate CLI deployment (`dpl_88xNn4JuKgyTeThK2HaA7pQYmgnF`) was canceled after the matching Git deployment became Ready; the working production deployment was retained. No schema migration, production seed or learner-record mutation was performed.

[Repository guide](../../system-manual/45-syllabus-repository/README.md) | [Course guide](../../system-manual/44-instructor-course-workspace/README.md)
