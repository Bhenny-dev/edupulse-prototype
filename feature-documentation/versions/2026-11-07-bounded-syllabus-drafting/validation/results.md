# Validation: bounded syllabus drafting

## Report and implementation

The owner confirmed an OpenRouter free model failed after waiting. Code inspection found research plus six generation stages in one hosted request, with authentication and lease cleanup around that work. The exact failed browser event was not recovered; this release fixes that structural budget problem and replaces raw browser fetch errors with bounded, actionable categories.

Research is a separate initialization step; subsequent steps invoke one harness stage for general sections, two teaching weeks or bibliography. One repair is carried to a separate request. Only the final complete/source-checked proposal reaches the editor preview. An opaque authenticated/encrypted checkpoint binds the original task/editor, verified identity/role and selected provider/model/connection. Cancellation, expiry, tampering and changed bindings cannot silently continue it. Existing cookie-size limits remain the default.

## Verification

Four new drafting tests exercise the exact reported prompt, 18 weeks, an invalid stage and separate repair, one research pass, an interrupted response, the real client/handler/provider adapter, no workspace save, expiry/tampering, changed account/prompt/model, student denial, outline-only scope and cancellation before/during a response. Inference and research are synthetic; no real key or model answer is claimed. A separate real-socket test advances the operator clock, confirms work cancellation returns typed HTTP 504 and slow intake returns HTTP 408 before dispatch. Earlier focused planner/delivery tests passed 27 cases before the new tests were added. [Drafting log](drafting-tests.log), [deadline log](deadline-test.log).

Desktop/mobile browser checks exercise the new checkpoint/retry flow, a complete seven-field preview, unchanged fields while pending, explicit application, and a repeated failure that retains the prompt and form. Initial assertions used a label absent from the existing read-only course-title input; the corrected locator uses its actual placeholder. One Research Methods regression run stalled on the landing persona button under software rendering, before reaching Pulse; the final six desktop/mobile cases passed in 1.9 minutes with a 90-second per-case ceiling. [Browser log](browser.log).

The existing Edge tab is discoverable, but its documented DOM and screenshot APIs fail in the browser bridge before reading the page. No provider settings, credentials, course fields or saved records were changed through that tab. Live OpenRouter inference remains unverified; automated provider-envelope and browser transport tests do not substitute for it.

## Release checks

The two [documentation captures](../../../capture-runs/2026-11-07T07-03-35-421Z-6ab36bc1.json) passed with no page errors or CSP violations. Both new images were opened and exact-hash reviewed by the Codex agent. The final `npm run verify` passed all **211 tests**, documentation checks, lint (existing warnings), both TypeScript projects, model assets, production build and serverless deployment checks. [Gate log](release-gate.log). No application layout, database schema, production key or function-duration setting is changed. Actual student activity and saved course data are outside this fix.

Source `f4ff0f7` was pushed to `main`. Production deployment `dpl_4mkA4gTDKRnaf8gB52cQuUQSv1Md` is **Ready** for that exact source commit, and Vercel independently passed all 211 tests plus build/deployment checks. The production page serves the new checkpoint client and connection-recovery text, health returns 200, security headers remain, and a staged authoring request without authentication returns 403/`FORBIDDEN`. [Deployment receipt](deployment.json). No signed live-provider generation is claimed.

[GitHub Actions](https://github.com/Bhenny-dev/edupulse-prototype/actions/runs/42350395583) did not start because the account is locked due to a billing issue, as its check annotation states. This is a blocked GitHub job, separate from the passing local and Vercel verification. No billing or workflow bypass was attempted.
