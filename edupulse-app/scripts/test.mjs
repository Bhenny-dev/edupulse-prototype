import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const files = readdirSync('tests').filter(name => name.endsWith('.test.ts')).sort().map(name => `tests/${name}`)
if (!files.length) throw new Error('Verification requires test files. Check deployment ignore rules.')
// Each database suite starts a Postgres WASM runtime. Serialize files so the
// verification gate also fits development machines running local inference.
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...files], { stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
