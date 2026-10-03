import { spawn } from 'node:child_process'

// Production build (vite preview, with the production security headers) plus
// the local API. Used to capture documentation snapshots of the real app.
const web = process.env.VITE_PORT || '5186', api = process.env.AI_PORT || '3016'
const env = { ...process.env, AI_PORT: api }
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env.local', '--import', 'tsx', 'server/dev.ts'], { stdio: 'inherit', env }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', web, '--strictPort'], { stdio: 'inherit', env }),
]
function stop() { for (const child of children) child.kill() }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const child of children) child.on('exit', code => { stop(); process.exitCode = code || 0 })
