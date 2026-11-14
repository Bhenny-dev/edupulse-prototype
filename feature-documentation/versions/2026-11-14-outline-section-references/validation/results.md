# Validation

The new regression first reproduced the flaw: source collection returned the overall reference and a removed weekly projection, omitting both current section links. After the fix, 12 outline/reference tests and nine source extraction, retention, discovery and indexing tests passed. The regression also covers shared-week deduplication, selected-week boundaries, older rows, immutability and the existing 80-reference limit.

Both TypeScript projects pass. Lint reports existing warnings only. The production capture build passes. All 10 desktop/phone browser cases passed, covering canonical section links through retention and generation, multi-section assessment identity and teaching context, teaching-file attachment, all seven assessment formats, highlighted retained passages, Pulse source explanations and no-generation reload.

The two targeted desktop/phone capture scenarios passed. All four new images were opened and recorded by exact hash in the agent review ledger; fixed overlays are hidden only in these component crops. The guides, capture pipeline and decision ledger are updated together.

No migration, hosted business-data mutation or paid inference was performed. Controlled source/provider fixtures demonstrate the UI and generation integration; they do not establish paid-provider quality or genuine learner activity.

## Production release

Runtime `057bb09bb70a3bb3a1e930e4d21093c19f213d80` was pushed to main and deployed Ready as `dpl_AQwN4yoizLtCcGqHK1XaLsriAn6y`. Vercel's full `npm run verify` gate passed all 364 native tests, the production build, and deployment routing, serverless health and public-retrieval checks.

All 10 source-workflow desktop/phone browser cases passed again against the deployed application. This includes the new section-only source-list/retention/generation case and the existing source-popover/Pulse explanation, attachment, seven-format and multi-section generation checks. They use controlled account, source and model transports around the deployed interface, not a real instructor sign-in or paid hosted inference.

The production homepage and API health endpoint returned HTTP 200 at 09:08 Asia/Manila on 14 November 2026. GitHub Actions run 43537911581 did not start because the account is locked for billing; that separate CI check is not reported as passed. Vercel verification ran and passed independently.
