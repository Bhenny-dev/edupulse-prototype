// Explicit maintenance operation. Plans, source identities and receipts stay private.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve, join, sep } from 'node:path'
import { seededSectionRetirement, retireSectionsSql } from './lib/seeded-section-retirement.js'

const args = process.argv.slice(2), option = (name: string) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
const dir = resolve(option('--output') || '.data/load-correction-20261125'), owner = option('--owner')
if (!dir.startsWith(resolve('.data') + sep) || !owner || !/^[0-9a-f-]{36}$/.test(owner)) throw Error('Use an ignored .data directory and an explicit instructor UUID.')
if ((await readFile('supabase/.temp/project-ref', 'utf8')).trim() !== 'xyziepdkdvvuhgkymooo') throw Error('The linked project must be EduPulse.')
await mkdir(dir, { recursive: true })
const privateJSON = async (path: string) => { const bytes = await readFile(path); return JSON.parse((bytes[0] === 255 && bytes[1] === 254 ? bytes.toString('utf16le') : bytes.toString('utf8')).replace(/^\uFEFF/, '')) }
const live = (await privateJSON(join(dir, 'before.json'))).rows[0].snapshot
const baseline = await privateJSON(resolve(option('--baseline') || '.data/population-20261125/before.json'))
const plan = seededSectionRetirement(live, baseline, owner)
await writeFile(join(dir, 'reviewed-plan.json'), JSON.stringify(plan), { mode: 0o600 })
const apply = args.includes('--apply'), rollback = args.includes('--check-transaction')
if (apply && rollback) throw Error('Choose apply or transaction rehearsal.')
console.log(JSON.stringify({ retainedClasses: plan.kept.length, retireClasses: plan.retired.length, dryRun: !apply && !rollback }))
if (apply || rollback) {
 const actor = live.accounts.find((a: any) => a.role === 'dean' && a.suspended !== 'true' && (!a.banned_until || Date.parse(a.banned_until) < Date.now()))
 if (!actor) throw Error('An existing active Dean actor is required.')
 const source = await privateJSON(join(dir, 'workbook-source.json'))
 const label = rollback ? 'rehearsal' : 'applied', file = join(dir, label + '.sql')
 await writeFile(file, retireSectionsSql(plan, actor.id, source.sha256, rollback), { mode: 0o600 })
 const cli = join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')
 try {
  const output = execFileSync(process.execPath, [cli, 'db', 'query', '--linked', '--file', file, '--output', 'json'], { encoding: 'utf8', maxBuffer: 150_000_000, stdio: ['ignore', 'pipe', 'pipe'] })
  await writeFile(join(dir, label + '.result.json'), output, { mode: 0o600 })
  console.log(JSON.stringify({ rollback, applied: apply, result: JSON.parse(output).rows }))
 } catch (error: any) {
  await writeFile(join(dir, label + '.error.log'), String(error.stderr || 'No diagnostic'), { mode: 0o600 })
  throw Error('Correction stopped. Inspect the private diagnostic; no success is claimed.')
 }
}
