import { createServer } from 'node:http'
import { handleNodeRequest } from './node-adapter.js'

process.env.AI_LOCAL_MODE = 'true'
const port = Number(process.env.AI_PORT) || 3001
const server = createServer((req, res) => {
  void handleNodeRequest(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end('API request failed') })
})
// The AI handler enforces its own budget (AI_TIMEOUT_MS, up to 10 minutes locally); Node's 5-minute default must not cut it short.
server.requestTimeout = 0
server.listen(port, '127.0.0.1', () => console.log(`EduPulse local API: http://127.0.0.1:${port}/api/ai`))
