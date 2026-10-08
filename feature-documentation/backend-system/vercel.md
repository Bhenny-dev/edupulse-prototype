# Vercel configuration

**Project:** `edupulse-prototype` (team `bhenny-benlor-d-riveras-projects`) · **Production:** https://edupulse-prototype.vercel.app · **Root directory:** `edupulse-app`

The settings below come from the repository (`edupulse-app/vercel.json`, `.vercelignore`, `scripts/check-deployment.ts`), the authenticated Vercel REST API, and live HTTP checks of production. The Claude Vercel connector returned *403 — re-authenticate to this scope* on 2026-10-02; the REST API was available on 2026-10-03.

## Build

| Setting | Value | Why |
| --- | --- | --- |
| Build command | `npm run verify` | Vercel runs the full gate: lint → typecheck → fetch pinned models → unit and integration tests → production build → deployment check. A failing test fails the deployment. |
| Output | `dist/` (Vite) | Static app. `dist/ocr/` holds the on-device OCR files (Tesseract worker, three LSTM engine builds, the English model and PDF.js's JBIG2, JPEG 2000 and colour-profile decoders, about 15 MB). They are served from the app's own origin because the Content-Security-Policy allows scripts only from `'self'`; a browser downloads one engine build, the model and the decoders the first time someone runs OCR. The deployment check fails the build if any of them is missing. |
| Ignored on upload | `.data`, `.env.local`, `node_modules`, `test-results`, `supabase/.temp`, `models/` | Local databases and secrets never leave the machine; models are re-downloaded and checksum-verified during the build |

## Function

| Setting | Value |
| --- | --- |
| Function | `api/ai.ts` (the single API endpoint) on Fluid Compute, Node.js runtime |
| `maxDuration` | 120 s (the API itself stops AI work at 110 s and returns a clear timeout message) |
| `includeFiles` | `models/**` (MiniLM embeddings and ms-marco reranker, ONNX int8) and the ONNX WebAssembly runtime (`ort-wasm-simd-threaded.mjs`, `.wasm`), which is loaded by a computed path the bundler cannot trace |
| ONNX threads | 1 on Vercel (`AI_ONNX_THREADS` overrides) |

## Routing and headers

* **Rewrite:** every path except `/api/...` serves `index.html`, so deep links such as `/settings?tab=ai-provider` work.
* **Headers on every route:**

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

`'wasm-unsafe-eval'` allows WebAssembly (the on-device model and ONNX) without allowing JavaScript `eval`. The UI screenshots in the System Walkthrough and System Manual were captured with this policy enforced; the capture logs record no violations.

## Environment variables

Names only; values stay in the Vercel dashboard and are never written to the repository or this document.

| Variable | Needed for |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Sign-in and browser-side Supabase client (public by design) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | API access to Supabase as the signed-in user |
| `SUPABASE_JWKS_URL` | Configured in Vercel but currently unused; the API validates tokens through Supabase `auth.getUser` |
| `AI_CONNECTION_SECRET` | 64 hex characters; encrypts personal provider keys into the connection cookie. Without it, connecting a provider on the hosted site is refused. |
| `AI_PROVIDER`, `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `HF_TOKEN` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` and matching `*_MODEL` | Used by the local workspace only. Hosted accounts never use a server-wide key: each account connects its own provider, otherwise Pulse runs in *retrieval* mode (quoted, verified source excerpts) or on the device. |
| `AI_MODEL_DOWNLOAD`, `AI_MODEL_DIR`, `AI_ONNX_THREADS` | Optional model packaging overrides |

The Vercel REST API lists the five Supabase variables above and two separate `AI_CONNECTION_SECRET` entries, scoped to production and preview. Both secrets are write-only (`type: sensitive`, `visibility: secret`); their values were generated independently and never entered into the repository. The production deployment was rebuilt after they were added. No server-wide generation provider is configured, so hosted guest sessions use retrieval. A personal provider connection with a valid key has not been tested end to end on production.

## Deployment check

`scripts/check-deployment.ts` runs inside every build and fails the deployment unless:

* the function limit is at least 120 s and the models and ONNX runtime are packaged;
* the strict CSP is configured and the SPA rewrite does not capture `/api/ai`;
* the production bundle contains no preview sign-in personas (they exist only in development and in the documentation capture build, `npm run build:capture` → `dist-capture`);
* in the built serverless handler: health returns 200 with embeddings **loaded** from the packaged files, a chat request runs the agent pipeline (the Ranker step is present) and its quoted excerpts verify, sandboxed extraction returns 200, and a guest cannot save a workspace (403).

## Production status

| Check (2026-10-02, before this release was pushed) | Result |
| --- | --- |
| `GET /api/ai?action=health` | 200, `version: 0.2.0`, provider `retrieval`, database `supabase` |
| Security headers on `/` | Not present on the 0.2.0 deployment; added by this release's `vercel.json` |

The status after pushing v0.4.0 is recorded in [versions/v0.4.0/validation/results.md](../versions/v0.4.0/validation/results.md).

**Current production (2026-10-03):** commit `0c8edbe` deployed as `dpl_8PJwgNyoMNfJ8CENNcBiAo6A39nV`, passed 59 tests and the deployment check, and served API version 0.4.0. A later documentation-only deployment may supersede this build. Live requests confirmed the CSP and `nosniff` headers, public source-grounded chat with 100% citation accuracy on the checked question, references from all three open catalogs, sandboxed PDF extraction, and guest write denial. The [release validation record](../versions/v0.4.0/validation/results.md#production-release) lists each result and the remaining authenticated-session limit.

## Dashboard pages to capture for the report

1. *Project → Deployments* showing the v0.4.0 production deployment as **Ready**.
2. *Deployment → Build Logs*, end of `npm run verify` (test counts and “deployment check passed”).
3. *Project → Settings → Environment Variables* (names only; values hidden).
4. *Project → Settings → Functions* (region and 120 s duration).
5. *Project → Settings → Domains* (`edupulse-prototype.vercel.app`).

The REST API already confirmed deployment readiness, build-test counts, environment variable names and scopes, and the production domain. Dashboard screenshots are optional report artifacts. To let the Claude connector read them, re-authorise it for the `bhenny-benlor-d-riveras-projects` team in claude.ai connector settings.
