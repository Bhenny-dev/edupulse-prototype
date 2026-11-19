// Authorized administrative operation. Default: private dry run.
// Adds a course's weekly teaching materials and assessments from a courseware pack to an existing instructor's workspace, as drafts.
// Never writes enrollments, approvals, releases, marks or access events, and never changes the approved syllabus.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { readPackFolder } from './lib/courseware-pack-files.js'
import { coursewarePackPlan, packVersion, readPack } from './lib/courseware-pack.js'
import type { WorkspaceData } from '../server/workspace.js'

const args = process.argv.slice(2), option = (name: string) => args[args.indexOf(name) + 1]
const usage = 'Use --pack <pack folder> --course "IT 204" --owner-email <instructor email> --output <directory under .data> [--check-transaction | --apply]. Default is a dry run.'
if (!['--pack', '--course', '--owner-email', '--output'].every(flag => args.includes(flag))) throw new Error(usage)
if (args.includes('--apply') && args.includes('--check-transaction')) throw new Error('Choose apply or rollback validation, not both.')
// The owner kept these two instructors' courses out of seeding so their own uploads can be tried; a deliberate flag is needed to touch them.
const PROTECTED = ['fianza-buya@edupulse.com', 'guisdan@edupulse.com']
const email = option('--owner-email').toLowerCase()
if (!/^[a-z0-9._-]+@edupulse\.com$/.test(email)) throw new Error('Use an EduPulse staff email.')
if (PROTECTED.includes(email) && !args.includes('--include-protected-owner')) throw new Error('This instructor is excluded from seeding. Pass --include-protected-owner only when the owner has asked for it.')
const course = { code: option('--course') }
const out = resolve(option('--output')), privateRoot = resolve('.data')
if (!out.startsWith(privateRoot + '\\') && !out.startsWith(privateRoot + '/')) throw new Error('Keep private plans under the ignored .data directory.')
if ((await readFile('supabase/.temp/project-ref', 'utf8')).trim() !== 'xyziepdkdvvuhgkymooo') throw new Error('The linked project is not EduPulse.')
await mkdir(out, { recursive: true })
const cli = process.env.EDUPULSE_SUPABASE_CLI_JS || join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')
const run = (file: string) => JSON.parse(execFileSync(process.execPath, [cli, 'db', 'query', '--linked', '--file', file, '--output', 'json'], { encoding: 'utf8', maxBuffer: 160_000_000, stdio: ['ignore', 'pipe', 'pipe'] })) as { rows: Record<string, any>[] }
const sqlText = (value: unknown) => "'" + String(value).replaceAll("'", "''") + "'"
async function snapshot() {
  const file = join(out, 'snapshot.sql')
  await writeFile(file, `select u.id::text as owner_id, u.raw_app_meta_data->>'role' as role, w.revision::text as revision, w.data from auth.users u join public.edupulse_workspaces w on w.owner_id = u.id where u.email = ${sqlText(email)};`, { mode: 0o600 })
  const rows = run(file).rows
  if (rows.length !== 1) throw new Error('Exactly one instructor workspace is required.')
  return { owner: { id: String(rows[0]!.owner_id), role: String(rows[0]!.role) }, workspace: { revision: Number(rows[0]!.revision), data: rows[0]!.data as WorkspaceData } }
}

const input = await snapshot()
const pack = readPack(await readPackFolder(resolve(option('--pack'))))
const plan = coursewarePackPlan(input, pack, course)
await writeFile(join(out, 'before.json'), JSON.stringify(input.workspace), { mode: 0o600, flag: 'wx' }).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'EEXIST') throw error })
await writeFile(join(out, 'plan.json'), JSON.stringify(plan), { mode: 0o600 })
const summary = { packVersion, owner: email, revision: plan.expectedRevision, unchanged: plan.unchanged, ...plan.summary }
if (!args.includes('--apply') && !args.includes('--check-transaction')) { console.log(JSON.stringify({ dryRun: true, ...summary }, null, 2)); process.exit(0) }
if (plan.unchanged) { console.log(JSON.stringify({ applied: false, ...summary })); process.exit(0) }

const claims = JSON.stringify({ sub: input.owner.id, role: 'authenticated', app_metadata: { role: 'instructor' } })
const sql = `BEGIN;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${sqlText(input.owner.id)}::uuid AND raw_app_meta_data->>'role'='instructor') THEN RAISE EXCEPTION 'Verified instructor required'; END IF;
 IF (SELECT revision FROM public.edupulse_workspaces WHERE owner_id=${sqlText(input.owner.id)}::uuid) IS DISTINCT FROM ${plan.expectedRevision} THEN RAISE EXCEPTION 'The workspace changed; prepare a fresh plan'; END IF;
END $guard$;
SELECT set_config('request.jwt.claims',${sqlText(claims)},true);
SET LOCAL ROLE authenticated;
SELECT revision FROM public.edupulse_save_workspace(${plan.expectedRevision},${sqlText(JSON.stringify(plan.data))}::jsonb);
RESET ROLE;
INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail)
SELECT id,'admin','workspace_save','success',${sqlText(`${packVersion}: ${plan.summary.courseCode} courseware pack, ${plan.summary.addedMaterials} materials and ${plan.summary.addedAssessments} assessments as drafts; no enrollment, release or activity written`)} FROM auth.users WHERE raw_app_meta_data->>'role'='admin' ORDER BY created_at LIMIT 1;
${args.includes('--check-transaction') ? 'ROLLBACK' : 'COMMIT'};`
const sqlPath = join(out, 'apply.sql')
await writeFile(sqlPath, sql, { mode: 0o600 })
try { await writeFile(join(out, 'apply-result.json'), JSON.stringify(run(sqlPath)), { mode: 0o600 }) }
catch (error: any) { await writeFile(join(out, 'apply-error-private.log'), String(error.stderr || error.message || 'No CLI diagnostic returned.'), { mode: 0o600 }); throw new Error('The transaction did not confirm success. Inspect the private diagnostic; no success is claimed.') }
const applied = args.includes('--apply')
await writeFile(join(out, applied ? 'receipt.json' : 'rollback-check.json'), JSON.stringify({ ...summary, applied, rollbackValidated: !applied, beforeDigest: plan.beforeDigest, afterDigest: plan.afterDigest }, null, 2))
console.log(JSON.stringify({ applied, rollbackValidated: !applied, ...summary }, null, 2))
