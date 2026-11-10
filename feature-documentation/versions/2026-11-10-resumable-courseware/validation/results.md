# Validation: resumable courseware

## Scope and provenance

Browser/capture tests use original loop teaching samples and the real bounded graph, with controlled provider, identity and workspace transports. They establish interface, request sequence and explicit resume behavior, not paid-provider quality or hosted sign-in. The separate native API/database test uses the real HTTP adapter, workspace schema and isolated PGlite store, with controlled Ollama output. It saves five material parts, reads their checkpoints after an activity failure and assembles the complete two-item week. No inference request is treated as a workspace save until that save is acknowledged.

The database test runs the additive checkpoint migration against the real workspace RPC/RLS model. A marked draft saves, but checked/published/hidden transitions fail. The trigger is security invoker in the private schema, with no anonymous or authenticated execute privilege. It changes no existing records.

## Recovery checks

- Later content failure retains valid parts, and other independently planned parts can finish.
- Reload restores the private checkpoint and starts no AI requests.
- Explicit resume requests only missing parts, preserving outline order when a gap is filled.
- Stop retains acknowledged progress; the interrupted in-flight call can repeat.
- The saved original-draft baseline rejects a newer instructor edit after reload.
- Complete replacement keeps normal document/PDF, review, publication and delivery actions. Existing dates, assessment rules and reviewed work remain protected.
- Unfinished previews are read-only and omitted from completed-item counts; phone and dark states are captured.

## Hosted guard and current limits

Migration `20261110041721_draft_only_generation_checkpoints` was applied after an exact dry run. Hosted before/after aggregates stayed at nine workspaces, three publications and three labelled test attempts, with identical workspace-revision, publication-version and score digests. No old content, score or publication was rewritten. Security advisors report no new checkpoint-function finding; pre-existing exposed definer-function and Auth password-protection findings remain separate.

Checkpoints use the existing account/subject-scoped 3 MB workspace and revision protocol. A lost write response is reconciled by readback; a storage/conflict failure stops inference. Multiple explicitly started sessions may still duplicate an in-flight provider call before one wins compare-and-save. This is resumable acknowledged work, not exactly-once paid inference, an unattended worker or a guarantee that every model can produce valid teaching content. Switching providers before resume can mix models; per-part provenance is retained. Missing references and factual review still require instructor attention.

The first actual local-model smoke encountered an Ollama runner crash before completing a part. A simultaneous low-memory retry also failed. These failures are retained as failed evidence; controlled tests are not represented as successful local-model generation. Final release-gate and capture outcomes are recorded after validation below.

The single-topic HTTP plan carries `planVersion: 2`. Older clients are rejected with `CLIENT_UPDATE_REQUIRED` before provider resolution or inference, so a previously loaded multi-topic client cannot mislabel new single-topic responses. Pure graph callers retain their existing schema compatibility.

A rolled-back hosted RPC/RLS harness acknowledged the temporary checkpoint and rejected checked, published and hidden transitions. It then restored the original nine workspaces, three publications and three attempts with identical revision/score digests. This is a database authorization harness, not fresh browser sign-in or live model inference. [Sanitized receipt](hosted-receipt.json).

## Final release checks

- `npm run verify`: passed, all 280 native tests, lint/type checks, production build and serverless deployment checks.
- Targeted Playwright course/outline suites: 20 desktop/mobile cases passed on the final source, including delayed parts, failure/reload/resume, cancellation, original-draft conflicts, review/publication controls, dates, assessment rules and PDF output.
- Final documentation capture: four cases passed, 12 images opened and reviewed, no page/CSP errors, source unchanged during capture. [Capture record](../../../capture-runs/2026-11-10T04-44-02-322Z-9ec5e559.json).
- `npm run docs:check`: passed after exact-hash review and the final guide updates.

The initial native run exposed three tests that assumed the old two-group plan/repair sequence; they now exercise all single-topic parts, missing-topic repair and citation renumbering with out-of-order completion. The first combined browser run had one 30-second workflow timeout under memory pressure; its isolated rerun passed, followed by the complete final 20-case pass. Mobile full-page capture uses the existing static-header capture convention so the sticky navigation is not duplicated over the document. The live local-model failures above remain failures; these passing checks do not replace them with a model-quality claim.
