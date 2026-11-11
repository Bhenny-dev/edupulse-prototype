# Validation - Syllabus builder header

Existing desktop and mobile capture flows assert that the removed button is absent. The DOCX acceptance flow also checks that **Upload Different** remains available and imported course/outline values are retained. Captures use preview sample data and generated local documents, not hosted account or inference evidence.

Targeted captures passed: 9 desktop walkthrough flows with two affected scenes selected, 5 import/mobile flows, and the Pulse guidance drag/tour flow. All 12 changed images were opened and reviewed; the exact hashes and successful run evidence accompany this release.

`npm run test:browser -- --config .data/dean/browser.config.ts tests/browser/approved-syllabus.spec.ts` passed **12 desktop/phone checks**, covering accepted/rejected files, extraction, explicit course selection, persisted state and student upload denial through controlled account/workspace transports.

`npm run verify` passed: **304 native tests, zero failures/cancellations**, documentation integrity, lint, frontend/server type checks, model-file checks, production build and deployment packaging/API smoke. Existing chunk-size/dynamic-import warnings remain. No backend, database, permission or generation behavior changed.
