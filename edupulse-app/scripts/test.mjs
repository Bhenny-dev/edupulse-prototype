import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const files = readdirSync('tests').filter(name => name.endsWith('.test.ts')).sort().map(name => `tests/${name}`)
if (!files.length) throw new Error('Verification requires test files. Check deployment ignore rules.')
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
