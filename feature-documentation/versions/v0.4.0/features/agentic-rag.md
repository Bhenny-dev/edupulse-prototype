# Agentic RAG: named agents that plan, research, rank, write, verify and correct

Requirements: FR-RAG-05–13, NFR-AI-03/04/06. Screenshots: System Manual [5 · Ask Pulse](../../../system-manual/05-ask-pulse/README.md), [6 · Compare and references](../../../system-manual/06-compare-and-references/README.md), [3 · Courseware generation and review](../../../system-manual/03-courseware-generation-and-review/README.md). Design: [architecture](../architecture/design.md).

## What the user sees

* **Verified answer.** Every claim in an answer is underlined by status: solid = supported by its cited source, double = corroborated by two or more documents, dotted = partial or missing citation, wavy red = not found in the sources. Hovering shows the support score and best-matching source. Badges summarize groundedness, citation accuracy, corroboration and the checking method.
* **Citations that open sources.** `[n]` markers are buttons that open the exact passage with its title, page and section, origin (your library, product guide or attachment), match type (vector + keyword, semantic, keyword) and the reranker score.
* **Agent timeline.** “How Pulse worked on this” lists each agent step with its detail and duration, e.g. *Planner → Researcher ×2 → Ranker → Writer → Verifier → Corrector*.
* **Revision on request.** *Request a revision* sends a note; the agents rerun with the previous answer in context.
* **Compare.** From the library, two selected documents produce an alignment table (shared, related, only in one) and coverage.
* **References.** “Find books about …” routes to the Librarian, which returns real catalog entries with links, identifiers (ISBN, DOI, Open Library work) and relevance, plus *Copy citation*.
* **Courseware consistency.** Each generated week shows outline coverage per topic and outcome (covered, partial, missing, and where it was found) and how many statements the outline or references support.

## How it decides

1. **Plan.** Rules classify the task without a model call and write queries.
2. **Research in parallel.** One LangGraph `Send` branch per query runs hybrid search.
3. **Rank.** Duplicates across queries are fused, the cross-encoder scores every candidate against the question, passages far below the best match are dropped, near-duplicates within a document are removed and each document contributes at most three passages.
4. **Write.** The Writer receives neutralized evidence as JSON data under a fixed system prompt and must cite. Without a model, an extractive Writer quotes the best-matching sentences.
5. **Verify and corroborate.** Each claim is scored against every passage. Numbers, proper nouns and absolute words (only, never, always, not…) must agree with the source before support is granted.
6. **Correct.** Wrong or missing citations are fixed without another model call. Unsupported claims trigger one revision; if nothing can be verified, cited source excerpts replace the answer, and the user is told why.

## Free inference options

On-device WebLLM (Qwen 2.5 0.5B/1.5B), local Ollama, or the user's own key for Gemini, Groq, OpenRouter (free `:free` models listed first), Hugging Face Inference Providers (free credits), OpenAI or Anthropic. Keys are encrypted into an HttpOnly, SameSite=Strict cookie bound to the account and never returned to JavaScript.

## Boundaries

Supported ≠ true: the Verifier checks agreement with retrieved sources. A sentence that reuses a source's words with reversed meaning can still pass; the evaluation documents this. Answers and drafts remain advice for instructor review; Pulse never publishes, grades or approves.
