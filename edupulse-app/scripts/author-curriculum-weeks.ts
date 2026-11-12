// Owner-authorized content only. No enrollment, approval, release or learner writes.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {authoredPlan,authoredDigest,authoredVersion,type AuthoredInput} from './lib/authored-weeks-plan.js'

const args=process.argv.slice(2),option=(name:string)=>args[args.indexOf(name)+1]
if(!args.includes('--input')||!args.includes('--output'))throw new Error('Use --input <private snapshot> --output <private .data directory> [--check-transaction | --apply]')
if(args.includes('--apply')&&args.includes('--check-transaction'))throw new Error('Choose rollback validation or apply')
const output=resolve(option('--output')),privateRoot=resolve('.data')
if(!output.startsWith(privateRoot+'/')&&!output.startsWith(privateRoot+'\\'))throw new Error('Private evidence must remain under ignored .data')
await mkdir(output,{recursive:true})
const input:AuthoredInput=JSON.parse(await readFile(option('--input'),'utf8')),plan=authoredPlan(input)
await writeFile(join(output,'before.json'),JSON.stringify(input),{flag:'wx',mode:0o600}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e})
await writeFile(join(output,'plan.json'),JSON.stringify(plan),{mode:0o600})
if(!args.includes('--apply')&&!args.includes('--check-transaction')){console.log(JSON.stringify({dryRun:true,...plan.summary},null,2));process.exit(0)}
if((await readFile('supabase/.temp/project-ref','utf8')).trim()!=='xyziepdkdvvuhgkymooo')throw new Error('EduPulse linked project required')
const quote=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'",json=(v:unknown)=>quote(JSON.stringify(v))+'::jsonb'
const cli=process.env.EDUPULSE_SUPABASE_CLI_JS||join(process.env.APPDATA||'','npm/node_modules/supabase/dist/supabase.js')
const receipts=[]
for(const owner of plan.owners){
 const previous=input.owners.find(o=>o.id===owner.id)!
 if(authoredDigest(previous.workspace.data)===authoredDigest(owner.workspace.data))continue
 const additions=Object.fromEntries(Object.entries(owner.workspace.data.content).filter(([id])=>!previous.workspace.data.content[id]))
 const outlines=Object.fromEntries(owner.workspace.data.syllabi.filter(s=>authoredDigest(s.courseOutline)!==authoredDigest(previous.workspace.data.syllabi.find(p=>p.id===s.id)!.courseOutline)).map(s=>[s.id,s.courseOutline]))
 const claims={sub:owner.id,role:'authenticated',app_metadata:{role:'instructor'}}
 // Each owner is a separate bounded request. Keep approved attachment bytes in Postgres.
 const sql=`BEGIN; SELECT pg_advisory_xact_lock(hashtext('edupulse-authored-weeks'));
 DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${quote(input.actor)}::uuid AND raw_app_meta_data->>'role'='admin' AND (banned_until IS NULL OR banned_until<now())) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${quote(owner.id)}::uuid AND raw_app_meta_data->>'role'='instructor' AND (banned_until IS NULL OR banned_until<now())) THEN RAISE EXCEPTION 'Active owner/admin authorization required'; END IF; END $$;
 SELECT set_config('request.jwt.claim.sub',${quote(owner.id)},true),set_config('request.jwt.claims',${json(claims)}::text,true);
 SET LOCAL ROLE authenticated;
 SELECT revision FROM public.edupulse_save_workspace(${owner.workspace.revision},(SELECT data||jsonb_build_object('content',(data->'content')||${json(additions)},'syllabi',(SELECT jsonb_agg(CASE WHEN ${json(outlines)} ? (s->>'id') THEN s||jsonb_build_object('courseOutline',${json(outlines)}->(s->>'id')) ELSE s END ORDER BY position) FROM jsonb_array_elements(data->'syllabi') WITH ORDINALITY AS entries(s,position))) FROM public.edupulse_workspaces WHERE owner_id=${quote(owner.id)}::uuid));
 RESET ROLE;
 INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(${quote(input.actor)}::uuid,'admin','workspace_save','success',${quote(`${authoredVersion}: ${Object.keys(additions).length} drafts, ${Object.keys(outlines).length} outlines; no approval/release/learner activity`.slice(0,160))});
 ${args.includes('--apply')?'COMMIT':'ROLLBACK'}; SELECT '${args.includes('--apply')?'committed':'rolled back'}' AS result;`
 if(Buffer.byteLength(sql)>950_000)throw new Error('Owner patch exceeds the bounded request size; split explicitly before applying')
 const file=join(output,`${owner.id}.sql`);await writeFile(file,sql,{mode:0o600})
 try{await writeFile(join(output,`${owner.id}-result.json`),execFileSync(process.execPath,[cli,'db','query','--linked','--file',file,'--output','json'],{encoding:'utf8',maxBuffer:8_000_000,stdio:['ignore','pipe','pipe']}),{mode:0o600})}
 catch(e:any){await writeFile(join(output,`${owner.id}-error-private.log`),e.stderr||String(e),{mode:0o600});throw new Error('Owner save not confirmed; earlier per-owner commits may exist. Refresh before retrying; inspect private evidence.')}
 receipts.push({owner:owner.id,expectedRevision:owner.workspace.revision,expectedNextRevision:owner.workspace.revision+1,before:authoredDigest(previous.workspace.data),after:authoredDigest(owner.workspace.data),addedItems:Object.keys(additions).length})
 await writeFile(join(output,'receipt.json'),JSON.stringify({version:authoredVersion,applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction'),owners:receipts,summary:plan.summary},null,2),{mode:0o600})
 console.log(JSON.stringify({owner:owner.name,addedItems:Object.keys(additions).length,applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction')}))
}
console.log(JSON.stringify(plan.summary,null,2))
