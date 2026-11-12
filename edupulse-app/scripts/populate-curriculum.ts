// Dry-run by default. Uses existing revision/import RPCs and keeps all private records outside Git.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {workspaceData} from '../server/workspace.js'
import {populationPlan,populationVersion,type PopulationInput} from './lib/population-plan.js'

const args=process.argv.slice(2),option=(name:string)=>args[args.indexOf(name)+1]
if(!args.includes('--input')||!args.includes('--output'))throw new Error('Use --input <private snapshot> --output <private .data directory> [--check-transaction | --apply]')
if(args.includes('--apply')&&args.includes('--check-transaction'))throw new Error('Choose rollback check or apply')
const output=resolve(option('--output')),privateRoot=resolve('.data')
if(!output.startsWith(privateRoot+'/')&&!output.startsWith(privateRoot+'\\'))throw new Error('Private plans must stay under ignored .data')
await mkdir(output,{recursive:true})
const input:PopulationInput=JSON.parse(await readFile(option('--input'),'utf8')),plan=populationPlan(input)
for(const o of plan.owners){workspaceData.parse(o.workspace.data);if(Buffer.byteLength(JSON.stringify(o.workspace.data))>2_950_000)throw new Error(`Workspace too large: ${o.name}`)}
await writeFile(join(output,'plan.json'),JSON.stringify(plan),{mode:0o600})
await writeFile(join(output,'before.json'),JSON.stringify(input),{mode:0o600,flag:'wx'}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e})
if(!args.includes('--apply')&&!args.includes('--check-transaction')){console.log(JSON.stringify({dryRun:true,...plan.summary},null,2));process.exit(0)}
if((await readFile('supabase/.temp/project-ref','utf8')).trim()!=='xyziepdkdvvuhgkymooo')throw new Error('EduPulse linked project required')
const quote=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'",json=(v:unknown)=>quote(JSON.stringify(v))+'::jsonb'
const claims=(id:string,role:string)=>`SELECT set_config('request.jwt.claim.sub',${quote(id)},true),set_config('request.jwt.claims',${json({sub:id,role:'authenticated',app_metadata:{role}})}::text,true);`
const admin=input.owners.find(o=>o.role==='admin'&&o.name==='Benlor Rivera')
if(!admin)throw new Error('Designated owner admin required')
let sql=`BEGIN; SELECT pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));\n`
sql+=`DO $$ BEGIN IF (SELECT count(*) FROM public.edupulse_students WHERE active)<>${input.students.length} OR EXISTS(SELECT 1 FROM jsonb_array_elements(${json(input.students.map(s=>({id:s.user_id,email:s.email,year:s.year_level})))}) e LEFT JOIN public.edupulse_students s ON s.user_id=(e->>'id')::uuid WHERE s.active IS DISTINCT FROM true OR s.email IS DISTINCT FROM e->>'email' OR s.year_level IS DISTINCT FROM (e->>'year')::int) THEN RAISE EXCEPTION 'Active directory changed; refresh the snapshot'; END IF; END $$;\n`
for(const owner of plan.owners){
 const before=input.owners.find(o=>o.id===owner.id)!
 if(JSON.stringify(before.workspace.data)===JSON.stringify(owner.workspace.data))continue
 const existingIds=new Set(before.workspace.data.syllabi.map((s:any)=>s.id)),added=owner.workspace.data.syllabi.filter((s:any)=>!existingIds.has(s.id))
 const overrides=JSON.stringify(before.workspace.data.enrollmentOverrides)!==JSON.stringify(owner.workspace.data.enrollmentOverrides)?`||jsonb_build_object('enrollmentOverrides',${json(owner.workspace.data.enrollmentOverrides)})`:''
 // Preserve approved bytes in the database instead of retransmitting them through the Management API.
 sql+=claims(owner.id,'instructor')+`SET LOCAL ROLE authenticated; SELECT revision FROM public.edupulse_save_workspace(${owner.workspace.revision},(SELECT data||jsonb_build_object('syllabi',(data->'syllabi')||${json(added)})${overrides} FROM public.edupulse_workspaces WHERE owner_id=${quote(owner.id)}::uuid)); RESET ROLE;\n`
}
sql+=claims(admin.id,'admin')+'SET LOCAL ROLE authenticated;\n'
for(const [kind,rows] of [['courses',plan.courses],['rosters',plan.rosters],['loads',plan.loads]] as const)if(rows.length)sql+=`SELECT public.edupulse_import_records(${quote(kind)},${json(rows)},${quote('Owner-authorized BSIT curriculum allocation; '+populationVersion)});\n`
sql+=`RESET ROLE; INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(${quote(admin.id)}::uuid,'admin','workspace_save','success',${quote(populationVersion+`: ${plan.summary.students} students, ${plan.summary.blocks} blocks, ${plan.summary.courseLoadRows} loads, ${plan.summary.expectedMemberships} memberships; no learner activity or approval created`)});\n`
sql+=`${args.includes('--apply')?'COMMIT':'ROLLBACK'}; SELECT 'completed curriculum allocation ${args.includes('--apply')?'commit':'rollback check'}' AS result;`
const file=join(output,'apply.sql');await writeFile(file,sql,{mode:0o600})
const cli=process.env.EDUPULSE_SUPABASE_CLI_JS||join(process.env.APPDATA||'','npm/node_modules/supabase/dist/supabase.js')
try{await writeFile(join(output,'result.json'),execFileSync(process.execPath,[cli,'db','query','--linked','--file',file,'--output','json'],{encoding:'utf8',maxBuffer:8_000_000,stdio:['ignore','pipe','pipe']}),{mode:0o600})}catch(e:any){await writeFile(join(output,'error-private.log'),e.stderr||String(e),{mode:0o600});throw new Error('Allocation did not confirm success. Inspect the private diagnostic; refresh before retrying.')}
console.log(JSON.stringify({applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction'),...plan.summary},null,2))
