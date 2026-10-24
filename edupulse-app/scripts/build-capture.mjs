import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { captureSource } from './lib/capture-source.mjs'

const source = captureSource()
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'capture', '--outDir', 'dist-capture'], { stdio: 'inherit' })
if (result.error) throw result.error
if (result.status) process.exit(result.status)
if (captureSource().sourceDigest !== source.sourceDigest) throw new Error('Source changed during capture build. Rebuild before capturing.')
writeFileSync('dist-capture/capture-build.json', `${JSON.stringify({ ...source, captureBuildMode: 'capture', builtAt: new Date().toISOString() }, null, 2)}\n`)
