import {studentDemonstrationCohort} from './lib/student-demonstration.js'
// Explicit registered-account integration exercise. Every saved action is Pipeline test.
// No direct inserts of opens, attempts, progress or scores; normal RPCs enforce access.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {execFileSync} from 'node:child_process'
import {demonstrationCohort} from './lib/delivery-plan.js'
type Publication={id:string;course:string;owner:string;version:string;week:number;type:string;sections:number;questions:{type?:string;options:unknown[];correctIndex?:number;explanation:string}[]}
type Input={actor:string;courses:{id:string;course_code:string;instructor_id:string}[];members:{course:string;student:string;email:string;block:string;year:number}[];publications:Publication[]}
const args=process.argv.slice(2),option=(name:string)=>args[args.indexOf(name)+1]
if(!args.includes('--input')||!args.includes('--output'))throw new Error('Use --input <private delivery snapshot> --output <private .data directory> [--check-transaction | --apply]')
if(args.includes('--apply')&&args.includes('--check-transaction'))throw new Error('Choose rollback or apply')
const out=resolve(option('--output')),root=resolve('.data')
if(!out.startsWith(root+'/')&&!out.startsWith(root+'\\'))throw new Error('Private activity evidence must remain under ignored .data')
await mkdir(out,{recursive:true})
const input:Input=JSON.parse(await readFile(option('--input'),'utf8'))
if(input.courses.length!==16||input.publications.length!==240)throw new Error('All sixteen approved offerings and five released weeks required')
const everyStudent=args.includes('--every-student')
const cohort=everyStudent?studentDemonstrationCohort(input.members):demonstrationCohort(input.members)
const summary={approvedOfferings:input.courses.length,demonstrationCourses:new Set(cohort.map(m=>m.course)).size,unassignedOfferings:input.courses.filter(c=>!cohort.some(m=>m.course===c.id)).length,eligibleStudents:new Set(input.members.map(m=>m.student)).size,demonstrationStudents:new Set(cohort.map(m=>m.student)).size,eligibleMemberships:input.members.length,demonstrationMemberships:cohort.length,studentsPerBlock:everyStudent?'one enrolled course per student':3,untouchedWeeks:[4,5],label:'Pipeline test'}
if(!args.includes('--apply')&&!args.includes('--check-transaction')){console.log(JSON.stringify({dryRun:true,...summary},null,2));process.exit(0)}
if((await readFile('supabase/.temp/project-ref','utf8')).trim()!=='xyziepdkdvvuhgkymooo')throw new Error('EduPulse project required')
const quote=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'",json=(v:unknown)=>quote(JSON.stringify(v))+'::jsonb'
const cli=process.env.EDUPULSE_SUPABASE_CLI_JS||join(process.env.APPDATA||'','npm/node_modules/supabase/dist/supabase.js'),receipts=[]
// One rollback course exercises objective scoring, written marking and ordered reading.
const representative=input.courses.find(c=>cohort.some(m=>m.course===c.id)&&input.publications.some(p=>p.course===c.id&&p.questions.some(q=>q.type==='true_false')))
if(!representative)throw new Error('A mixed-format rollback representative is required')
for(const course of args.includes('--check-transaction')?[representative]:input.courses){
 const members=cohort.filter(m=>m.course===course.id).sort((a,b)=>a.student.localeCompare(b.student)).map((m,index)=>({...m,ordinal:index}))
 const publications=input.publications.filter(p=>p.course===course.id&&p.week<=3)
 if(!members.length){receipts.push({course:course.id,code:course.course_code,memberships:0,skipped:'No recorded active enrollment'});console.log(JSON.stringify({course:course.course_code,skipped:'No recorded active enrollment'}));continue}
 if(publications.length!==9||new Set(publications.map(p=>`${p.week}:${p.type}`)).size!==9||publications.some(p=>p.owner!==course.instructor_id))throw new Error('Complete owned first-three-week scope required')
 const sql=`BEGIN; SELECT pg_advisory_xact_lock(hashtext('edupulse-labelled-course-demonstration'));
 DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=${quote(input.actor)}::uuid AND raw_app_meta_data->>'role'='admin' AND (banned_until IS NULL OR banned_until<now())) THEN RAISE EXCEPTION 'Active owner admin required'; END IF; END $$;
 CREATE TEMP TABLE demo_learners ON COMMIT DROP AS SELECT m.* FROM jsonb_to_recordset(${json(members)}) AS m(student uuid,email text,block text,ordinal integer) JOIN public.edupulse_students s ON s.user_id=m.student AND s.email=m.email AND s.active JOIN auth.users u ON u.id=s.user_id AND u.raw_app_meta_data->>'role'='student' AND (u.banned_until IS NULL OR u.banned_until<now()) JOIN public.edupulse_enrollments e ON e.student_email=m.email AND e.course_id=${quote(course.id)} AND e.block_section=m.block AND NOT e.suspended;
 CREATE TEMP TABLE demo_cases ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset(${json(publications)}) AS p(id text,course text,owner uuid,version text,week integer,type text,sections integer,questions jsonb);
 DO $$ BEGIN IF (SELECT count(*) FROM demo_learners)<>${members.length} THEN RAISE EXCEPTION 'Membership changed; refresh before proceeding'; END IF; END $$;
 GRANT SELECT ON demo_learners,demo_cases TO authenticated;
 SET LOCAL ROLE authenticated;
 DO $exercise$
 DECLARE learner record; lesson record; q jsonb; responses jsonb; points jsonb; response jsonb; expected integer; i integer; target integer; section integer; started jsonb; result jsonb; retry boolean; prior public.edupulse_attempts;
 BEGIN
 FOR learner IN SELECT * FROM demo_learners ORDER BY ordinal LOOP
  FOR lesson IN SELECT * FROM demo_cases ORDER BY week,type LOOP
   PERFORM set_config('request.jwt.claim.sub',${quote(course.instructor_id)},true);
   PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',${quote(course.instructor_id)},'role','authenticated','app_metadata',jsonb_build_object('role','instructor'))::text,true);
   IF NOT EXISTS(SELECT 1 FROM public.edupulse_publications p WHERE p.id=lesson.id AND p.active AND p.source_version=lesson.version AND p.instructor_id=auth.uid()) THEN RAISE EXCEPTION 'Publication changed; refresh the exercise'; END IF;
   -- Preserve all genuine activity, including an opened but unanswered real session.
   IF EXISTS(SELECT 1 FROM public.edupulse_attempts a WHERE a.publication_id=lesson.id AND a.student_id=learner.student AND NOT a.is_test)
    OR EXISTS(SELECT 1 FROM public.edupulse_material_access a WHERE a.publication_id=lesson.id AND a.student_id=learner.student AND NOT a.is_test)
    OR EXISTS(SELECT 1 FROM public.edupulse_assessment_sessions a WHERE a.publication_id=lesson.id AND a.student_id=learner.student AND NOT coalesce(a.is_test,false)) THEN CONTINUE; END IF;
   IF lesson.type='assessment' AND EXISTS(SELECT 1 FROM public.edupulse_attempts a WHERE a.publication_id=lesson.id AND a.student_id=learner.student AND a.source_version=lesson.version AND a.is_test AND a.grading_status='graded' AND (${args.includes('--mastery-retake')?'false':'true'} OR a.score=a.max_score OR a.attempt_no>=3)) THEN CONTINUE; END IF;
   PERFORM public.edupulse_authorize_pipeline_test(lesson.id,lesson.version,learner.student);
   PERFORM set_config('request.jwt.claim.sub',learner.student::text,true);
   PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',learner.student,'email',learner.email,'role','authenticated','app_metadata',jsonb_build_object('role','student'))::text,true);
   IF lesson.type<>'assessment' THEN
    IF lesson.sections NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Readable section count required'; END IF;
    PERFORM public.edupulse_academic_action(lesson.id,lesson.version,'[]','open');
    IF NOT EXISTS(SELECT 1 FROM public.edupulse_material_access a WHERE a.publication_id=lesson.id AND a.student_id=auth.uid() AND a.is_test) THEN RAISE EXCEPTION 'Demonstration open lost its provenance'; END IF;
    target:=CASE learner.ordinal%3 WHEN 0 THEN lesson.sections WHEN 1 THEN greatest(1,ceil(lesson.sections/2.0)::int) ELSE 1 END;
    FOR section IN 0..target-1 LOOP result:=public.edupulse_read_material_section(lesson.id,lesson.version,section); END LOOP;
    IF result->>'is_test' IS DISTINCT FROM 'true' OR (result->>'sections_read')::int<target THEN RAISE EXCEPTION 'Labelled ordered reading did not persist'; END IF;
   ELSE
    responses:='[]';points:='[]';expected:=0;
    FOR i IN 0..jsonb_array_length(lesson.questions)-1 LOOP
     q:=lesson.questions->i;
     IF q->>'type'='short_answer' THEN
      IF ${args.includes('--mastery-retake')?'false':'true'} AND lesson.week<>1 AND (i=2 OR (i=0 AND (learner.ordinal+lesson.week)%4=0)) THEN response:=to_jsonb('Pipeline demonstration: this response is deliberately incomplete; no completed artifact is claimed.'::text);points:=points||'[0]'::jsonb;
      ELSE response:=to_jsonb(('Prepared pipeline example: '||(q->>'explanation'))::text);points:=points||'[1]'::jsonb;expected:=expected+1; END IF;
     ELSE
      response:=to_jsonb(CASE WHEN ${args.includes('--mastery-retake')?'false':'true'} AND lesson.week<>1 AND (learner.ordinal+lesson.week+i)%4=0 THEN ((q->>'correctIndex')::int+1)%jsonb_array_length(q->'options') ELSE (q->>'correctIndex')::int END);
      IF response=q->'correctIndex' THEN points:=points||'[1]'::jsonb;expected:=expected+1; ELSE points:=points||'[0]'::jsonb; END IF;
     END IF;
     responses:=responses||jsonb_build_array(response);
    END LOOP;
    SELECT * INTO prior FROM public.edupulse_attempts a WHERE a.publication_id=lesson.id AND a.student_id=auth.uid() AND a.source_version=lesson.version ORDER BY attempt_no DESC LIMIT 1;
    retry:=${args.includes('--mastery-retake')?'true':'false'} AND prior.id IS NOT NULL AND prior.is_test AND prior.score<prior.max_score AND prior.attempt_no<3;
    IF prior.id IS NOT NULL AND NOT retry AND (NOT prior.is_test OR prior.answers IS DISTINCT FROM responses OR (prior.grading_status='graded' AND prior.question_scores IS DISTINCT FROM points)) THEN RAISE EXCEPTION 'Existing responses or review are protected'; END IF;
    started:=public.edupulse_assessment_command(jsonb_build_object('operation','start','publication',lesson.id,'version',lesson.version,'retake',retry));
    result:=public.edupulse_assessment_command(jsonb_build_object('operation','submit','publication',lesson.id,'version',lesson.version,'session',started->>'id','responses',responses));
    IF result->>'is_test' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Demonstration attempt lost its provenance'; END IF;
    IF result->>'grading_status'='pending_review' THEN
     PERFORM set_config('request.jwt.claim.sub',${quote(course.instructor_id)},true);
     PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',${quote(course.instructor_id)},'role','authenticated','app_metadata',jsonb_build_object('role','instructor'))::text,true);
     result:=public.edupulse_assessment_command(jsonb_build_object('operation','grade','attempt',result->>'id','points',points,'reason','Pipeline demonstration: scripted complete/incomplete responses reviewed by Codex for integration testing; not independent learner achievement.'));
    END IF;
    IF (result->>'score')::int IS DISTINCT FROM expected OR result->>'grading_status' IS DISTINCT FROM 'graded' THEN RAISE EXCEPTION 'Actual server score differs from the prepared demonstration case'; END IF;
   END IF;
  END LOOP;
 END LOOP;
 END $exercise$;
 RESET ROLE;
 INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(${quote(input.actor)}::uuid,'admin','workspace_save','success',${quote(`Labelled course-delivery exercise: ${course.course_code}, ${members.length} memberships, Weeks 1-3 normal learner RPCs; Weeks 4-5 untouched`.slice(0,160))});
 ${args.includes('--apply')?'COMMIT':'ROLLBACK'}; SELECT 'completed labelled course exercise ${args.includes('--apply')?'commit':'rollback'}' AS result;`
 if(Buffer.byteLength(sql)>950_000)throw new Error('Exercise exceeds bounded request')
 const file=join(out,course.id+'.sql');await writeFile(file,sql,{mode:0o600})
 try{await writeFile(join(out,course.id+'-result.json'),execFileSync(process.execPath,[cli,'db','query','--linked','--file',file,'--output','json'],{encoding:'utf8',maxBuffer:4_000_000,stdio:['ignore','pipe','pipe']}),{mode:0o600})}catch(e:any){await writeFile(join(out,course.id+'-error-private.log'),e.stderr||String(e),{mode:0o600});throw new Error('Course exercise not confirmed. Preserve prior commits, inspect private evidence and refresh before retrying.')}
 receipts.push({course:course.id,code:course.course_code,memberships:members.length})
 await writeFile(join(out,'receipt.json'),JSON.stringify({applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction'),perCourse:receipts,...summary},null,2),{mode:0o600})
 console.log(JSON.stringify({course:course.course_code,memberships:members.length,applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction')}))
}
await writeFile(join(out,'receipt.json'),JSON.stringify({applied:args.includes('--apply'),rollbackChecked:args.includes('--check-transaction'),perCourse:receipts,...summary},null,2),{mode:0o600})
