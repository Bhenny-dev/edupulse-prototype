import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
test('recent role history counts each role before list limits and denies non-admin reads without mutating records',async()=>{
 const db=new PGlite()
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA edupulse_private;
 CREATE TABLE auth.users(id uuid primary key,raw_app_meta_data jsonb);
 CREATE FUNCTION edupulse_private.is_system_admin() RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.admin',true)='yes'$$;
 CREATE TABLE public.edupulse_audit_events(id bigint primary key,occurred_at timestamptz,actor_role text,action text,outcome text,detail text);
 CREATE TABLE public.edupulse_agent_runs(id uuid primary key,occurred_at timestamptz,actor_role text,workflow text,task text,outcome text,duration_ms int,agents jsonb);
 CREATE TABLE public.edupulse_support_events(id uuid primary key,occurred_at timestamptz,subject_id uuid,operation text);
 GRANT USAGE ON SCHEMA edupulse_private TO authenticated;
 INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111','{"role":"associate_dean"}');
 INSERT INTO edupulse_audit_events SELECT n,now(),'admin','navigation','success','' FROM generate_series(1,150) n;
 INSERT INTO edupulse_audit_events SELECT 150+n,now()-interval '1 day','instructor','workspace_save',CASE WHEN n>105 THEN 'failure' ELSE 'success' END,'' FROM generate_series(1,110) n;
 INSERT INTO edupulse_audit_events VALUES(999,now()-interval '8 days','instructor','navigation','success','');
 INSERT INTO edupulse_agent_runs SELECT gen_random_uuid(),now(),'instructor','chat','answer',CASE WHEN n>32 THEN 'failed' ELSE 'answered' END,15,'[]' FROM generate_series(1,35) n;
 INSERT INTO edupulse_support_events VALUES(gen_random_uuid(),now(),'11111111-1111-4111-8111-111111111111','enter');`)
 await db.exec(await readFile('supabase/migrations/20261112131222_role_monitoring_recent_history.sql','utf8'))
 await db.exec("SET ROLE authenticated;SET test.admin='no'")
 await assert.rejects(db.query('select public.edupulse_admin_role_monitoring()'),/System admin required/)
 await db.exec("SET test.admin='yes'")
 const get=async()=>(await db.query<{data:any}>('select public.edupulse_admin_role_monitoring() data')).rows[0].data
 const result=await get(),r=result.roles.instructor
 assert.equal(r.totals.events,110);assert.equal(r.events.length,100);assert.equal(r.totals.success,105);assert.equal(r.totals.failure,5)
 assert.equal(r.totals.runs,35);assert.equal(r.runs.length,30);assert.equal(r.totals.aiFailed,3)
 assert.deepEqual(r.actions,[['workspace_save',110]])
 assert.equal(result.roles.associate_dean.totals.events,0);assert.equal(result.roles.associate_dean.totals.support,1)
 assert.equal(result.roles.student.totals.runs,0)
 assert.equal((await get()).roles.instructor.totals.events,110)
 await db.exec('RESET ROLE;SET ROLE anon')
 await assert.rejects(db.query('select public.edupulse_admin_role_monitoring()'),/permission denied/)
 await db.exec('RESET ROLE')
 assert.equal((await db.query<{n:number}>('select count(*)::int n from public.edupulse_audit_events')).rows[0].n,261)
 }finally{await db.close()}
})
