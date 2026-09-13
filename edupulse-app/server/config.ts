export function config() {
  const hosted = Boolean(process.env.VERCEL)
  return {
    hosted,
    provider: process.env.AI_PROVIDER || (hosted ? (process.env.GEMINI_API_KEY ? 'gemini' : 'retrieval') : 'ollama'),
    model: process.env.OLLAMA_MODEL || 'qwen2.5:3b',
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
    embeddingModel: 'all-minilm',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    database: process.env.AI_VECTOR_STORE || (hosted ? 'supabase' : 'local'),
    localPath: process.env.AI_DATA_DIR || '.data/ai-pgvector',
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    timeoutMs: Math.min(110000, Math.max(5000, Number(process.env.AI_TIMEOUT_MS) || 110000)),
  }
}
