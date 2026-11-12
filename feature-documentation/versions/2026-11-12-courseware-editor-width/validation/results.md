# Validation

- Capture build and TypeScript check passed.
- `npm run test:browser -- --config .data/rename/browser.config.ts tests/browser/editor-layout.spec.ts tests/browser/courseware-formatting.spec.ts tests/browser/courseware-unified.spec.ts`: 22 passed across desktop and phone. The initial targeted editor-only run also passed 2 checks. Long questions, options, material headings/bodies and slide headings/points fit their fields without internal clipping.
- Three editor captures passed and were opened for visual review. All records and long text are synthetic display fixtures; no accounts, scores or saved courseware were modified.
- `npm run verify` passed: documentation, lint, TypeScript, model assets, all 336 native tests, production build and deployment contract checks.
- The broad 500-case browser invocation was stopped; the development build does not provide the capture personas used by these fixtures. Related browser scenarios were rerun against the capture build using the isolated preview-server configuration. This is controlled UI verification, not hosted authentication or live inference.
