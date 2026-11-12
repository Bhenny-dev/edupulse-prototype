# Validation

- Desktop and phone: eight role-filtering/reload/read-only/access-denial and picker checks passed against synthetic account/RPC transports. No paid inference or account-enter commands were sent.
- Pure model regression verifies role isolation, exclusion of unattributed Auth events, rejection of invalid roles and nonmutation.
- Capture build and targeted role/tab captures passed; all ten images were opened for visual review; the full release gate passed.
- `npm run verify` passed: documentation, lint, TypeScript, model assets, 337 native tests, production build and deployment contract checks.
- `npm run test:browser -- --config .data/rename/browser.config.ts tests/browser/role-monitoring.spec.ts`: 8 desktop/phone tests passed. The isolated config serves `dist-capture` with synthetic account/RPC transports; it does not claim hosted authentication or live inference.
- Existing admin-only hosted RPC contracts are reused without migration. No production records or credentials were changed by this task.
