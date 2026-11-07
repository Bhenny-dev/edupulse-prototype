# Validation: Pulse voice and OpenAI limits

The owner’s screenshot contains a generic quota/rate warning. It does not expose the underlying OpenAI response. Code inspection found `insufficient_quota` handling but missing newer credit/spend/usage codes, while discovery treated all HTTP 429 responses generically. The shared classifier now follows OpenAI’s current documented categories and exposes no provider message, account identifier or key. These changes do not increase provider credits or limits.

Three focused contract tests passed for modern OpenAI credit/spend/usage/rate errors, native GPT-5.6 Responses routing, one inference attempt, discovery classification, Retry-After delivery through the actual HTTP handler, credential retention and Tagalog navigation/role boundaries. Earlier provider/operator regression coverage also passed 27 cases. Inference responses are synthetic; no real account balance or paid call was tested.

Eight desktop/mobile browser cases passed for editable mixed-language dictation, explicit Send, conversation playback/resume, deterministic Tagalog navigation, spoken stop, retained prompt and stopped voice loop on billing failure, unsupported languages, denied microphone, closing the panel and typed chat in an unsupported browser. The browser speech APIs and account/provider transports are synthetic. Physical microphone recognition, language accuracy, accent handling and OS pronunciation remain unverified.

The initial normal browser run failed before cases started because the local backend process hit memory pressure. An attempted reuse of a pre-existing server was rejected after detecting it served older source. The final UI fixture uses a dedicated frontend server and synthetic account/provider/speech transports, with backend classification independently exercised by real handler tests. The stale preview was later stopped after its Vite process was found reserving over 2 GB, freeing memory for the capture build. An early dictation fixture’s “My draft” prefix unnecessarily triggered the operator; its question prefix was corrected and transcript persistence is separately exercised by the synthetic archive transport.

## Final release checks

`npm run verify` passed **216 tests**, documentation checks, lint with existing warnings, both TypeScript projects, bundled-model checks, the production build and deployment checks. [Release gate](release-gate.txt). The three focused contracts also passed independently. [Contract log](focused-contracts.txt).

`npm run test:browser -- --config playwright.voice.config.ts` passed all **8** desktop/mobile voice cases against the final source. [Final browser log](voice-browser.txt). The dedicated frontend server avoids starting the AI backend for synthetic speech/provider tests. This does not claim that the entire browser suite passed.

All **6** final capture cases passed with no page errors or CSP violations; all **10** new images were opened and their final hashes attested by the Codex agent. [Capture log](captures.txt), [capture evidence](../../../capture-runs/2026-11-07T11-32-58-618Z-67bf37ca.json). The production preview also asserted the actual `microphone=(self)` response header. Mobile transcript review was recaptured after adding a third message-box line only while voice is enabled. The default voice-off panel retains its layout.

## Wider browser-suite findings

A subsequent full browser run was interrupted after 24 completed desktop cases: **21 passed and 3 failed**. [Partial run](broader-browser-partial.txt). The failures were the baseline assessment-mapping case and two courseware document-formatting cases. Their broad **View** locators can operate the week expander before an item is open, leaving the expected editor/document absent. The dedicated unified-courseware item/menu cases passed in that same run. These courseware components, fixtures and failing tests are unchanged from the previous `main`; the observed locator mismatch is separate from the voice/quota implementation. No courseware interface or assessment behavior was changed to satisfy those tests. The remaining full-suite cases were not run, and these three older browser checks remain unresolved.

## Deployed result

Feature source `a7c7caca8fa5ad97e7d15d32afe67f38783f10fd` was pushed to `main`. Deployment `dpl_VS667Cy7KMqKiUUwwAwCsbdjSbzm` is **Ready** for that exact source with the production domain assigned. Vercel independently passed all **216 tests** and deployment checks. [Deployment receipt](deployment.json). The connected project tool had returned HTTP 403 earlier in this session; the already-authenticated, explicitly scoped Vercel CLI supplied the final evidence.

The public production page, health and provider endpoints returned 200. Served JavaScript contains the optional voice controls and credit recovery handling. The actual response permits `microphone=(self)` and retains CSP; anonymous provider reads expose no account connections and unauthorized courseware generation returns 403/`FORBIDDEN`. [Production receipt](production.json). No physical microphone, live language-recognition accuracy, real-provider inference, private credential access or real account billing was exercised by these public checks.
