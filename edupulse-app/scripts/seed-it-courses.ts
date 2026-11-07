// Authorized administrative operation. Default: private dry run. Never writes marks or access events.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { workspaceData } from '../server/workspace.js'
import { courseOutput } from '../server/contracts.js'
import { teachingContentIssues } from '../src/lib/rag/courseware.js'
import { planCourseSeed, teachingDraft, units, digest, seedVersion } from './lib/it-course-seed.mjs'

const args = process.argv.slice(2), option = (name: string) => args[args.indexOf(name) + 1]
if (!args.includes('--input') || !args.includes('--output')) throw new Error('Use --input <private snapshot> --output <private directory> [--check-transaction | --apply] [--networking-year 2]. Default is a dry run.')
if (args.includes('--apply') && args.includes('--check-transaction')) throw new Error('Choose apply or rollback validation, not both.')
const out = resolve(option('--output'))
const privateRoot = resolve('.data')
if (!out.startsWith(privateRoot + '\\') && !out.startsWith(privateRoot + '/')) throw new Error('Keep private roster plans under the ignored .data directory.')
await mkdir(out, { recursive: true })
const input = JSON.parse(await readFile(option('--input'), 'utf8'))
const plan = planCourseSeed(input, { networkingYear: args.includes('--networking-year') ? Number(option('--networking-year')) : 2 })
workspaceData.parse(plan.data)
if (Buffer.byteLength(JSON.stringify(plan.data)) > 2_950_000) throw new Error('Plan exceeds the safe workspace limit.')
for (const [code, modules] of Object.entries(units) as [string, any[]][]) for (const unit of modules) {
  const draft = courseOutput.parse(teachingDraft(code, unit))
  const issues = teachingContentIssues(draft)
  if (issues.length) throw new Error(`${code} week ${unit.week}: ${issues.join('; ')}`)
}
await writeFile(join(out, 'before.json'), JSON.stringify(input.workspace), { mode: 0o600, flag: 'wx' }).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'EEXIST') throw error })
await writeFile(join(out, 'plan.json'), JSON.stringify(plan), { mode: 0o600 })
if (!args.includes('--apply') && !args.includes('--check-transaction')) { console.log(JSON.stringify({ dryRun: true, seedVersion, unchanged: plan.unchanged, ...plan.summary }, null, 2)); process.exit(0) }
if (plan.unchanged) { console.log(JSON.stringify({ applied: false, unchanged: true, ...plan.summary })); process.exit(0) }
if ((await readFile('supabase/.temp/project-ref', 'utf8')).trim() !== 'xyziepdkdvvuhgkymooo') throw new Error('The linked project is not EduPulse.')
const sqlText = (value: unknown) => "'" + String(value).replaceAll("'", "''") + "'"
// Set a transaction-local role context for the existing instructor; use the same
// revision RPC and projection triggers. The audit attributes the operation to the
// real admin, and no student session or student activity is fabricated.
const guards = `BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${sqlText(input.owner.id)}::uuid AND raw_app_meta_data->>'role'='instructor') THEN RAISE EXCEPTION 'Verified instructor required'; END IF;
 IF (SELECT md5(data::text) FROM public.edupulse_workspaces WHERE owner_id=${sqlText(input.owner.id)}::uuid) IS NULL THEN RAISE EXCEPTION 'Existing workspace required'; END IF;
 IF (SELECT count(*) FROM jsonb_array_elements(${sqlText(JSON.stringify(input.students))}::jsonb) expected JOIN public.edupulse_students s ON s.student_number=expected->>'student_number' JOIN auth.users a ON a.id=s.user_id WHERE s.active AND s.full_name=expected->>'full_name' AND s.email=expected->>'email' AND lower(a.email)=s.email AND a.raw_app_meta_data->>'role'='student' AND s.department=expected->>'department' AND s.program=expected->>'program' AND s.year_level=(expected->>'year_level')::int) <> ${input.students.length} THEN RAISE EXCEPTION 'Directory changed; prepare a fresh plan'; END IF;
END;`
const sql = `BEGIN;
DO ${sqlText(guards)};
SELECT set_config('request.jwt.claims',${sqlText(JSON.stringify({ sub: input.owner.id, role: 'authenticated', app_metadata: { role: 'instructor' } }))},true);
SET LOCAL ROLE authenticated;
SELECT revision FROM public.edupulse_save_workspace(${plan.expectedRevision},${sqlText(JSON.stringify(plan.data))}::jsonb);
RESET ROLE;
INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail)
SELECT id,'admin','workspace_save','success',${sqlText(`${seedVersion}: ${plan.summary.addedEnrollments} enrollments; ${plan.summary.addedItems} drafts; ${plan.summary.repairedReferenceRows} reference rows repaired; no activity or approval seeded`)} FROM auth.users WHERE raw_app_meta_data->>'role'='admin';
${args.includes('--check-transaction') ? 'ROLLBACK' : 'COMMIT'};`
const sqlPath = join(out, 'apply.sql')
await writeFile(sqlPath, sql, { mode: 0o600 })
const cli = process.env.EDUPULSE_SUPABASE_CLI_JS || join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')
// CLI output may contain transaction-local claims; keep it private and emit counts only.
try { await writeFile(join(out, 'apply-result.json'), execFileSync(process.execPath, [cli, 'db', 'query', '--linked', '--file', sqlPath, '--output', 'json'], { encoding: 'utf8', maxBuffer: 8_000_000, stdio: ['ignore', 'pipe', 'pipe'] }), { mode: 0o600 }) }
catch (error: any) { await writeFile(join(out, 'apply-error-private.log'), error.stderr || 'No CLI diagnostic returned.', { mode: 0o600 }); throw new Error('Seed transaction did not confirm success. Inspect the private diagnostic and refresh the snapshot before retrying; no success is claimed.') }
const applied = args.includes('--apply')
await writeFile(join(out, applied ? 'receipt.json' : 'rollback-check.json'), JSON.stringify({ seedVersion, applied, rollbackValidated: !applied, expectedRevision: plan.expectedRevision, beforeDigest: plan.beforeDigest, afterDigest: digest(plan.data), ...plan.summary }, null, 2))
console.log(JSON.stringify({ applied, rollbackValidated: !applied, seedVersion, ...plan.summary }, null, 2))
