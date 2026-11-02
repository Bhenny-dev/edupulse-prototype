# Validation: reasoning budgets

Run on 31 October on Windows 11, Node 24.13, in `edupulse-app`.

## New and changed tests

Written first and run before the change: 11 failed for the expected reasons (no reasoning allowance, no retry, fixed Ollama window, unread wrapped JSON). After the change they pass.

| Test | File | Checks |
| --- | --- | --- |
| OpenRouter gives a reasoning model bounded thinking on top of the answer budget, read once from the catalogue | `tests/providers.test.ts` | 800-token chat sends `max_tokens` 1,824 with `reasoning: { max_tokens: 1024, exclude: true }`; a model that reasons only when asked, or not at all, keeps 800; a JSON draft sends 7,048 with a 2,048 allowance and `response_format`; one catalogue read for four models |
| An OpenRouter reply whose thinking used the limit is asked once more with thinking off | `tests/providers.test.ts` | an empty reply, or one with more reasoning than its allowance, is retried with `effort: "none"` and 800 tokens; an answer that is itself too long is not retried |
| A model that must think, or refuses to stop, reports the reasoning limit instead of retrying again | `tests/providers.test.ts` | a mandatory model is not retried; an unlisted model is treated as reasoning, and a 400 on its retry becomes the reasoning-limit message without provider text |
| OpenAI reasoning models keep the answer budget and name a reasoning limit without retrying | `tests/providers.test.ts` | `max_output_tokens` 1,824 for an 800-token answer; an incomplete reply with only reasoning reports the reasoning limit; one request |
| Gemini thinking gets room on top of the answer budget | `tests/providers.test.ts` | `maxOutputTokens` 1,824 and 3,024 |
| Ollama context windows hold the whole prompt | `tests/providers.test.ts` | `num_ctx` 4,096, 8,192, 16,384 and 32,768 for growing JSON prompts; 4,096 and 8,192 for chat |
| Model JSON is read from bare, fenced or sentence-wrapped replies, and nothing is repaired | `tests/pulse-tools.test.ts` | four reply shapes give the same tool plan; the largest object wins over an example in prose; replies with no complete object throw |
| Drafts a model wraps in a sentence and a code fence pass every stage without a repair attempt | `tests/pulse-drafting.test.ts` | six stages, six model calls, an 18-week patch |
| A lesson a model wraps in a sentence and a code fence is read on the first attempt | `tests/courseware.test.ts` | one model call, a usable draft |
| OpenRouter web tool uses fixed origins, real annotations and a public topic (changed) | `tests/pulse-drafting.test.ts` | the catalogue is read through the injected transport; findings get `max_tokens` 2,224 with a 1,024 allowance |
| OpenAI routing (changed) | `tests/providers.test.ts` | default chat `max_output_tokens` 2,624 instead of 2,400 |
| A generation test uses the saved credential (changed) | `tests/connections.test.ts` | the connection test sends `max_output_tokens` 3,072 to a Responses model |

## Gate

| Command | Result |
| --- | --- |
| Targeted suites (`providers`, `pulse-tools`, `pulse-drafting`, `courseware`) | 47 passed |
| `connections`, `ai`, `providerOAuth` suites | 43 passed |
| `npm run lint` | passed (existing warnings only) |
| `npm run typecheck` | passed |
| `npm run verify` (documentation check, lint, typecheck, model files, tests, build, deployment check) | passed; 185 of 185 tests |
| `npm run test:browser` | 2 November, on the change applied to `main` after the landing release (`581d374`), one worker and a fresh data folder: 193 passed, 19 skipped (single-project checks), 0 failed. `npm run verify` on the same tree: 185 of 185 tests, build and deployment checks passed |

## Facts checked at the source

- OpenRouter reasoning: on Chat Completions `max_tokens` covers reasoning and the answer; a reply whose reasoning used it returns `finish_reason: "length"` with empty content; `effort: "none"` disables reasoning and models that must reason reject it; `exclude` keeps reasoning out of the reply. Source: [reasoning tokens](https://openrouter.ai/docs/use-cases/reasoning-tokens).
- `cohere/north-mini-code:free`: 256,000-token context, 64,000-token maximum output, `reasoning` and `include_reasoning` supported, no `response_format`; `reasoning.mandatory` is false. Source: the public catalogue and `/api/v1/models/cohere/north-mini-code:free/endpoints`, read on 31 October.
- Gemini: the output limit applies to thinking and answer combined, and 2.5 Flash and Pro think by default. Source: [thinking](https://ai.google.dev/gemini-api/docs/thinking).
- Ollama: a prompt longer than `num_ctx` keeps its first `num_keep` tokens (4 by default) and its end, or is rejected when context shifting is off; a request with a different explicit `num_ctx` reloads the runner. Source: `llm/llama_server.go`, `api/types.go` and `server/sched.go` on the `ollama/ollama` main branch, read on 31 October.

No live model request was made.
