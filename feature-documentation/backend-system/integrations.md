# Open-source integrations considered

On 2026-10-04 we scanned GitHub for projects that could make the RAG pipeline and the agents more accurate or better governed, or save build time. Each candidate was measured against the specification:
* free, with no paid service (NFR-AI-01/02);
* runs where EduPulse runs: Node.js on Vercel, the browser, or ONNX/WebAssembly;
* a permissive license and active maintenance;
* no excluded features: no plagiarism, integrity or AI-authorship scoring, and no at-risk prediction (NFR-AI-08);
* no user-facing retrieval tuning (NFR-USE-03).

Star counts and dates are from the GitHub API on the day of the scan.

## Adopted

| Project | What we use | Why |
| --- | --- | --- |
| [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai) (Apache-2.0, updated 2026-10-04) | Agent run records use `gen_ai.operation.name` = `invoke_agent` and `gen_ai.agent.name` (FR-AGENT-05) | A standard naming, with no dependency. A tracing tool such as Langfuse, Phoenix or Opik can later read EduPulse agent runs without a schema change. The conventions are still at *Development* stability, so EduPulse records only the stable core fields. |
| [deepset/prompt-injections](https://huggingface.co/datasets/deepset/prompt-injections) (Apache-2.0, 662 labelled rows) | Evaluation data for the document injection scanner (FR-RAG-03, FR-AGENT-06) | A public benchmark replaces guesswork. New patterns were designed on the training split, and the held-out test split showed recall rising from 3.3% to 18.3% (English rows: 4.3% to 23.9%). Precision stayed at 1.0, with no false flags in 155 paragraphs of real course documents. Details are in [session-generated/2026-10-04-agent-governance](../session-generated/2026-10-04-agent-governance/README.md). |
| [langchain-ai/langgraphjs](https://github.com/langchain-ai/langgraphjs) (MIT, 3.3k stars) and [langchainjs](https://github.com/langchain-ai/langchainjs) (MIT, 18k stars) | Already the agent framework | The Guardian is a new LangGraph node in the existing graph. No new framework was needed. |

## Deferred, with a path to adoption

| Project | Facts | Why not now | When to adopt |
| --- | --- | --- | --- |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | TypeScript, 35k stars, MIT core plus enterprise files, updated 2026-10-03 | Needs its own server stack (Postgres, ClickHouse, Redis), which is too heavy for an 8 GB development machine and a serverless deployment. The cloud tier would send prompts outside the institution. | When the college can self-host it. EduPulse’s OpenTelemetry-named records map directly. |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | TypeScript, MIT, 25.7k stars, updated 2026-10-04 | Red-teaming needs a grader model and a large dependency tree. The Guardian is deterministic, so its labelled cases are tested directly in `npm test`. | For red-team sweeps of model output with a local Ollama grader, run as an optional `npx promptfoo` job rather than an app dependency. |
| [naptha/tesseract.js](https://github.com/naptha/tesseract.js) | JavaScript, Apache-2.0, 38.7k stars | OCR of scanned PDFs needs page rendering (a native canvas) and more CPU than the 30-second extraction sandbox allows. | Run OCR in the browser before upload, for documents the quality check reports as scanned. |
| [traceloop/openllmetry-js](https://github.com/traceloop/openllmetry-js) | TypeScript, Apache-2.0 | Exports OpenTelemetry spans to a collector, but EduPulse has no collector yet. | Together with Langfuse or Phoenix. |
| [huggingface/transformers.js](https://github.com/huggingface/transformers.js) with a prompt-injection classifier | JavaScript, Apache-2.0 | A DeBERTa classifier is roughly 200 MB or more, and slower than the pattern scanner on every passage. Indirect injection in documents is already neutralised before generation. | If measured false negatives in real uploads justify the cost. |

## Rejected

| Project | Reason |
| --- | --- |
| [protectai/llm-guard](https://github.com/protectai/llm-guard) | Archived (last push July 2026), and Python |
| [protectai/rebuff](https://github.com/protectai/rebuff) | Archived (last push August 2024) |
| [NVIDIA-NeMo/Guardrails](https://github.com/NVIDIA-NeMo/Guardrails), [guardrails-ai/guardrails](https://github.com/guardrails-ai/guardrails) | Python services: a second runtime beside Node.js, for rules EduPulse states more transparently in code |
| [data-privacy-stack/presidio](https://github.com/data-privacy-stack/presidio) | Python. PII detection is not a stated requirement, and redaction would also remove legitimate contact details from the product guide. |
| [arcjet/arcjet-js](https://github.com/arcjet/arcjet-js) | A cloud service: prompts would leave the system, contrary to NFR-AI-02 |
| [vibrantlabsai/ragas](https://github.com/vibrantlabsai/ragas), [confident-ai/deepeval](https://github.com/confident-ai/deepeval), [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix) | Python. EduPulse already evaluates retrieval, abstention and verification with `npm run eval:rag` on real documents (FR-RAG-14). |

## Structure corrections made during the scan

* **One agent registry.** The agent list had been hard-coded in three places: the health API, the AI settings chips and the answer timeline colours. All three now read `src/lib/rag/registry.ts`, which also holds each agent’s job title, task and goal.
* **Appropriate use in code, not only in the prompt.** The Writer’s system prompt already asked the model not to answer students’ active assessment items. That depended on a model obeying an instruction. The Guardian now enforces it before any model runs.
* **The specification records the October 4 correction** ([REQUIREMENTS.md](../../edupulse-app/docs/REQUIREMENTS.md), section 1.8b). The system admin role was added without a requirement, and NFR-SEC-06/08 still ruled out its audit console.
