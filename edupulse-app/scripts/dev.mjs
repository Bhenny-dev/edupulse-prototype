import { spawn } from 'node:child_process'
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env.local', '--import', 'tsx', 'server/dev.ts'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', process.env.VITE_PORT || '5173', '--strictPort'], { stdio: 'inherit' }),
]
function stop() { for (const child of children) child.kill() }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const child of children) child.on('exit', code => { stop(); process.exitCode = code || 0 })
