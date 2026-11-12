import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {deliveryPlan,deliveryVersion,type DeliveryInput} from './lib/delivery-plan.js'
import {authoredDigest} from './lib/authored-weeks-plan.js'
const args=process.argv.slice(2),option=(name:string)=>args[args.indexOf(name)+1]
if(!args.includes('--input')||!args.includes('--output'))throw new Error('Use --input <private snapshot> --output <private .data directory> [--check-transaction | --apply]')
if(args.includes('--apply')&&args.includes('--check-transaction'))throw new Error('Choose rollback or apply')
const out=resolve(option('--output')),root=resolve('.data')
if(!out.startsWith(root+'/')&&!out.startsWith(root+'\\'))throw new Error('Private evidence belongs under ignored .data')
await mkdir(out,{recursive:true})
const input:DeliveryInput=JSON.parse(await readFile(option('--input'),'utf8')),plan=deliveryPlan(input)
await writeFile(join(out,'before.json'),JSON.stringify(input),{flag:'wx',mode:0o600}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e})
await writeFile(join(out,'plan.json'),JSON.stringify(plan),{mode:0o600})
if(!args.includes('--apply')&&!args.includes('--check-transaction')){console.log(JSON.stringify({dryRun:true,...plan.summary},null,2));process.exit(0)}
if((await readFile('supabase/.temp/project-ref','utf8')).trim()!=='xyziepdkdvvuhgkymooo')throw new Error('EduPulse project required')
const quote=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'",json=(v:unknown)=>quote(JSON.stringify(v))+'::jsonb'
const cli=process.env.EDUPULSE_SUPABASE_CLI_JS||join(process.env.APPDATA||'','npm/node_modules/supabase/dist/supabase.js'),receipts=[]
for(const owner of plan.owners){
 const before=input.owners.find(o=>o.id===owner.id)!
 if(authoredDigest(before.workspace.data)===authoredDigest(owner.workspace.data))continue
 const patches=Object.fromEntries(owner.workspace.data.syllabi.map(s=>{const previous=before.workspace.data.syllabi.find(p=>p.id===s.id)!;return [s.id,Object.fromEntries(Object.entries(s).filter(([k,v])=>JSON.stringify(v)!==JSON.stringify(previous[k])))]}).filter(([,patch])=>Object.keys(patch).length))
 const content=Object.fromEntries(Object.entries(owner.workspace.data.content).filter(([id,item])=>authoredDigest(item)!==authoredDigest(before.workspace.data.content[id])))
 const checkedContent=Object.fromEntries(Object.entries(content).map(([id,item])=>[id,{...item,status:'checked'}]))
 const shares=plan.shares.filter(s=>s.sender===owner.id),recipients=shares.map(s=>s.recipient)
 let sql=`BEGIN; SELECT pg_advisory_xact_lock(hashtext('edupulse-course-delivery'));
 DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${quote(input.actor)}::uuid AND raw_app_meta_data->>'role'='admin' AND (banned_until IS NULL OR banned_until<now())) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${quote(owner.id)}::uuid AND raw_app_meta_data->>'role'='instructor' AND (banned_until IS NULL OR banned_until<now())) THEN RAISE EXCEPTION 'Active owner admin and instructor required'; END IF; END $$;
 CREATE TEMP TABLE delivery_recipients ON COMMIT DROP AS SELECT id,email FROM auth.users WHERE id IN (${recipients.map(id=>quote(id)+'::uuid').join(',')}) AND raw_app_meta_data->>'role'='instructor' AND (banned_until IS NULL OR banned_until<now());
 GRANT SELECT ON delivery_recipients TO authenticated;
 SELECT set_config('request.jwt.claim.sub',${quote(owner.id)},true),set_config('request.jwt.claims',${json({sub:owner.id,role:'authenticated',app_metadata:{role:'instructor'}})}::text,true);
 SET LOCAL ROLE authenticated;
 SELECT revision FROM public.edupulse_save_workspace(${owner.workspace.revision},(SELECT data||jsonb_build_object('content',(data->'content')||${json(checkedContent)},'syllabi',(SELECT jsonb_agg(s||coalesce(${json(patches)}->(s->>'id'),'{}'::jsonb) ORDER BY position) FROM jsonb_array_elements(data->'syllabi') WITH ORDINALITY entries(s,position))) FROM public.edupulse_workspaces WHERE owner_id=${quote(owner.id)}::uuid));
 SELECT revision FROM public.edupulse_save_workspace(${owner.workspace.revision+1},(SELECT data||jsonb_build_object('content',(data->'content')||${json(content)}) FROM public.edupulse_workspaces WHERE owner_id=${quote(owner.id)}::uuid));
 `
 for(const share of shares)sql+=`SELECT public.edupulse_syllabus_share(jsonb_build_object('operation','send','syllabus',${quote(share.syllabus)},'revision',${owner.workspace.revision+2},'email',(SELECT email FROM delivery_recipients WHERE id=${quote(share.recipient)}::uuid)));\n`
 sql+=`RESET ROLE; INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(${quote(input.actor)}::uuid,'admin','workspace_save','success',${quote(`${deliveryVersion}: prepared teaching set, two shares, reviewed first-five-week release; no institutional approval created`.slice(0,160))});
 ${args.includes('--apply')?'COMMIT':'ROLLBACK'}; SELECT 'completed owner delivery ${args.includes('--apply')?'commit':'rollback'}' AS result;`
 if(Buffer.byteLength(sql)>950_000)throw new Error('Owner patch exceeds bounded request')
 const path=join(out,owner.id+'.sql');await writeFile(path,sql,{mode:0o600})
 try{await writeFile(join(out,owner.id+'-result.json'),execFileSync(process.execPath,[cli,'db','query','--linked','--file',path,'--output','json'],{encoding:'utf8',maxBuffer:8_000_000,stdio:['ignore','pipe','pipe']}),{mode:0o600})}catch(e:any){await writeFile(join(out,owner.id+'-error.log'),e.stderr||String(e),{mode:0o600});throw new Error('Owner delivery not confirmed. Prior owner commits may exist; refresh before retrying.')}
 receipts.push({owner:owner.id,beforeRevision:owner.workspace.revision,expectedRevision:owner.workspace.revision+2,shares:shares.length,items:Object.keys(content).length})
 await writeFile(join(out,'receipt.json'),JSON.stringify({version:deliveryVersion,applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction'),owners:receipts,summary:plan.summary},null,2),{mode:0o600})
 console.log(JSON.stringify({owner:owner.name,items:Object.keys(content).length,shares:2,applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction')}))
}
