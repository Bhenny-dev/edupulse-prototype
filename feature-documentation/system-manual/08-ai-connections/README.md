# 8 · Choose where Pulse thinks (AI connections)

**Who:** signed-in users (provider keys: instructors and the Dean) · **Where:** Settings → *AI & Knowledge* · Requirements FR-SET (as corrected 2026-09-16), NFR-AI-01/02, FR-RAG-05/06.

## Check the pipeline

**Agentic RAG pipeline** shows what is working right now: the generation model, the free embedding model and reranker (always available, no key), the vector database, the document sandbox and the eight agents. Use **Check status** after changing anything.

![Pipeline status](01-pipeline-status.png)

## Connect a provider

1. In **Pulse AI connection**, open **AI provider**. Free options are labelled: Gemini and Groq free tiers, **OpenRouter · free models**, **Hugging Face Inference · free credits**, or OpenAI/Anthropic with your own key.
2. Paste your key (it is sent once, encrypted by the server, kept in a protected cookie for up to seven days and never shown again) and click **Connect and load models**.
3. Pick a model from the list returned by the provider. For OpenRouter and Hugging Face, free models are listed first and marked “(free)”.

![Free provider options](02-free-provider-options.png)

## Run a model on this device (no key)

Choose **On this device · no API key**, pick **Qwen 2.5 · 1.5B — balanced** (≈1 GB download) or **0.5B — lighter**, then **Download / load local model**. It needs a browser with WebGPU (current Chrome or Edge with graphics acceleration). If your device cannot run it, Pulse says so and keeps the button disabled, as in this capture:

![On-device model](03-on-device-model.png)

In the downloaded local app, **Ollama · local app server** uses models installed with `npm run ai:setup`.
