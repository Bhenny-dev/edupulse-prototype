import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {boundedLoads,boundedLoadVersion} from './lib/bounded-loads.js'
import type {PopulationInput} from './lib/population-plan.js'
const args=process.argv.slice(2),value=(key:string)=>args[args.indexOf(key)+1]
if(!args.includes('--input')||!args.includes('--output'))throw Error('Use --input <private snapshot> --output <private .data directory> [--check-transaction | --apply]')
if(args.includes('--apply')&&args.includes('--check-transaction'))throw Error('Choose rollback or commit')
const out=resolve(value('--output'));if(!out.startsWith(resolve('.data')+'/')&&!out.startsWith(resolve('.data')+'\\'))throw Error('Keep private evidence in .data')
await mkdir(out,{recursive:true})
const input:PopulationInput=JSON.parse(await readFile(value('--input'),'utf8')),plan=boundedLoads(input),actor=input.owners.find(o=>o.role==='admin'&&o.name==='Benlor Rivera')
if(!actor)throw Error('Designated owner admin required')
await writeFile(join(out,'before.json'),JSON.stringify(input),{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e})
await writeFile(join(out,'plan.json'),JSON.stringify(plan),{mode:0o600})
if(!args.includes('--apply')&&!args.includes('--check-transaction')){console.log(JSON.stringify({dryRun:true,...plan.summary},null,2));process.exit(0)}
if((await readFile('supabase/.temp/project-ref','utf8')).trim()!=='xyziepdkdvvuhgkymooo')throw Error('EduPulse project required')
const quote=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'",json=(v:unknown)=>quote(JSON.stringify(v))+'::jsonb'
const expected=input.institutional.filter(r=>r.kind==='loads').sort((a:any,b:any)=>a.record_key.localeCompare(b.record_key)),revisions=input.owners.filter(o=>o.role==='instructor').map(o=>({id:o.id,revision:o.workspace.revision}))
const sql=`BEGIN; SELECT pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 DO $$ BEGIN
 IF (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY record_key),'[]') FROM public.edupulse_institutional_records r WHERE kind='loads') IS DISTINCT FROM (SELECT jsonb_agg(x ORDER BY x->>'record_key') FROM jsonb_array_elements(${json(expected)}) x) THEN RAISE EXCEPTION 'Load records changed; refresh before retry'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(${json(revisions)}) x LEFT JOIN public.edupulse_workspaces w ON w.owner_id=(x->>'id')::uuid WHERE w.revision IS DISTINCT FROM (x->>'revision')::bigint) THEN RAISE EXCEPTION 'Workspace changed; refresh before retry'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${quote(actor.id)}::uuid AND raw_app_meta_data->>'role'='admin' AND (banned_until IS NULL OR banned_until<now())) THEN RAISE EXCEPTION 'Active owner admin required'; END IF;
 END $$;
 CREATE TEMP TABLE retained_activity ON COMMIT DROP AS SELECT 'attempts' kind,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) hash FROM public.edupulse_attempts t UNION ALL SELECT 'accesses',md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY publication_id,student_id)::text,'')) FROM public.edupulse_material_access t UNION ALL SELECT 'reading',md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY publication_id,student_id,source_version)::text,'')) FROM public.edupulse_material_progress t;
 DELETE FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'AllocationSource' IN ('cit-curriculum-loading-2026-11-12',${quote(boundedLoadVersion)}) AND NOT record_key IN (SELECT jsonb_array_elements_text(${json(plan.keys)}));
 UPDATE public.edupulse_institutional_records SET data=jsonb_set(data,'{AllocationSource}',to_jsonb(${quote(boundedLoadVersion)}::text)),updated_by=${quote(actor.id)}::uuid,updated_at=now() WHERE kind='loads' AND data->>'AllocationSource' IS DISTINCT FROM ${quote(boundedLoadVersion)};
 SELECT edupulse_private.refresh_imported_enrollments();
 DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.edupulse_enrollments GROUP BY instructor_id HAVING count(DISTINCT (course_id,block_section)) NOT BETWEEN 5 AND 10) THEN RAISE EXCEPTION 'Actual enrollment workload outside 5–10'; END IF;
 IF EXISTS(SELECT 1 FROM public.edupulse_enrollments GROUP BY course_id,block_section HAVING count(*)>35) THEN RAISE EXCEPTION 'Block exceeds 35'; END IF;
 IF EXISTS(SELECT 1 FROM public.edupulse_students s WHERE active AND NOT EXISTS(SELECT 1 FROM public.edupulse_enrollments e WHERE e.student_email=s.email)) THEN RAISE EXCEPTION 'Student left without assigned courses'; END IF;
 IF EXISTS(SELECT 1 FROM public.edupulse_students s WHERE active AND NOT EXISTS(SELECT 1 FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id AND c.active WHERE e.student_email=s.email)) THEN RAISE EXCEPTION 'Student left without an approved course'; END IF;
 IF EXISTS(SELECT 1 FROM retained_activity a JOIN (SELECT 'attempts' kind,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'')) hash FROM public.edupulse_attempts t UNION ALL SELECT 'accesses',md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY publication_id,student_id)::text,'')) FROM public.edupulse_material_access t UNION ALL SELECT 'reading',md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY publication_id,student_id,source_version)::text,'')) FROM public.edupulse_material_progress t) b USING(kind) WHERE a.hash IS DISTINCT FROM b.hash) THEN RAISE EXCEPTION 'Retained activity changed'; END IF;
 END $$;
 INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(${quote(actor.id)}::uuid,'admin','workspace_save','success',${quote(boundedLoadVersion+': reduced generated allocations '+plan.summary.before+' to '+plan.summary.after+'; scores and learner history retained')});
 ${args.includes('--apply')?'COMMIT':'ROLLBACK'}; SELECT 'bounded teaching allocation ${args.includes('--apply')?'committed':'rollback checked'}' result;`
await writeFile(join(out,'apply.sql'),sql,{mode:0o600})
const cli=process.env.EDUPULSE_SUPABASE_CLI_JS||join(process.env.APPDATA||'','npm/node_modules/supabase/dist/supabase.js')
try{await writeFile(join(out,'result.json'),execFileSync(process.execPath,[cli,'db','query','--linked','--file',join(out,'apply.sql'),'--output','json'],{encoding:'utf8',maxBuffer:2_000_000,stdio:['ignore','pipe','pipe']}),{mode:0o600})}catch(e:any){await writeFile(join(out,'error-private.log'),e.stderr||String(e),{mode:0o600});throw Error('Allocation not confirmed; inspect private diagnostics before retry')}
console.log(JSON.stringify({applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction'),...plan.summary},null,2))
