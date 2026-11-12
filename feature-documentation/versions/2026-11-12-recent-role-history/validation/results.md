# Validation

- Hosted read at 12 November 2026, 21:12 Manila: Dean 186 successful direct actions, three AI runs and ten support operations; Instructor 166 successful direct actions, four AI runs including one failure, and 81 support operations; Student seven successful direct actions and 14 support operations; Program Coordinator two support operations and no direct actions/AI runs. Counts are a point-in-time observation, not a promised fixed ratio.
- Migration applied to the existing EduPulse project through its authenticated Management API. The read-only function was invoked using the designated admin's existing DB identity in a rolled-back SQL transaction. Separate non-admin/anonymous access checks were denied. This is not a new browser sign-in. No audit/AI/student rows were seeded.
- Native SQL regression covers role isolation, seven-day boundaries, aggregation before list limits, support separation, denied access and no record mutation.
- Twelve controlled desktop/phone browser checks passed, including complete totals, notices, read failures, authorization denial and reload preservation. The role/tab capture suite passed, and all ten images were opened for review. No screenshot contains live personal records.

- `npm run verify`: passed documentation, lint, TypeScript, model-asset checks, 338 native tests, production build and deployment contract checks. The focused `npm run test:browser -- --config .data/rename/browser.config.ts tests/browser/role-monitoring.spec.ts` run passed 12 desktop/phone checks.
