# Historical import validation

The source PDF (681,728 bytes, 12 pages) was freshly read by the production table extractor and all 12 page renders were visually inspected. Source SHA-256: 7b64dd3201a7601ab9e444d889daf58b2a8f0c51bfe284febc89e817ae6acb1c. Original bytes, extracted names, signatures, bindings, full private backup and raw SQL receipts remain in ignored .data/historical-cit-loads/.

The linked PostgreSQL CLI applied migration 20261118061807_historical_teaching_load_backfill. The Supabase connector denied project SQL access, so authenticated linked CLI access was used. A rollback rehearsal passed before applying the reviewed transaction. Applied readback: 21 historical term courses, 37 instructor-course assignments, 66 source schedule rows, 12 instructor forms and three new sign-in-disabled instructor identities. A second rollback rehearsal created zero records, establishing idempotency for the exact reviewed bindings.

The transactional before/after fingerprints match for every pre-existing account (including credentials/roles/bans), student, staff qualification, workspace, derived course, enrollment, publication, attempt, material-open record and unrelated institutional record. No current/next load or enrollment was created. The master catalog remains unchanged. Actor attribution is retained in the academic event.

Native and browser validation and production release checks are recorded below when complete. Broad screenshot publication remains owner-paused; private browser artifacts are reviewed and the capture pipeline is updated with the feature.

Rollback of UI changes does not remove the authorized archive. Any data correction must compare the retained source and exact imported keys, preserve history and use a reviewed maintenance transaction; do not purge business data or disable triggers/RLS.

Fresh cell-by-cell readback caught a UTF-8 decoding error in the private operator script, affecting only printed time separators. The script now decodes UTF-8 explicitly. A separate compare-and-set rollback rehearsal and source-only correction restored 65 separators across 36 assignment groups. Every persisted source cell now matches the fresh production extraction, and the corrected reviewed payload is idempotent (zero new records). No hours, units, identities, qualifications or learner records were altered by this correction.

The actual hosted archive was passed through the production term/directory/catalog view models: 12 historical instructors, 37 assignments and 21 courses, with no Current loads and all source cells verified. The linked security advisor reports ten existing warnings and zero errors; no new public function, grant, policy or table is introduced.

Grouped source rows now supply their full summed teaching units and schedule hours to instructor summary cards. The course catalog retains its per-course credit units. Native and UI checks cover this distinction, including multiple source classes for one course.

The full npm run verify gate passed (478 native tests, lint, type checks, model assets, production build and deployment routing/health checks). The historical browser flow passed all four Dean/Program Coordinator desktop/phone cases; 16 surrounding semester/directory browser checks also passed. Final integration and deployed UI results follow below. Browser records are fictional controlled API transports, separately from the actual hosted SQL/data readback above. No paid inference was used.

After rebasing onto the other session's teaching-load subject-creation update, all 19 affected native tests, TypeScript, lint, production build and deployment checks passed. All 18 integrated desktop/phone tests passed (historical teaching views, existing semester flow, PDF confirmation, OCR and the newly merged missing-subject flow). A final four-case browser run passed after bounding source-detail width for phone reading. Latest desktop/phone captures were inspected privately. The archive totals resolve to 200 loaded teaching units and 274 computed schedule hours per week; per-course catalog units remain separate.
