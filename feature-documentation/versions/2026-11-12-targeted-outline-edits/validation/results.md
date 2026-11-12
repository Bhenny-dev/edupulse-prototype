# Validation

Nine targeted native tests pass, covering target parsing, one section, one field, one list item, multiple sections, mixed field scopes, whole-outline stages, shared content, unrelated section/resource preservation, immutable IDs, forged/duplicate/missing target rejection, invalid types, nonempty completion, bounded repair, and atomic database revision/conflict checks. Existing drafting, outline-progress, section, operator-step and workspace suites passed 32 tests before the final UI update.

Provider-adapter tests use synthetic replies through actual OpenAI, Claude, OpenRouter and Ollama adapters. The browser runtime calls the same planner/validator. These are contract/transport tests, not claims of physical GPU inference, live paid generation or subscription access.

`npm run verify` passed on the final source: documentation, lint (existing warnings only), both type checks, pinned/checksummed model files, all **328 native tests**, production build and deployment asset/API checks.

The earlier release run had 327 passes and one timed-out pre-existing socket-deadline test under concurrent browser work. The original 10-second timeout was retained. Its isolated rerun and the final complete gate passed; neither the test nor production deadlines were weakened.

The first model-file fetch timed out. Existing local pinned files were copied into this isolated checkout and verified with the unchanged checksums before the final gate.

Desktop and phone captures passed both scenarios. Four new images were opened and current hashes recorded. Browser coverage verifies explicit section placement, unchanged siblings, shared-week propagation, no automatic save, full-syllabus preview, progressive outline placement and selected instructor reload restoration. The earlier broad source-selection browser attempt was not counted as passed; it relied on an unrelated course-generation setup outside this fix.

Live Ollama was unavailable at `127.0.0.1:11434`; physical local inference is not claimed. All provider responses in contract tests are synthetic. No hosted student/course records were changed and no paid inference was invoked.

Final browser outcome: **6 editing checks passed** on desktop/phone (targeted section, full-syllabus preview, progressive outline placement), plus **2 selected-instructor reload checks passed**. The first reload attempt used a capture build without Supabase public configuration and failed before account restoration; rebuilding a separate test output with the existing public URL/publishable configuration passed both checks. Production auth code and test assertions were unchanged. Controlled transports perform no hosted academic writes.

After the monitoring release reached `main`, the fix was rebased without changing that release. Shared documentation/capture conflicts were combined, the four affected images were recaptured/reviewed, and `npm run verify` passed again on the combined source: **331 native tests**, lint/type checks, production build and deployment checks.

The final combined browser run passed **8 desktop/phone checks**, including the selected instructor?s protected route and account after reload.

Production deployment `dpl_75djzt351AgVuW3D9dQaFx6U4QsD` for app commit `caaf76d9` is **READY**. The public page and entry asset returned HTTP 200; an anonymous operator edit returned HTTP 403. This smoke check performed no academic writes or inference. See [production receipt](production.json).
