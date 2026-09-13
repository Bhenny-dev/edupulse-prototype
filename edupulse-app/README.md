# EduPulse 0.1.0

React/Vite academic workflow prototype with a connected LangChain/LangGraph AI API, local free Ollama inference, and Postgres vector retrieval.

```powershell
npm ci
# Start Ollama, then:
npm run ai:setup
npm run dev
```

Open http://127.0.0.1:5173. Use an instructor preview locally, add a reference in Settings → AI & Knowledge, then ask Pulse or generate a courseware week. New courseware is a draft requiring instructor review. Provider secrets stay on the server; `.env.example` describes configuration.

`npm run verify` runs lint, typechecks, tests, build and deployment checks. `npm run test:browser` validates desktop/mobile workflows (install Chromium with `npx playwright install chromium`). `npm run ai:smoke` verifies real inference; see the runbook before using it with an active dev server.

Hosted source search works without a model key. Hosted generation needs a configured provider; Vercel cannot access this computer's Ollama. Some academic modules still use prototype data, and courseware storage is device-local.

See the root [feature history](../feature-documentation/README.md), [release features](../feature-documentation/versions/v0.1.0/features/connected-ai.md), [execution plan](../feature-documentation/WORKPLAN.md), and [operations runbook](../feature-documentation/versions/v0.1.0/operations/runbook.md).
