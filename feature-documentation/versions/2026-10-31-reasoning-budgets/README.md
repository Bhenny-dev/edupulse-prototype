# Reasoning models keep their answer budget

A first, short request to **Cohere: North Mini Code (free)** (`cohere/north-mini-code:free`) on OpenRouter ended with *The model reached its output limit before completing the response*. The model reasons before it answers, and OpenRouter draws that reasoning from the same output limit as the answer ([reasoning tokens](https://openrouter.ai/docs/use-cases/reasoning-tokens)). A general chat reply had 800 tokens for both, and a Pulse tool plan 1,800. The reasoning used the limit, and the reply came back empty with `finish_reason: "length"`. The request was not too large; the budget was not meant for reasoning.

The same structure affected other connected models. OpenAI's GPT-5 and o-series models received `max_output_tokens: 800` for general chat. Gemini 2.5, the hosted default model, thinks by default and counts the thinking toward `maxOutputTokens` ([thinking](https://ai.google.dev/gemini-api/docs/thinking)). All 16 free (`:free`) models in OpenRouter's catalogue on 31 October support reasoning, and North Mini Code also lists no JSON mode (`response_format`).

## Changes

- `server/reasoning.ts` sets the reasoning allowance: half the answer budget, between 1,024 and 2,048 tokens, added on top of it. It also reads how each OpenRouter model reasons from the public model catalogue (`supported_parameters`, `reasoning.mandatory`, `reasoning.default_enabled`).
- OpenRouter: a model that reasons by default or always gets the allowance as `reasoning.max_tokens`, with `exclude: true`. A model that reasons only when asked, or not at all, keeps the plain budget. If the reasoning still uses the whole limit, the request is repeated once with `reasoning.effort: "none"`. A model that must reason, or rejects that, reports *The model spent its output limit on hidden reasoning before it wrote an answer*.
- OpenAI Responses and Gemini get the allowance on top of the answer budget. OpenAI reports the same reasoning-limit message without a retry.
- Web research applies the same rules to its OpenRouter and OpenAI requests.
- `parseModelJson` reads Pulse tool plans, draft stages and courseware drafts from replies that wrap the JSON in a sentence or a code fence. It repairs nothing; the schema checks still decide.
- Both Ollama paths size `num_ctx` for the whole prompt (4,096, 8,192, 16,384 or 32,768 tokens). Before, chat and tool plans used 4,096 tokens, and Ollama drops the start of a prompt that does not fit, where the instructions are.

No dependency, migration, role, interface layout or saved-data change. Nothing is applied or saved by a retry; both attempts stay inside the existing request time budget.

## Capacity scan

Budgets are for the visible answer, in tokens.

| Path | Answer budget | Prompt and context | Reasoning models before | Now |
| --- | --- | --- | --- | --- |
| General chat reply | 800 | last 12 messages within 14,000 characters, plus up to 6,000 characters of page and memory context | Reasoning could use all 800 | Plus 1,024 for reasoning |
| Other chat (library answers, drafts in chat) | 1,600 | same window, plus retrieved sources | Same risk | Plus 1,024 |
| Pulse tool plan | 1,800 | up to 26,000 characters | Same risk; no JSON mode broke parsing | Plus 1,024; wrapped JSON is read |
| Draft stage, revision | 5,000 | up to 26,000 characters per stage | Same risk | Plus 2,048 |
| Courseware week | 6,000 | topics, outcomes, week plan, retrieved references and up to 1,200 characters of reference text (all of it in syllabus-only mode) | Same risk | Plus 2,048 |
| Connection test | 2,048 | fixed short prompt | Same risk | Plus 1,024 |
| Web research (OpenRouter, OpenAI) | 1,200, 1,600 | public topic only | An empty reply fell back to Wikipedia | Plus 1,024 |
| On-device (Qwen 2.5, 1.5B or 0.5B) | 1,000 chat, 2,200 JSON | 6,000-character tool-plan context | Not reasoning models | Unchanged |
| Ollama (default `qwen2.5:3b`) | 1,000 chat, 2,200 JSON, or the caller's budget | 4,096-token window; 16,384 for JSON budgets above 4,096 | Not a reasoning model; long prompts lost their instructions | Window sized to the prompt |

## Known limits

- General chat keeps an 800-token answer budget (about 600 words). A long answer from any model can still reach it; raising it is a product decision.
- Groq and Hugging Face also host reasoning models. Their reasoning can appear inside the reply text and uses the same limit; EduPulse still sends them the plain answer budget. This was not tested against those services.
- **AI settings** does not show which models reason or lack a JSON mode.
- A reasoning reply and its single retry both count toward the provider's request limits, including OpenRouter's free-tier daily limit, and toward the hosted 110-second request budget.
- No live request to North Mini Code was made: this environment holds no OpenRouter key, and `.env.local` is never read. The behavior is tested against OpenRouter's documented response shapes with synthetic transports.

See [validation](validation/results.md). The interface layout is unchanged, so existing screenshots remain applicable; the new alert text appears only when a model fails, and no existing capture shows it. The [Backend System guide](../../backend-system/README.md), [AI connections](../../system-manual/08-ai-connections/README.md) and [Pulse actions](../../system-manual/09-pulse-actions/README.md) describe the behavior.
