# Run and maintain

## Local free AI

In `edupulse-app`:

```powershell
npm ci
npm run ai:setup
npm run dev
```

Start Ollama first. Setup installs `qwen2.5:3b` and `all-minilm` if absent. The 3B default was chosen because the previously installed 9.7B model exceeded available RAM during testing. Open `http://127.0.0.1:5173/`. Preview an instructor, open Settings → AI & Knowledge, index a reference, then ask Pulse about it. Check and review generated courseware before publishing.

`.env.local` may override `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `AI_DATA_DIR`, `AI_VECTOR_STORE` and `AI_TIMEOUT_MS`. See `.env.example`. Do not run two local API processes against the same PGlite directory. The browser test suite uses separate ports and a separate test data directory.

## Verification

```powershell
npm run verify
npm run test:browser
npm run supabase:check
npm audit --audit-level=high
```

`verify` runs lint, frontend and strict server typechecking, automated tests, production build and deployment contract validation. Browser tests start an isolated app on port 5174 (API 3002), verify desktop/mobile workflows and capture screenshots. Install Chromium with `npx playwright install chromium` on a new machine. CI installs the browser and runs both suites.

For live inference while the app is running:

```powershell
$env:AI_API_URL='http://127.0.0.1:5173/api/ai'
$env:AI_SMOKE_COURSEWARE='true'
npm run ai:smoke
```

Without `AI_API_URL`, the smoke test opens the local store directly; stop the dev server before using that mode. It creates and deletes only its own synthetic reference fixture.

## Hosting

Production follows the `main` branch through the existing Vercel Git integration. Confirm the current commit's CI and Vercel status after pushing. `npm run deployment:check` tests the build/API routing; set `DEPLOYMENT_URL` to also probe an unprotected live deployment. Use `vercel curl` for protected previews.

Default hosted mode is `retrieval`. To use Gemini, configure server-only `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL` in Vercel. Verify the account's current free-tier limits and data policy. No provider key is entered in the app. Hosted semantic indexing additionally needs a reachable Ollama `all-minilm` endpoint via server-only `OLLAMA_BASE_URL` and optional `OLLAMA_API_KEY` bearer authentication. Never expose an unprotected local Ollama port to the internet; use a secured inference deployment. Keep `AI_VECTOR_STORE=supabase` for hosted persistence.

Supabase browser URL/publishable key and their server equivalents remain required for real authentication. Provision accounts and privileged `app_metadata.role` through the institution's administrator. No default administrator password is created.

Model responses are drafts. The API checks structure, answer indices, distinct options and citation numbers; it cannot prove every fact. Index relevant subject references and use narrow weekly topics. Review output before checking/publishing. Health verifies model availability, while `ai:smoke` verifies actual inference. The wire JSON schema omits large string-length ranges for compatibility with the installed Ollama runner; full validation remains on the server.

## Recovery and rollback

Stop requests before restarting a local API process. Preserve `.data` to retain local knowledge. Back up/export important courseware; browser storage is device-specific and quota-limited. Database changes are additive; an application rollback does not require dropping the knowledge tables. Use the previous verified Vercel deployment or a normal git revert for application rollback. Do not overwrite earlier feature snapshots: record a new version and link its validation evidence.
