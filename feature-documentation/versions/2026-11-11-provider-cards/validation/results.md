# Validation

| Check | Result |
| --- | --- |
| Type checking | `npm run typecheck` passed for both projects. |
| Lint | `npm run lint` passed with existing warnings. |
| Native suite | Isolated `npm test`: 300 passed, 0 failed/cancelled/skipped. |
| Browser provider flows | 20 passed on desktop and phone against the production capture build: Gemini save/reload, logos and compact cards, removed settings library, existing provider/model/error/OAuth recovery and loading states. The temporary local Playwright config serves the compiled app plus the native retrieval API; provider responses are synthetic. |
| Model artifacts | `npm run models:fetch` passed pinned checksum verification. |
| Production build | `npm run build` passed with existing bundle/dynamic-import warnings. |
| Deployment checks | `npm run deployment:check` passed built assets, API routing, serverless health and public retrieval checks. No deployment was performed. |
| Documentation | `npm run docs:check` passed links, screenshots, capture evidence, route coverage and freshness. |
| Capture scenes | Nine provider/local-model/Pulse-intake scenes passed; six filtered walkthrough/capture checks passed; the retained source-answer scene also passed with real PDF extraction/indexing and an explicitly scoped native summary request. |
| Image review | Codex agent opened all 24 changed/new screenshots and recorded exact hashes. Sixteen obsolete settings-library/comparison images and their scenes were removed. This is not human acceptance. |

Successful capture evidence: [provider, loading, local-model and retained Pulse intake](../../../capture-runs/2026-11-11T12-41-22-280Z-f71c8567.json), [shared/mobile settings](../../../capture-runs/2026-11-11T12-37-13-049Z-033be84e.json).

The first concurrent native/browser run exceeded available machine memory, producing V8 allocation failures and browser module-load/timeouts. It was stopped; those incomplete runs are not counted as passes. Production capture checks were rerun separately. No runtime behavior, authorization, test assertion or paid limit was weakened to obtain a passing result.

Provider UI checks use synthetic credentials and provider responses. They establish selection, saved-state rendering/reload, error recovery, authorization boundaries and layout; they do not establish a real account's Gemini quota or paid inference. No real provider key was supplied or inference purchased.

The retained-source pipeline check [passed](../../../capture-runs/2026-11-11T12-56-47-113Z-a043cbd2.json) after decoupling its source preparation from the removed upload scene. The harness selects the server path and the same scoped summary task used by Pulse retained-file actions. Initial setup expected HTTP 200 instead of the API's correct 201 Created; that assertion was corrected. Earlier attempts used unscoped/system-search requests and did not produce the expected citation graph; no production lookup or generation behavior was changed. Image writes were intentionally suppressed for this setup check, so it does not add or replace screenshots.
