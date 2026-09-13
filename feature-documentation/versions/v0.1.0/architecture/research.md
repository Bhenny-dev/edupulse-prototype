# Research and decisions

Reviewed 2026-09-13. Primary sources:

- [LangGraph JavaScript Graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api): explicit state, nodes, conditional edges and recursion limits support a bounded retrieval and validation loop.
- [LangChain ChatOllama](https://docs.langchain.com/oss/javascript/integrations/chat/ollama): use the real model integration with local inference, rather than a browser provider picker with no backend.
- [Supabase vector columns](https://supabase.com/docs/guides/ai/vector-columns): pgvector supports persisted semantic embeddings and similarity search in Postgres.
- [Supabase built-in AI](https://supabase.com/docs/guides/functions/ai-models): gte-small supplies 384-dimensional English embeddings without an external embedding provider key. Larger text-generation models still need a reachable inference server.
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing): hosted free tiers are quota-limited and use provider credentials; eligibility and data handling depend on the account. Do not imply unlimited free cloud inference.

The Supabase changelog endpoints were unavailable during initial browsing. Relevant product docs, the applied migration, live SQL queries and the deployed API verified compatibility.

Final embedding choice: Ollama `all-minilm` supplies one consistent 384-dimensional collection locally and on a reachable hosted inference endpoint. Although Supabase's `gte-small` also has 384 dimensions, its vectors are not interchangeable with MiniLM; no mixed embedding collection is created. [Ollama embedding API](https://docs.ollama.com/capabilities/embeddings), [PGlite extensions](https://pglite.dev/extensions/).

Follow-up verification on 2026-09-14 used [Ollama structured output documentation](https://docs.ollama.com/capabilities/structured-outputs). Supplying the full application schema with very large string-length ranges crashed the installed Ollama 0.23.1 runner. Removing those wire constraints resolved the observed crash; the full Zod schema still validates responses on the API. The free default is `qwen2.5:3b` with a 4,096-token context and bounded output. A 1.5B model was less reliable at citations in testing; a larger installed model exceeded this machine's available memory.

Loop engineering means bounded application retries, output validation, timeouts, and termination. Graph engineering means an explicit state graph and visible execution events, not hidden chain-of-thought or uncontrolled autonomous actions.
