# Validation

Implementation and captures: 10 November 2026. Release review completed 11 November 2026.

| Check | Result |
| --- | --- |
| `npm run verify` | Passed: documentation integrity/freshness, lint, both TypeScript projects, model artifacts, 294 native tests, production build and deployment checks. No failed or skipped native tests. Existing lint/chunk warnings remain. |
| Focused Playwright browser suites | 54 passed, 2 intentional viewport skips across desktop and phone. Account support, all four restored person roles, own-role views, pending account pickers, delayed/failed/revoked/mismatched/empty resolution, retry, explicit exit, header surfaces, course readers, student readers and manual refresh covered. |
| Final recovery layout rerun | 2 passed: desktop and phone. Recovery button text fits after the phone layout correction. |
| Targeted documentation capture | 8 passed; 11 images; no page errors or CSP violations. Source remained unchanged during the successful run. |
| Image review | All 11 exact hashes reviewed by Codex agent; this is not human acceptance. |
| API/SQL authorization | Actual HTTP handler with synthetic transport verifies fresh authentication, read-only subject RPC, local/non-admin/malformed denial and denial after a prior success. Local PGlite runs the actual migrations and verifies public DTO keys, unchanged audit/business tables and fresh actor/subject role checks. Included in the native gate. |

Browser command used the four `account-support`, `admin-reload`, `layout-reload` and `workspace-cache` specs, one worker, against the optimized capture preview through a private local config. The two skips are the phone-hidden language shortcut and desktop-hidden mobile navigation. Tests assert that no support enter/leave, model generation/test, student open/start/respond/submit or publication command is replayed on reload. The initial development-server run exceeded its navigation timeout; final optimized-preview coverage passed. This is distinct from live hosted account authentication.

Capture evidence: [successful run](../../../capture-runs/2026-11-10T06-32-00-780Z-b5f14bbd.json). Source digest: `89f84ea15cb410c5b7be6d3a71043647c4f1f1c46ffa5da33863fca3eb7dca20`. The earlier failed capture assertion and successful pre-layout run remain recorded for provenance; current image attestations match the final successful run.

No database migration, registered-account activity, grades, enrollment, hosted content or provider inference was changed by this increment. Browser identities and account results are synthetic. The owner's live Google session was not available for a production selected-person browser check. A production deployment becoming Ready is deployment evidence, not a substitute for that live authentication test.

This increment restores the selected admin person and common page/reader/header/picker references. It does not claim that every feature-specific form/dialog has opted in yet; the completion register retains that remaining coverage. File chooser values and business commands are never persisted as reload hints.

The authorized push targets `main` and the existing EduPulse production Git integration. Deployment status is checked against the exact pushed commit, without changing production configuration or credentials.

## Production receipt, 11 November 2026

- Application commit: `73512117b6469ac48cf0168b6352a63d391a0af5`, pushed to `main`.
- Vercel production deployment: `dpl_12BpyBT4ZZZppnzGaM8Xy5hHbfyD`, **Ready**, checked at 10:14:52 AM Asia/Manila. Its build logs separately confirm **294 passed / 0 failed** and successful deployment checks before output publication.
- Live [production URL](https://edupulse-prototype.vercel.app/): HTTP 200 for the page, JavaScript bundle and public health endpoint. The delivered bundle contains the new recovery screen and both admin view/picker hint keys. Anonymous support-subject lookup returns **403 `SUPPORT_FORBIDDEN`**, without account details. No account-enter or business write was performed by this smoke check.
- [GitHub Actions run](https://github.com/Bhenny-dev/edupulse-prototype/actions/runs/42944040483): no steps ran. GitHub's check annotation states that the account is locked due to a billing issue. This is an external CI availability failure, not a passing CI run; billing settings were not changed. The local and Vercel verification results above remain separate evidence.

The production smoke check confirms deployment and public/anonymous boundaries; it does not claim a live owner-Google selected-person session test. A documentation-only follow-up records this receipt without changing application bytes.
