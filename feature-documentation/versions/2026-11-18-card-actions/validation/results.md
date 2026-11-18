# Validation

Focused native PostgreSQL checks pass for catalog creation, normalized identity collisions, role authorization, current-version conflicts, title edits without source changes, suspend-before-remove, lifecycle-preserving imports and unchanged teaching records. The existing independent instructor handover test also passes with the catalog guards installed.

The hosted migration and explicit catalog-action rehearsal pass inside a rolled-back transaction. No course, load, account or learner record is committed by that rehearsal. Migration `20261118000521_course_catalog_actions.sql` is applied. Before/after fingerprints match for institutional records, workspaces, projected courses, students and accounts. The 60 catalog courses and zero loads/publications/attempts remain unchanged. Supabase advisors remain at 15 existing warnings with no new finding keys.

The full local `npm run verify` passes **459 native tests**, both type checks, lint, model preparation, production build and deployment checks. All **38 desktop/mobile browser cases pass**, covering the new Course/Instructor menus and CRUD commands, existing loading/account management, inherited teaching views and authoring/delivery. The initial browser check caught an offscreen restored menu; shared vertical clamping and trigger restoration correct it. A course-code helper is exposed as a description rather than becoming part of the input label.

Production source/deployment and deployed browser results are recorded after publishing completes.

Browser fixtures use fictional accounts and controlled API responses. They verify rendered controls and command/reload behavior, not genuine user sign-ins or live course mutations. Private test screenshots and logs are retained under ignored `.data/card-actions/`; broad public screenshot publication remains owner-paused. The capture assertions are updated with the feature.
