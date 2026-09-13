const base = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b'
const headers = process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : undefined
try {
  const response = await fetch(`${base}/api/tags`, { headers, signal: AbortSignal.timeout(4000) })
  if (!response.ok) throw new Error('Ollama unavailable')
  const { models } = await response.json()
  for (const name of [model, 'all-minilm']) {
    if (models.some(m => (m.name === name || m.name === `${name}:latest`) && !m.remote_host)) { console.log(`${name}: installed`); continue }
    console.log(`Downloading local model ${name}. This can take several minutes.`)
    const pull = await fetch(`${base}/api/pull`, { method: 'POST', headers, body: JSON.stringify({ name, stream: false }), signal: AbortSignal.timeout(1800000) })
    if (!pull.ok) throw new Error('Model download failed')
    const result = await pull.json()
    if (result.error) throw new Error('Model download failed')
    console.log(`${name}: ready`)
  }
  console.log('Local AI setup complete. Run npm run dev. No API key is required.')
} catch {
  console.error('Could not prepare local models. Install/start Ollama and verify OLLAMA_BASE_URL, then run npm run ai:setup again.')
  process.exitCode = 1
}
