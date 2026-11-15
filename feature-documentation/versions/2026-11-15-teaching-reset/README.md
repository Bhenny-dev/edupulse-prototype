# Teaching content reset - 15 November 2026

The owner requested removal of the old seed/generated teaching set before adding content with the revised Instructor course workflow. This operation was applied to the existing linked EduPulse database, not a UI fixture. The application implementation and current deployment do not change.

| Records | Before | After |
| --- | ---: | ---: |
| Saved syllabi | 69 | 0 |
| Workspace courseware items | 1,037 | 0 |
| Delivery publications | 245 | 0 |
| Shared syllabi | 14 | 0 |
| Assessment attempts (all demonstrations) | 1,728 | 0 |
| Material opens (all demonstrations) | 3,361 | 0 |
| Reading-progress records | 3,360 | 0 |
| Assessment sessions | 1,740 | 0 |
| Retained teaching sources | 26 | 0 |
| Indexed teaching documents / chunks | 5 / 55 | 0 / 0 |
| Private assessment keys / activity grants | 83 / 5,060 | 0 / 0 |
| Institutional courses | 60 | 60 |
| Instructor load records | 129 | 129 |
| Institutional roster records | 417 | 417 |
| Distinct block labels | 14 | 14 |
| Loaded course memberships | 3,900 | 3,900 |

Of 69 former syllabus-derived course projections, 46 match the current institutional loads and remain as inactive empty course identities. The other 23 were removed. These retained rows are not saved syllabi or delivered content. Practice sets/attempts and teaching-file Storage objects were already empty; no binary Storage deletion was needed. Existing source-archive snapshots and the older course-associated indexed document were removed; unrelated personal libraries would be preserved by the source predicate.

## Safety and verification

- Completed private backups of all 21 affected/protected tables under ignored `.data/reset-teaching-2026-11-15/backup`, including original workspace attachments, keys and roster metadata. Auth identity/role metadata was fingerprinted without exporting auth secrets. These files must never be committed or published.
- The complete transaction passed a rollback rehearsal before the exact SQL/backup bytes were applied. Initial trials rejected a PL/pgSQL alias collision and a not-null status value without committing; the final SQL uses an empty status on inactive course identities.
- The committed transaction asserted exact preserved institutional/student/staff/account fingerprints, unchanged non-teaching workspace fields and course membership rows, and advancing workspace revisions. It retained the ordinary save/revision/suspension guards. No RLS policies/triggers were disabled, no roles were reassigned and no independent student activity was present or fabricated.
- Replay and stale-snapshot negative checks passed: the applied receipt rejects another run before a database call, and the old SQL snapshot aborts at its first guard before reset writes.
- A separate post-commit read verified the empty teaching tables and matching preserved snapshots. Fresh `authenticated` database-role reads exercised current claims for 417 enrolled students, eight instructors, two Deans, two Program Coordinators and two Admins. All 3,900 assigned subjects remained available as inactive course identities; removed content/results were unavailable. These are hosted database/RPC/RLS checks, not a browser-login or API-transport claim.
- `npm run verify` passed: lint, both TypeScript projects, pinned model fetch, 384/384 native tests, production build and deployment checks. A final TypeScript check and focused operational-script lint also passed. Existing lint warnings and Vite chunk-size warnings remain; there were no compilation/test failures. Browser interaction tests were not rerun for this data-only operation. Screenshot enforcement remains paused by the owner in `doc-map.json`; this is data maintenance and adds no UI feature. No new application deployment or schema migration is required for the live reset.

The [aggregate receipt](receipt.json) excludes names, emails, account IDs, document text and answer keys. Audit/conversation history and provider credentials/settings remain. Existing sessions should deliberately reload; stale dirty drafts must use the existing conflict/export recovery and must not restore rejected teaching content.

## Explicit maintenance tool

Run from `edupulse-app` with the verified linked CLI configuration. The project reference is checked. The output must be an ignored `.data` directory, and backups/receipts cannot be overwritten.

```powershell
node --import tsx scripts/reset-teaching-content.ts --output .data/<private-run> --backup
node --import tsx scripts/reset-teaching-content.ts --output .data/<private-run>
node --import tsx scripts/reset-teaching-content.ts --output .data/<private-run> --check-transaction
node --import tsx scripts/reset-teaching-content.ts --output .data/<private-run> --apply
```

Do not rerun this operation against new teaching work. An applied receipt prevents replay; stale snapshot fingerprints or independent learner attempts/opens abort. A lost CLI response is not proof of rollback: verify current data before doing anything further. The private backup retains original rows for incident recovery; restoring it would reintroduce the rejected content and requires a separate explicit recovery request and review against current records.
