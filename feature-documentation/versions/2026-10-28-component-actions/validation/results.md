# Validation · component actions

Status: isolated candidate validated locally, completed 29 October 2026 (Asia/Manila). Not pushed or deployed. The shared working tree is not release-ready while the concurrent PDF changes have TypeScript errors.

The candidate is based on `38d9f5ee38dd75751f94b48dec7686a488864936`, with only this task's owned source/tests copied to an isolated checkout. The concurrent landing, dependency, global CSS and PDF-export changes are not included. Browser fixtures distinguish synthetic proposals, preview personas and real local extraction. This does not demonstrate hosted account authorization or live-provider drafting quality.

Validation results:

| Check | Result |
| --- | --- |
| `npm run verify` in the isolated candidate | Passed: documentation gate, lint, both TypeScript projects, model preparation, 144 unit tests, production build and deployment checks |
| Full desktop/mobile browser suite | 157 passed, 13 intentionally skipped, zero failures; includes all five roles, saved field edits, stale previews, file drops, Settings tabs, outline movement and existing academic flows |
| Selected scope/tool/drafting unit run | 17 passed |
| Settings and outline browser follow-up | 14 passed across desktop/mobile |
| Authenticated-app/task screenshot refresh | 66 passed; public landing scenes excluded to preserve concurrent work |
| Final dark outline recapture | 1 passed after correcting the filter-arrow styling |
| Final workspace-buddies/loading recapture | 1 passed after correcting the loading punctuation |
| Focused office browser rerun after the cosmetic correction | 6 passed across desktop/mobile |
| Shared working-tree documentation gate | Passed: links, screenshots, capture provenance, image review, routes and freshness |
| Shared working-tree TypeScript check | Failed in the separate `src/utils/markdownBlocks.js` and `src/utils/pdfExport.js` work; those files remain untouched by this task |

The full browser run preceded the final loading-text punctuation correction. That cosmetic change was rebuilt, its affected scene recaptured, and all six focused office browser cases passed. No application behavior changed after the full run.

The successful screenshot reports are [full refresh](../../../capture-runs/2026-10-28T12-39-59-450Z-e5f139fd.json), [dark outline](../../../capture-runs/2026-10-28T12-50-28-016Z-2c73a892.json), and [loading text](../../../capture-runs/2026-10-28T13-02-35-047Z-3db025ce.json). Each reports an unchanged source tree and no page/CSP failures. Changed PNGs were opened with `view_image`; [the image ledger](../../../capture-runs/image-review.json) records agent reviews for their exact current hashes. This is not human approval.

The capture suite exercised real file extraction/OCR and the local `qwen2.5:3b` model. Week generation produced three reviewable drafts. The explicitly source-based answer fell back to cited source excerpts when model wording could not be verified. Field proposals, revision-control examples and provider-connection states use labelled synthetic fixtures. These results do not establish hosted authentication, general answer correctness, web-source quality or live paid-provider inference quality. No new provider key, database migration or deployment was performed.

Existing lint/build warnings remain, including bundle size and the shared static/dynamic syllabus-parser import. They did not fail the isolated gate. Validation used a detached checkout at the stated baseline plus the owned changes, with its own test database and preview ports; it does not certify the other task's uncommitted landing/PDF implementation.

Logs: [release verification](verify.log), [full browser run](browser.log), [screenshot refresh](captures.log), [final outline](outline-capture.log), [final loading scene](loading-capture.log), [focused office rerun](office-browser.log), and [shared-tree TypeScript errors](shared-typecheck.log).
