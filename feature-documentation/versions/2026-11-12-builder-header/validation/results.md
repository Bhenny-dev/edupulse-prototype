# Validation - Syllabus builder header

Existing desktop and mobile capture flows assert that the removed button is absent. The DOCX acceptance flow also checks that **Upload Different** remains available and imported course/outline values are retained. Captures use preview sample data and generated local documents, not hosted account or inference evidence.

Targeted captures passed: 9 desktop walkthrough flows with two affected scenes selected, 5 import/mobile flows, and the Pulse guidance drag/tour flow. All 12 changed images were opened and reviewed; the exact hashes and successful run evidence accompany this release.

`npm run test:browser -- --config .data/dean/browser.config.ts tests/browser/approved-syllabus.spec.ts` passed **12 desktop/phone checks**, covering accepted/rejected files, extraction, explicit course selection, persisted state and student upload denial through controlled account/workspace transports.

`npm run verify` passed: **304 native tests, zero failures/cancellations**, documentation integrity, lint, frontend/server type checks, model-file checks, production build and deployment packaging/API smoke. Existing chunk-size/dynamic-import warnings remain. No backend, database, permission or generation behavior changed.

Commit `8690192c661ffaba25c8e91d166d336c154626cc` was pushed to `main`. Production deployment `dpl_8dLEpZp3EeZ9d4f5estXWkuAT9LG` reached **READY** and independently passed all 304 native tests and packaging/API checks.

An authenticated instructor check at **2026-11-11 20:57 UTC (12 November Manila)** passed on 1440 px desktop and 390 px phone: the button is absent, the upload input and course selector remain available, and reload retains the builder URL. There were no page errors, inference requests or learner actions. The existing instructor startup synchronization occurred twice per viewport; the check permits that established behavior rather than claiming zero academic requests. It did not upload a file, generate content or submit student work. [production.json](production.json) contains only aggregate verification flags.
