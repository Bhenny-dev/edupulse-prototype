// Explicit one-time maintenance. Back up first, rehearse with ROLLBACK, then --apply.
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { resetTables, foundationTables, tableDigest, accountDigest, teachingResetSQL } from './lib/reset-teaching-sql.js'
const args = process.argv.slice(2), option = args.indexOf('--output'), output = option >= 0 && resolve(args[option + 1] || '')
if (['--backup', '--check-transaction', '--apply'].filter(flag => args.includes(flag)).length > 1) throw new Error('Choose exactly one maintenance phase')
if (!output || !output.startsWith(resolve('.data') + sep)) throw new Error('Use --output <ignored .data directory> [--backup | --check-transaction | --apply]')
if ((await readFile('supabase/.temp/project-ref', 'utf8')).trim() !== 'xyziepdkdvvuhgkymooo') throw new Error('Expected the linked EduPulse project')
await mkdir(output, { recursive: true })
const cli = join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')
function run(file: string) {
  try { return JSON.parse(execFileSync(process.execPath, [cli, 'db', 'query', '--linked', '--file', file, '--output', 'json', '--yes'], { encoding: 'utf8', maxBuffer: 160_000_000, stdio: ['ignore', 'pipe', 'pipe'] })) }
  catch (error: any) { throw new Error(`The linked database did not confirm the operation. Nothing is claimed complete. ${String(error.stderr || '').replace(/[^\x20-\x7e\n]/g, '').slice(-500)}`) }
}
const manifestFile = join(output, 'manifest.json')
if (args.includes('--backup')) {
  if (await access(manifestFile).then(() => true, () => false)) throw new Error('A backup manifest already exists. Use another private directory; never overwrite it.')
  const digests: Record<string, string> = {}, counts: Record<string, number> = {}
  for (const table of [...resetTables, ...foundationTables]) {
    const file = join(output, `${table}.json`), sql = join(output, 'read.sql')
    await writeFile(sql, `SELECT ${tableDigest(table)} AS digest,coalesce(jsonb_agg(to_jsonb(t)),'[]') AS data FROM ${table} t;`, { mode: 0o600 })
    const result = run(sql).rows[0]
    await writeFile(file, JSON.stringify(result), { mode: 0o600, flag: 'wx' })
    digests[table] = result.digest; counts[table] = result.data.length
    console.log(JSON.stringify({ backedUp: table, rows: result.data.length }))
  }
  const sql = join(output, 'read.sql')
  await writeFile(sql, `SELECT ${accountDigest} AS digest;`, { mode: 0o600 })
  digests.accounts = run(sql).rows[0].digest
  await writeFile(manifestFile, JSON.stringify({ project: 'xyziepdkdvvuhgkymooo', createdAt: new Date().toISOString(), digests, counts }), { mode: 0o600, flag: 'wx' })
  console.log(JSON.stringify({ backupComplete: true, tables: Object.keys(counts).length }));
} else {
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'))
  if (manifest.project !== 'xyziepdkdvvuhgkymooo') throw new Error('Backup project mismatch')
  const hash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
  const backupHash = createHash('sha256')
  for (const table of [...resetTables, ...foundationTables]) {
    const bytes = await readFile(join(output, `${table}.json`))
    const saved = JSON.parse(bytes.toString('utf8'))
    if (saved.digest !== manifest.digests[table] || !Array.isArray(saved.data) || saved.data.length !== manifest.counts[table]) throw new Error(`Backup verification failed: ${table}`)
    backupHash.update(table).update(bytes)
  }
  const backupFingerprint = backupHash.digest('hex')
  const rehearsalSQL = teachingResetSQL(manifest.digests, false)
  const sqlHash = createHash('sha256').update(rehearsalSQL).digest('hex')
  const apply = args.includes('--apply'), receiptFile = join(output, 'rollback-checked.json')
  if (await access(join(output, 'applied.json')).then(() => true, () => false)) throw new Error('This reset already has an application receipt. Verify the database; do not replay it.')
  if (apply) {
    const checked = JSON.parse(await readFile(receiptFile, 'utf8'))
    if (checked.manifestHash !== hash || checked.backupFingerprint !== backupFingerprint || checked.sqlHash !== sqlHash) throw new Error('Rehearse this exact backup and SQL with --check-transaction before applying')
  }
  const sql = join(output, apply ? 'apply.sql' : 'rollback.sql')
  await writeFile(sql, teachingResetSQL(manifest.digests, apply), { mode: 0o600 })
  if (!apply && !args.includes('--check-transaction')) { console.log(JSON.stringify({ dryRun: true, backupTables: Object.keys(manifest.counts).length })); process.exit(0) }
  const result = run(sql)
  const receipt = result.rows?.[0]?.receipt
  if (receipt?.phase !== (apply ? 'commit' : 'rollback-check') || receipt.syllabi !== 0 || receipt.items !== 0 || receipt.publications !== 0 || receipt.accounts_preserved !== true || receipt.institutional_preserved !== true) throw new Error('No complete reset receipt returned. Verify the database before any retry; a lost response does not prove rollback.')
  await writeFile(join(output, apply ? 'applied.json' : 'rollback-checked.json'), JSON.stringify({ manifestHash: hash, backupFingerprint, sqlHash, checkedAt: new Date().toISOString(), result }), { mode: 0o600, flag: 'wx' })
  console.log(JSON.stringify({ applied: apply, rollbackChecked: !apply, receipt: result.rows }))
}
