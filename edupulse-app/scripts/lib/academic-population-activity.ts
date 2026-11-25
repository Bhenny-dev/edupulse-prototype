const quote=(v:unknown)=>"'"+String(v).replaceAll("'","''")+"'"
const json=(v:unknown)=>quote(JSON.stringify(v))+'::jsonb'

/** Maintenance-only caller; every learner write still uses the ordinary authorized RPC. */
export function populationActivitySql(input:{courseId:string;ownerId:string;actorId:string;batchId:string;items:string[];rollback:boolean;memberLimit?:number;block?:string}) {
 const {courseId,ownerId,actorId,batchId,items,rollback,memberLimit,block}=input
 if(memberLimit!==undefined&&(!rollback||!Number.isInteger(memberLimit)||memberLimit<1||memberLimit>35))throw Error('A member limit is only allowed in a bounded rollback rehearsal.')
 const studentClaims=`PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',member.user_id,'email',member.email,'role','authenticated','app_metadata',member.app)::text,true);PERFORM set_config('request.jwt.claim.sub',member.user_id::text,true);PERFORM set_config('request.jwt.claim.email',member.email,true);`
 const teacherClaims=`PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',${quote(ownerId)},'email',teacher.email,'role','authenticated','app_metadata',teacher.raw_app_meta_data)::text,true);PERFORM set_config('request.jwt.claim.sub',${quote(ownerId)},true);PERFORM set_config('request.jwt.claim.email',teacher.email,true);`
 const body=`DECLARE member record; teacher auth.users; lesson public.edupulse_publications; assessment public.edupulse_publications; basis public.edupulse_publications;
 keys jsonb; responses jsonb; question jsonb; session jsonb; attempt jsonb; points jsonb; practice jsonb; practice_questions jsonb;
 manifest jsonb:='{"attempts":[],"sessions":[],"accesses":[],"reading":[],"practiceSets":[],"practiceAttempts":[],"comments":[],"submissions":[]}'::jsonb;
 ordinal integer:=0; assessment_index integer; i integer; choice integer; total integer; marker uuid; private_id uuid; course_title text;
BEGIN
 IF EXISTS(SELECT 1 FROM edupulse_private.population_batches WHERE id=${quote(batchId)}) THEN RETURN;END IF;
 SELECT * INTO teacher FROM auth.users WHERE id=${quote(ownerId)}::uuid;
 IF teacher.raw_app_meta_data->>'role'<>'instructor' OR teacher.raw_app_meta_data->>'suspended'='true' OR teacher.banned_until>now() THEN RAISE EXCEPTION 'Preserve restricted instructor access' USING ERRCODE='42501';END IF;
 SELECT c.course_title INTO course_title FROM public.edupulse_courses c WHERE c.id=${quote(courseId)} AND c.active AND c.instructor_id=${quote(ownerId)}::uuid;
 IF course_title IS NULL THEN RAISE EXCEPTION 'Active owned population course required';END IF;
 SELECT * INTO basis FROM public.edupulse_publications p WHERE p.course_id=${quote(courseId)} AND p.type='material' AND p.active AND p.workspace_item_id IN(SELECT jsonb_array_elements_text(${json(items)})) ORDER BY p.week,p.id LIMIT 1;
 IF basis.id IS NULL THEN RAISE EXCEPTION 'Published population reading required';END IF;
 FOR member IN SELECT s.*,u.raw_app_meta_data app FROM public.edupulse_students s JOIN auth.users u ON u.id=s.user_id JOIN public.edupulse_enrollments e ON e.student_email=s.email AND e.course_id=${quote(courseId)}
 WHERE s.active AND u.raw_app_meta_data->>'role'='student' AND coalesce(u.raw_app_meta_data->>'suspended','false')<>'true' AND(u.banned_until IS NULL OR u.banned_until<now()) ${block?'AND e.block_section='+quote(block):''} ORDER BY s.student_number ${memberLimit?`LIMIT ${memberLimit}`:''} LOOP
  ordinal:=ordinal+1;${studentClaims}
  SET LOCAL ROLE authenticated;
  SELECT * INTO basis FROM public.edupulse_publications p WHERE p.course_id=${quote(courseId)} AND p.type='material' AND p.active AND p.workspace_item_id IN(SELECT jsonb_array_elements_text(${json(items)})) AND edupulse_private.publication_window_open(p.id) ORDER BY p.week,p.id LIMIT 1;
  IF basis.id IS NULL THEN
   manifest:=jsonb_set(manifest,'{closedMembers}',coalesce(manifest->'closedMembers','[]')||jsonb_build_array(member.user_id));
   RESET ROLE;CONTINUE;
  END IF;
  FOR lesson IN SELECT * FROM public.edupulse_publications p WHERE p.course_id=${quote(courseId)} AND p.type='material' AND p.active AND p.workspace_item_id IN(SELECT jsonb_array_elements_text(${json(items)})) AND edupulse_private.publication_window_open(p.id) ORDER BY p.week,p.id LIMIT 1+ordinal%3 LOOP
   IF NOT EXISTS(SELECT 1 FROM public.edupulse_material_access a WHERE a.publication_id=lesson.id AND a.student_id=member.user_id) THEN
    PERFORM public.edupulse_academic_action(lesson.id,lesson.source_version,'[]','open');
    manifest:=jsonb_set(manifest,'{accesses}',(manifest->'accesses')||jsonb_build_array(jsonb_build_array(lesson.id,member.user_id)));
   END IF;
   IF NOT EXISTS(SELECT 1 FROM public.edupulse_material_progress r WHERE r.publication_id=lesson.id AND r.student_id=member.user_id AND r.source_version=lesson.source_version) THEN
    total:=jsonb_array_length(lesson.content->'sections');
    FOR i IN 0..CASE WHEN ordinal%3=0 THEN total-1 ELSE least(1,total-1) END LOOP PERFORM public.edupulse_read_material_section(lesson.id,lesson.source_version,i);END LOOP;
    manifest:=jsonb_set(manifest,'{reading}',(manifest->'reading')||jsonb_build_array(jsonb_build_array(lesson.id,member.user_id,lesson.source_version)));
   END IF;
  END LOOP;
  RESET ROLE;
  assessment_index:=0;
  FOR assessment IN SELECT * FROM public.edupulse_publications p WHERE p.course_id=${quote(courseId)} AND p.type='assessment' AND p.active AND p.workspace_item_id IN(SELECT jsonb_array_elements_text(${json(items)})) AND(p.due_at IS NULL OR p.due_at>now()) AND edupulse_private.publication_window_open(p.id) ORDER BY CASE WHEN p.content->>'assessmentRole'='reflection' THEN 1 ELSE 0 END,p.week,p.id LIMIT CASE WHEN ordinal%4=0 THEN 4 ELSE 1+ordinal%3 END LOOP
   assessment_index:=assessment_index+1;
   IF EXISTS(SELECT 1 FROM public.edupulse_attempts a WHERE a.publication_id=assessment.id AND a.student_id=member.user_id AND a.source_version=assessment.source_version) THEN CONTINUE;END IF;
   SELECT a.answers INTO keys FROM edupulse_private.assessment_keys a WHERE a.publication_id=assessment.id AND a.source_version=assessment.source_version;
   responses:='[]';
   FOR i IN 0..jsonb_array_length(keys)-1 LOOP
    question:=assessment.content->'questions'->i;
    IF question->>'type'='short_answer' THEN responses:=responses||jsonb_build_array('For '||coalesce(question->>'topic',course_title)||', I would define a campus learning-service task, record its inputs and expected result, apply the method, and compare the observation with the criterion. A repeated observation would help check whether the explanation is reliable.');
    ELSE choice:=(keys->>i)::int;IF (ordinal+i)%4=0 OR(ordinal%5=0 AND i%2=0) THEN choice:=(choice+1)%jsonb_array_length(question->'options');END IF;responses:=responses||jsonb_build_array(choice);END IF;
   END LOOP;
   ${studentClaims} SET LOCAL ROLE authenticated;
   session:=public.edupulse_assessment_command(jsonb_build_object('operation','start','publication',assessment.id,'version',assessment.source_version));
   attempt:=public.edupulse_assessment_command(jsonb_build_object('operation','submit','publication',assessment.id,'version',assessment.source_version,'session',session->>'id','responses',responses));
   manifest:=jsonb_set(manifest,'{attempts}',manifest->'attempts'||jsonb_build_array(attempt->>'id'));
   manifest:=jsonb_set(manifest,'{sessions}',manifest->'sessions'||jsonb_build_array(session->>'id'));
   IF assessment_index<=3 THEN
    SELECT jsonb_agg(CASE WHEN assessment.content->'questions'->n->>'type'='short_answer' THEN '1'::jsonb ELSE attempt->'question_scores'->n END ORDER BY n) INTO points FROM generate_series(0,jsonb_array_length(keys)-1)n;
    ${teacherClaims}
    PERFORM public.edupulse_assessment_command(jsonb_build_object('operation','grade','attempt',attempt->>'id','points',points,'reason','Your explanation connects a practical example with a checkable result. Review the objective-item feedback before using another allowed attempt.'));
   END IF;
   RESET ROLE;
  END LOOP;
  ${studentClaims} SET LOCAL ROLE authenticated;
  IF NOT EXISTS(SELECT 1 FROM public.edupulse_practice_sets s WHERE s.student_id=member.user_id AND s.course_id=${quote(courseId)}) THEN
   practice_questions:='[{"text":"Which note best separates an observation from a conclusion?","options":["The work must be correct because it is complete.","The record states what was observed and then explains its interpretation.","Only the final opinion is necessary.","An assumption is always equivalent to a measurement."],"correctIndex":1},{"text":"Which record makes a practical activity easiest to reproduce?","options":["Its title alone.","An unsupported success statement.","Inputs, procedure, observations and expected result.","A list of unrelated conclusions."],"correctIndex":2},{"text":"An activity produces a different result from the expected one. What is the most useful next step?","options":["Check the inputs and procedure, then record the discrepancy.","Delete the observation.","Change the reported value without explanation.","Assume no review is needed."],"correctIndex":0}]'::jsonb;
   practice:=public.edupulse_practice_action(jsonb_build_object('operation','create','publication',basis.id,'version',basis.source_version,'title',left(course_title||': retrieval practice',180),'questions',practice_questions));
   manifest:=jsonb_set(manifest,'{practiceSets}',manifest->'practiceSets'||jsonb_build_array(practice->>'id'));
   marker:=gen_random_uuid();practice:=public.edupulse_practice_action(jsonb_build_object('operation','submit','set',practice->>'id','submission',marker,'responses',CASE WHEN ordinal%3=0 THEN '[1,2,1]'::jsonb ELSE '[1,2,0]'::jsonb END));
   manifest:=jsonb_set(manifest,'{practiceAttempts}',manifest->'practiceAttempts'||jsonb_build_array(practice->>'id'));
   practice:=public.edupulse_practice_action(jsonb_build_object('operation','create','publication',basis.id,'version',basis.source_version,'title',left(course_title||': advanced reading practice',180),'questions',practice_questions));
   manifest:=jsonb_set(manifest,'{practiceSets}',manifest->'practiceSets'||jsonb_build_array(practice->>'id'));
  END IF;
  IF jsonb_array_length(public.edupulse_topic_work(jsonb_build_object('operation','read','publication',basis.id))->'submissions')=0 THEN
   PERFORM public.edupulse_topic_work(jsonb_build_object('operation','submit','publication',basis.id,'version',basis.source_version,'body','I defined a learning-service example, listed its inputs and expected result, and recorded a procedure for comparing the observation with that result. The comparison supports my explanation while identifying what would need further evidence.','files','[]'::jsonb));
   manifest:=jsonb_set(manifest,'{submissions}',manifest->'submissions'||jsonb_build_array(jsonb_build_array(basis.id,member.user_id)));
   marker:=gen_random_uuid();PERFORM public.edupulse_topic_work(jsonb_build_object('operation','comment','publication',basis.id,'version',basis.source_version,'id',marker,'body','I organized my example into the question, procedure, observation and explanation. Comparing the observed result with the criterion helped me identify a limitation.','private',false));
   private_id:=gen_random_uuid();PERFORM public.edupulse_topic_work(jsonb_build_object('operation','comment','publication',basis.id,'version',basis.source_version,'id',private_id,'body','Could you clarify how I should explain a discrepancy between the observation and the expected result?','private',true));
   manifest:=jsonb_set(manifest,'{comments}',manifest->'comments'||jsonb_build_array(marker,private_id));
   ${teacherClaims}
   marker:=gen_random_uuid();PERFORM public.edupulse_topic_work(jsonb_build_object('operation','comment','publication',basis.id,'version',basis.source_version,'id',marker,'replyTo',private_id,'body','Keep the original observation. Check the inputs and procedure, describe the discrepancy and explain which further observation would help distinguish the possible causes.'));
   manifest:=jsonb_set(manifest,'{comments}',manifest->'comments'||jsonb_build_array(marker));
  END IF;
  RESET ROLE;
 END LOOP;
 INSERT INTO edupulse_private.population_batches(id,actor_id,provenance,manifest,completed_at) VALUES(${quote(batchId)},${quote(actorId)}::uuid,'owner-authorized-generated-population',manifest||jsonb_build_object('course',${quote(courseId)},'owner',${quote(ownerId)},'members',ordinal),now());
END;`
 return `BEGIN;\nDO ${quote(body)};\n${rollback?'ROLLBACK':'COMMIT'};`
}
