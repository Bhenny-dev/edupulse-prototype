-- A Dean assigns a course/term. The assigned instructor confirms actual class lists.
CREATE TABLE edupulse_private.class_load_writes(transaction_id bigint NOT NULL,actor uuid NOT NULL,parent_key text NOT NULL,PRIMARY KEY(transaction_id,actor));
ALTER TABLE edupulse_private.class_load_writes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.class_load_writes FROM PUBLIC,anon,authenticated;
CREATE FUNCTION edupulse_private.class_load_write(owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT owner=auth.uid() AND edupulse_private.academic_role()='instructor' AND EXISTS(SELECT 1 FROM edupulse_private.class_load_writes x JOIN public.edupulse_institutional_records p ON p.kind='loads' AND p.record_key=x.parent_key WHERE x.transaction_id=txid_current() AND x.actor=owner AND p.data->>'InstructorID'=owner::text AND edupulse_private.editable_course_term(p.data->>'AcademicYear',p.data->>'Semester'))
$$;
REVOKE ALL ON FUNCTION edupulse_private.class_load_write(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.class_load_write(uuid) TO authenticated;

-- The private allowance is created only after verifying a current assignment and
-- disappears before return. It does not authorize ordinary workspace writes or commands.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('edupulse_private.continue_load_teaching()'::regprocedure);
 body:=replace(body,$old$coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin')$old$,$new$(coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') AND NOT edupulse_private.class_load_write((NEW.data->>'InstructorID')::uuid))$new$);
 IF strpos(body,'class_load_write')=0 THEN RAISE EXCEPTION 'Instructor class continuation patch unavailable';END IF;
 body:=replace(body,$old$'blockSection',NEW.data->>'Block','status','active',$old$,$new$'blockSection',NEW.data->>'Block','status','active','academicYear',NEW.data->>'AcademicYear','semester',NEW.data->>'Semester',$new$);
 EXECUTE body;
 body:=pg_get_functiondef('edupulse_private.handover_workspace_write(uuid)'::regprocedure);
 body:=replace(body,$old$edupulse_private.academic_role() IN ('dean','associate_dean','admin')$old$,$new$(edupulse_private.academic_role() IN ('dean','associate_dean','admin') OR edupulse_private.class_load_write(owner))$new$);
 IF strpos(body,'class_load_write')=0 THEN RAISE EXCEPTION 'Class continuation context patch unavailable';END IF;EXECUTE body;
END $$;

-- Both reviewed PDF tables and grid uploads assign courses, never class memberships.
CREATE FUNCTION edupulse_private.assign_course_batch(command jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry jsonb; entries jsonb:=CASE WHEN command->>'action'='load.import_document' THEN command->'entries' ELSE command->'loads' END; receipt jsonb; created integer:=0; unchanged integer:=0; imported integer:=0; seen text[]:='{}'; token text; prior public.edupulse_institutional_records;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(entries) IS DISTINCT FROM 'array' OR jsonb_array_length(entries) NOT BETWEEN 1 AND 500 OR (command->>'action'='load.import_document' AND command->>'reviewed' IS DISTINCT FROM 'true') THEN RAISE EXCEPTION 'Review the selected course loads first.' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 FOR entry IN SELECT value FROM jsonb_array_elements(entries) LOOP
  token:=concat_ws('|',upper(entry->>'course_code'),entry->>'instructor_id',entry->>'academic_year',edupulse_private.canonical_semester(entry->>'semester'));
  SELECT * INTO prior FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'LoadType'='course' AND r.data->>'CourseCode'=upper(entry->>'course_code') AND r.data->>'InstructorID'=entry->>'instructor_id' AND r.data->>'AcademicYear'=entry->>'academic_year' AND r.data->>'Semester'=edupulse_private.canonical_semester(entry->>'semester');
  IF command->>'action'='load.import_document' AND NOT token=ANY(seen) AND prior.updated_at IS DISTINCT FROM nullif(entry->>'expected_updated_at','')::timestamptz THEN RAISE EXCEPTION 'A course load changed after review. Reopen the uploaded file.' USING ERRCODE='40001';END IF;
  receipt:=edupulse_private.course_assignment_command(entry||jsonb_build_object('action','course-load.assign'));
  IF NOT token=ANY(seen) THEN created:=created+coalesce((receipt->>'created')::integer,0);unchanged:=unchanged+coalesce((receipt->>'unchanged')::integer,0);seen:=array_append(seen,token);END IF;
  IF command->>'action'='load.import_document' THEN
   UPDATE public.edupulse_institutional_records r SET data=r.data||jsonb_build_object('SourceFile',left(command->>'filename',255),'SourceRows',coalesce(r.data->'SourceRows','[]')||jsonb_build_array(entry-'expected_updated_at')) WHERE r.kind='loads' AND r.record_key=receipt->>'key' AND NOT coalesce(r.data->'SourceRows','[]') @> jsonb_build_array(entry-'expected_updated_at');
  END IF;
  imported:=imported+1;
 END LOOP;
 RETURN jsonb_build_object('imported',imported,'created',created,'unchanged',unchanged,'updated',0);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.assign_course_batch(jsonb) FROM PUBLIC,anon,authenticated;

DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 body:=replace(body,'CASE v_action',$patch$CASE v_action WHEN 'load.assign','load.import_document' THEN RETURN edupulse_private.assign_course_batch(command); WHEN 'load.update','load.remove' THEN RAISE EXCEPTION 'Reopen Course to change its instructor assignment. Class lists are managed by the assigned instructor.' USING ERRCODE='22023';$patch$);
 EXECUTE body;
END $$;

-- Registration scope is explicit. Legacy unlabelled registrations remain current-term only.
CREATE FUNCTION edupulse_private.registration_term_matches(registration jsonb,syllabus jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(nullif(registration->>'academicYear',''),'2026-2027')=coalesce(nullif(syllabus->'courseInfo'->>'academicYear',''),'2026-2027') AND edupulse_private.canonical_semester(coalesce(nullif(registration->>'semester',''),'1st Semester'))=edupulse_private.canonical_semester(coalesce(nullif(syllabus->'courseInfo'->>'periodOffered',''),'1st Semester'))
$$;
CREATE FUNCTION edupulse_private.completed_term(year text,semester text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(year~'^20[0-9]{2}-20[0-9]{2}$' AND edupulse_private.canonical_semester(semester) IN ('1st Semester','2nd Semester','Summer') AND left(year,4)::integer<2026,false)
$$;
CREATE FUNCTION edupulse_private.completed_course(course text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT edupulse_private.completed_term(c.academic_year,c.semester) FROM public.edupulse_courses c WHERE c.id=course),false)
$$;
REVOKE ALL ON FUNCTION edupulse_private.registration_term_matches(jsonb,jsonb),edupulse_private.completed_term(text,text),edupulse_private.completed_course(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.registration_term_matches(jsonb,jsonb),edupulse_private.completed_term(text,text),edupulse_private.completed_course(text) TO authenticated;

CREATE OR REPLACE FUNCTION edupulse_private.course_has_current_load(course text,block text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.edupulse_courses c JOIN public.edupulse_workspaces w ON w.owner_id=c.instructor_id JOIN public.edupulse_institutional_records l ON l.kind='loads' AND l.data->>'InstructorID'=c.instructor_id::text AND edupulse_private.dean_code_key(l.data->>'CourseCode')=edupulse_private.dean_code_key(c.course_code)
 WHERE c.id=course AND l.data->>'Block'=block AND coalesce(l.data->>'LoadType','')<>'course' AND coalesce(l.data->>'Status','')!~*'^(inactive|suspended|withdrawn|deleted)$'
 AND coalesce(nullif(l.data->>'AcademicYear',''),'2026-2027')=coalesce(nullif(c.academic_year,''),'2026-2027') AND edupulse_private.canonical_semester(coalesce(nullif(l.data->>'Semester',''),'1st Semester'))=edupulse_private.canonical_semester(coalesce(nullif(c.semester,''),'1st Semester'))
 AND (l.data->>'ParentLoadKey' IS NULL OR EXISTS(SELECT 1 FROM public.edupulse_institutional_records p WHERE p.kind='loads' AND p.record_key=l.data->>'ParentLoadKey' AND p.data->>'LoadType'='course' AND p.data->>'InstructorID'=c.instructor_id::text AND p.data->>'CourseCode'=c.course_code AND p.data->>'AcademicYear'=l.data->>'AcademicYear' AND p.data->>'Semester'=l.data->>'Semester'))
 AND edupulse_private.dean_course_basis(w.data,l.data)->>'id'=c.syllabus_id)
$$;

-- Do not repopulate an instructor-confirmed class with everyone in a home block.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('edupulse_private.refresh_imported_enrollments()'::regprocedure);
 body:=replace(body,$old$DELETE FROM public.edupulse_enrollments WHERE source='institutional';$old$,$new$DELETE FROM public.edupulse_enrollments WHERE source='institutional' AND NOT edupulse_private.completed_course(course_id);$new$);
 body:=replace(body,$old$WHERE NOT edupulse_private.course_has_current_load(e.course_id,e.block_section)$old$,$new$WHERE NOT edupulse_private.completed_course(e.course_id) AND NOT edupulse_private.course_has_current_load(e.course_id,e.block_section)$new$);
 body:=replace(body,$old$coalesce(nullif(l.data->>'AcademicYear',''),'2026-2027')='2026-2027' AND coalesce(l.data->>'Semester','') !~* '^(2|second|summer)'$old$,$new$coalesce(l.data->>'LoadType','') NOT IN ('course','class') AND NOT edupulse_private.completed_course(c.id)$new$);
 -- The irregular query joins c after l, so move that predicate to the WHERE clause.
 body:=replace(body,$old$ON l.kind='loads' AND coalesce(l.data->>'LoadType','') NOT IN ('course','class') AND NOT edupulse_private.completed_course(c.id)$old$,$new$ON l.kind='loads' AND coalesce(l.data->>'LoadType','') NOT IN ('course','class')$new$);
 body:=replace(body,$old$WHERE i.kind='irregular'$old$,$new$WHERE i.kind='irregular' AND NOT edupulse_private.completed_course(c.id)$new$);
 body:=replace(body,$old$WHERE lower(coalesce(r.data->>'Status','active'))$old$,$new$WHERE NOT edupulse_private.completed_course(c.id) AND lower(coalesce(r.data->>'Status','active'))$new$);
 body:=replace(body,$old$ON c.course_code=l.data->>'CourseCode' AND c.instructor_id::text=l.data->>'InstructorID'$old$,$new$ON c.course_code=l.data->>'CourseCode' AND c.instructor_id::text=l.data->>'InstructorID' AND edupulse_private.course_has_current_load(c.id,l.data->>'Block')$new$);
 body:=replace(body,$old$max(r.data->>'YearLevel') year_level$old$,$new$CASE WHEN count(DISTINCT coalesce(directory.year_level::text,r.data->>'YearLevel'))=1 THEN max(coalesce(directory.year_level::text,r.data->>'YearLevel')) ELSE NULL END year_level$new$);
 body:=replace(body,$old$WHERE e.course_id=c.id GROUP BY$old$,$new$LEFT JOIN public.edupulse_students directory ON lower(directory.email)=e.student_email WHERE e.course_id=c.id GROUP BY$new$);
 body:=replace(body,'WHERE c.id=s.id AND c.block_info IS DISTINCT FROM s.info','WHERE c.id=s.id AND NOT edupulse_private.completed_course(c.id) AND c.block_info IS DISTINCT FROM s.info');
 EXECUTE body;
 body:=pg_get_functiondef('edupulse_private.project_workspace()'::regprocedure);
 body:=replace(body,'WHERE instructor_id=NEW.owner_id;','WHERE instructor_id=NEW.owner_id AND NOT edupulse_private.completed_course(id);');
 body:=replace(body,'UPDATE public.edupulse_publications SET active=false WHERE instructor_id=NEW.owner_id AND NOT edupulse_private.completed_course(id);','UPDATE public.edupulse_publications SET active=false WHERE instructor_id=NEW.owner_id AND NOT edupulse_private.completed_course(course_id);');
 body:=replace(body,'DELETE FROM public.edupulse_enrollments WHERE instructor_id=NEW.owner_id AND NOT edupulse_private.completed_course(id);','DELETE FROM public.edupulse_enrollments WHERE instructor_id=NEW.owner_id AND NOT edupulse_private.completed_course(course_id);');
 body:=replace(body,$old$IF coalesce((s->>'sample')::boolean,false) THEN CONTINUE; END IF;$old$,$new$IF coalesce((s->>'sample')::boolean,false) OR edupulse_private.completed_term(s->'courseInfo'->>'academicYear',s->'courseInfo'->>'periodOffered') THEN CONTINUE; END IF;$new$);
 body:=replace(body,$old$AND value->>'status'='active' LOOP$old$,$new$AND value->>'status'='active' AND edupulse_private.registration_term_matches(value,s) LOOP$new$);
 body:=replace(body,'course_title,active,source_revision)','course_title,active,source_revision,academic_year,semester)');
 body:=replace(body,$old$,NEW.revision)$old$,$new$,NEW.revision,coalesce(s->'courseInfo'->>'academicYear',''),coalesce(s->'courseInfo'->>'periodOffered',''))$new$);
 body:=replace(body,'source_revision=excluded.source_revision,updated_at=now()','source_revision=excluded.source_revision,academic_year=excluded.academic_year,semester=excluded.semester,updated_at=now()');
 body:=replace(body,$old$FOR item IN SELECT key,value FROM jsonb_each(NEW.data->'content') WHERE value->>'status'='published' LOOP$old$,$new$FOR item IN SELECT key,value FROM jsonb_each(NEW.data->'content') WHERE value->>'status'='published' AND NOT edupulse_private.completed_course(md5(NEW.owner_id::text||':'||(value->>'syllabusId'))) LOOP$new$);
 IF strpos(body,'registration_term_matches')=0 THEN RAISE EXCEPTION 'Semester registration projection patch unavailable';END IF;EXECUTE body;
 body:=pg_get_functiondef('edupulse_private.restore_metadata()'::regprocedure);
 body:=replace(body,$old$WHERE coalesce(value->>'sample','false')<>'true' LOOP$old$,$new$WHERE coalesce(value->>'sample','false')<>'true' AND NOT edupulse_private.completed_term(value->'courseInfo'->>'academicYear',value->'courseInfo'->>'periodOffered') LOOP$new$);
 body:=replace(body,'SET academic_year=','SET course_title=course_title,academic_year=');
 body:=replace(body,$old$IF p.id IS NULL OR NOT p.active THEN CONTINUE; END IF;$old$,$new$IF p.id IS NULL OR NOT p.active OR edupulse_private.completed_course(p.course_id) THEN CONTINUE; END IF;$new$);EXECUTE body;
END $$;

CREATE FUNCTION edupulse_private.course_assignment_command(command jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<assignment>>
DECLARE op text:=command->>'action'; code text; y text:=command->>'academic_year'; sem text:=edupulse_private.canonical_semester(command->>'semester'); teacher uuid; parent public.edupulse_institutional_records; destination public.edupulse_institutional_records; catalog jsonb; previous uuid; k text; child record; saved timestamptz; options jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501';END IF;
 IF NOT edupulse_private.editable_course_term(y,sem) AND op<>'course-load.continuations' THEN RAISE EXCEPTION 'Only the current or next semester can be changed.' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 IF op IN ('course-load.assign','course-load.continuations') THEN
  code:=upper(edupulse_private.dean_clean(command->>'course_code',40));
  SELECT r.data INTO catalog FROM public.edupulse_institutional_records r WHERE r.kind='course_terms' AND r.data->>'CourseCode'=code AND r.data->>'AcademicYear'=y AND r.data->>'Semester'=sem;
  IF catalog IS NULL THEN RAISE EXCEPTION 'This course is not offered in the selected semester.' USING ERRCODE='22023';END IF;
  IF op='course-load.continuations' THEN
   SELECT coalesce(jsonb_agg(jsonb_build_object('key',h.load_key,'instructor_id',h.load->>'InstructorID','instructor_name',h.load->>'InstructorName') ORDER BY h.updated_at DESC),'[]') INTO options FROM edupulse_private.teaching_load_continuity h
    WHERE h.load->>'LoadType'='course' AND h.load->>'CourseCode'=code AND h.load->>'AcademicYear'=y AND h.load->>'Semester'=sem AND NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=h.load_key);
   RETURN jsonb_build_object('continuations',options);
  END IF;
  IF catalog->>'Status' IN ('suspended','removed') THEN RAISE EXCEPTION 'Reactivate this semester course before loading it.' USING ERRCODE='22023';END IF;
  teacher:=(command->>'instructor_id')::uuid;
  IF coalesce(command->>'continuation','') NOT IN ('','new') THEN
   SELECT h.load_key INTO k FROM edupulse_private.teaching_load_continuity h WHERE h.load_key=command->>'continuation' AND h.load->>'LoadType'='course' AND h.load->>'CourseCode'=code AND h.load->>'AcademicYear'=y AND h.load->>'Semester'=sem AND NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=h.load_key);
   IF k IS NULL THEN RAISE EXCEPTION 'This retained teaching package is no longer available.' USING ERRCODE='40001';END IF;
  ELSE
   SELECT * INTO destination FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'LoadType'='course' AND r.data->>'CourseCode'=code AND r.data->>'AcademicYear'=y AND r.data->>'Semester'=sem AND r.data->>'InstructorID'=teacher::text LIMIT 1;
   IF destination.record_key IS NOT NULL THEN RETURN jsonb_build_object('key',destination.record_key,'created',0,'updated',0,'unchanged',1);END IF;
   k:='course:'||gen_random_uuid()::text;
  END IF;
 ELSE
  SELECT * INTO parent FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=command->>'key' FOR UPDATE;
  IF parent.record_key IS NULL OR parent.data->>'InstructorID' IS DISTINCT FROM command->>'expected_instructor' OR parent.data->>'AcademicYear' IS DISTINCT FROM y OR edupulse_private.canonical_semester(parent.data->>'Semester')<>sem THEN RAISE EXCEPTION 'This course load changed. Reopen the course before continuing.' USING ERRCODE='40001';END IF;
  code:=parent.data->>'CourseCode';previous:=(parent.data->>'InstructorID')::uuid;k:=parent.record_key;
  IF parent.data->>'LoadType' IS DISTINCT FROM 'course' THEN
   k:='course:'||gen_random_uuid()::text;
   INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads',k,parent.data||jsonb_build_object('Block','','LoadType','course'),auth.uid());
  END IF;
  IF op='course-load.remove' THEN
   DELETE FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key<>k AND r.data->>'InstructorID'=previous::text AND r.data->>'CourseCode'=code AND r.data->>'AcademicYear'=y AND edupulse_private.canonical_semester(r.data->>'Semester')=sem AND (r.data->>'ParentLoadKey'=k OR r.data->>'ParentLoadKey' IS NULL AND r.data->>'LoadType' IS DISTINCT FROM 'course');
   DELETE FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=k;
   PERFORM edupulse_private.refresh_imported_enrollments();
   INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'loads','Course load removed',concat_ws(' · ',code,sem,y));
   RETURN jsonb_build_object('key',k,'removed',1);
  END IF;
  IF op<>'course-load.update' THEN RAISE EXCEPTION 'Unsupported course assignment action' USING ERRCODE='22023';END IF;
  teacher:=(command->>'instructor_id')::uuid;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=teacher AND u.raw_app_meta_data->>'role'='instructor' AND coalesce(u.raw_app_meta_data->>'suspended','false')<>'true' AND (u.banned_until IS NULL OR u.banned_until<now())) THEN RAISE EXCEPTION 'Choose an active registered instructor.' USING ERRCODE='22023';END IF;
 IF op='course-load.assign' THEN
  INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at) VALUES('loads',k,jsonb_build_object('CourseCode',code,'CourseTitle',catalog->>'CourseTitle','Units',catalog->>'Units','InstructorID',teacher::text,'InstructorName',(SELECT coalesce(u.raw_user_meta_data->>'full_name',u.email) FROM auth.users u WHERE u.id=teacher),'Block','','LoadType','course','AcademicYear',y,'Semester',sem,'AllocationSource','dean-course-assignment'),auth.uid(),clock_timestamp()) RETURNING updated_at INTO saved;
  IF coalesce(command->>'continuation','') NOT IN ('','new') THEN
   FOR child IN SELECT h.load_key,h.load FROM edupulse_private.teaching_load_continuity h WHERE h.load->>'ParentLoadKey'=k AND h.load->>'CourseCode'=code AND h.load->>'AcademicYear'=y AND h.load->>'Semester'=sem LOOP
    IF EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=child.load_key AND r.data->>'InstructorID'<>teacher::text) THEN RAISE EXCEPTION 'A retained class is already handled by another instructor. Reopen the current course loads.' USING ERRCODE='40001';END IF;
    INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads',child.load_key,child.load||jsonb_build_object('InstructorID',teacher::text,'InstructorName',(SELECT coalesce(u.raw_user_meta_data->>'full_name',u.email) FROM auth.users u WHERE u.id=teacher),'ParentLoadKey',k),auth.uid()) ON CONFLICT DO NOTHING;
   END LOOP;
  END IF;
 ELSE
  UPDATE public.edupulse_institutional_records r SET data=r.data||jsonb_build_object('InstructorID',teacher::text,'InstructorName',(SELECT coalesce(u.raw_user_meta_data->>'full_name',u.email) FROM auth.users u WHERE u.id=teacher)),updated_by=auth.uid(),updated_at=clock_timestamp() WHERE r.kind='loads' AND r.record_key=k RETURNING updated_at INTO saved;
  FOR child IN SELECT r.record_key FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key<>k AND r.data->>'InstructorID'=previous::text AND r.data->>'CourseCode'=code AND r.data->>'AcademicYear'=y AND edupulse_private.canonical_semester(r.data->>'Semester')=sem AND (r.data->>'ParentLoadKey'=k OR r.data->>'ParentLoadKey' IS NULL AND r.data->>'LoadType' IS DISTINCT FROM 'course') LOOP
   UPDATE public.edupulse_institutional_records r SET data=r.data||jsonb_build_object('InstructorID',teacher::text,'InstructorName',(SELECT coalesce(u.raw_user_meta_data->>'full_name',u.email) FROM auth.users u WHERE u.id=teacher),'ParentLoadKey',k),updated_by=auth.uid(),updated_at=clock_timestamp() WHERE r.kind='loads' AND r.record_key=child.record_key;
  END LOOP;
 END IF;
 PERFORM edupulse_private.refresh_imported_enrollments();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'loads',CASE WHEN op='course-load.assign' THEN 'Course loaded' ELSE 'Course instructor changed' END,concat_ws(' · ',code,sem,y));
 RETURN jsonb_build_object('key',k,'updated_at',saved,'created',CASE WHEN op='course-load.assign' THEN 1 ELSE 0 END,'updated',CASE WHEN op='course-load.update' THEN 1 ELSE 0 END,'unchanged',0);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.course_assignment_command(jsonb) FROM PUBLIC,anon,authenticated;

DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 body:=replace(body,'CASE v_action',$patch$CASE v_action WHEN 'course-load.assign','course-load.update','course-load.remove','course-load.continuations' THEN RETURN edupulse_private.course_assignment_command(command);$patch$);
 IF strpos(body,'course_assignment_command(command)')=0 THEN RAISE EXCEPTION 'Course assignment gateway patch unavailable';END IF;EXECUTE body;
END $$;

CREATE FUNCTION edupulse_private.register_instructor_class(command jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<class_registration>>
DECLARE parent public.edupulse_institutional_records; existing public.edupulse_institutional_records; saved public.edupulse_workspaces; person public.edupulse_students; student jsonb; roster jsonb:='[]'; prior jsonb; registration jsonb; next_data jsonb; result jsonb; block text; code text;y text;sem text;k text;parent_key text;basis jsonb;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.academic_role()<>'instructor' THEN RAISE EXCEPTION 'An assigned instructor account is required.' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 SELECT * INTO parent FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=command->>'assignment' AND r.data->>'InstructorID'=auth.uid()::text FOR UPDATE;
 IF parent.record_key IS NULL OR NOT edupulse_private.editable_course_term(parent.data->>'AcademicYear',parent.data->>'Semester') THEN RAISE EXCEPTION 'Choose a current or next-semester course assigned by the Dean.' USING ERRCODE='42501';END IF;
 SELECT * INTO saved FROM public.edupulse_workspaces WHERE owner_id=auth.uid() FOR UPDATE;
 IF coalesce(saved.revision,0) IS DISTINCT FROM (command->>'revision')::bigint THEN RAISE EXCEPTION 'Your workspace changed. Reload before registering the class.' USING ERRCODE='40001';END IF;
 block:=edupulse_private.dean_block(command->>'block');code:=parent.data->>'CourseCode';y:=parent.data->>'AcademicYear';sem:=edupulse_private.canonical_semester(parent.data->>'Semester');parent_key:=parent.record_key;
 IF block='' OR block='IRREGULAR' OR length(block)>40 OR coalesce(command->>'mode','') NOT IN ('append','replace') OR jsonb_typeof(command->'students') IS DISTINCT FROM 'array' OR jsonb_array_length(command->'students') NOT BETWEEN 1 AND 35 THEN RAISE EXCEPTION 'Choose a block and between 1 and 35 registered students.' USING ERRCODE='22023';END IF;
 FOR student IN SELECT value FROM jsonb_array_elements(command->'students') LOOP
  SELECT s.* INTO person FROM public.edupulse_students s JOIN auth.users u ON u.id=s.user_id AND u.raw_app_meta_data->>'role'='student' AND coalesce(u.raw_app_meta_data->>'suspended','false')<>'true' AND (u.banned_until IS NULL OR u.banned_until<now()) WHERE s.active AND (nullif(student->>'StudentID','') IS NOT NULL AND s.student_number=student->>'StudentID' OR nullif(student->>'StudentID','') IS NULL AND nullif(student->>'Email','') IS NOT NULL AND lower(s.email)=lower(student->>'Email'));
  IF person.user_id IS NULL THEN RAISE EXCEPTION 'Every row must match an active registered student number or email. Check student %.',coalesce(nullif(student->>'StudentID',''),student->>'Email','without an identifier') USING ERRCODE='22023';END IF;
  IF NOT roster @> jsonb_build_array(jsonb_build_object('StudentID',person.student_number)) THEN roster:=roster||jsonb_build_array(jsonb_build_object('StudentID',person.student_number,'Email',person.email,'Name',person.full_name,'YearLevel',person.year_level::text,'Department',person.department,'Program',person.program,'Block',block));END IF;
 END LOOP;
 INSERT INTO edupulse_private.class_load_writes VALUES(txid_current(),auth.uid(),parent.record_key);
 IF parent.data->>'LoadType' IS DISTINCT FROM 'course' THEN
  SELECT r.record_key INTO parent_key FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'LoadType'='course' AND r.data->>'CourseCode'=code AND r.data->>'InstructorID'=auth.uid()::text AND r.data->>'AcademicYear'=y AND edupulse_private.canonical_semester(r.data->>'Semester')=sem LIMIT 1;
  IF parent_key IS NULL THEN parent_key:='course:'||gen_random_uuid()::text;INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads',parent_key,parent.data||jsonb_build_object('Block','','LoadType','course'),auth.uid());END IF;
  UPDATE edupulse_private.class_load_writes SET parent_key=class_registration.parent_key WHERE transaction_id=txid_current() AND actor=auth.uid();
 END IF;
 k:=concat_ws('|',code,block,sem,y);
 SELECT * INTO existing FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=k FOR UPDATE;
 IF existing.record_key IS NOT NULL AND existing.data->>'InstructorID'<>auth.uid()::text THEN RAISE EXCEPTION 'Another instructor already handles this course/block in this semester.' USING ERRCODE='40001';END IF;
 INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads',k,jsonb_build_object('CourseCode',code,'CourseTitle',parent.data->>'CourseTitle','InstructorID',auth.uid()::text,'InstructorName',parent.data->>'InstructorName','Block',block,'LoadType','class','ParentLoadKey',parent_key,'AcademicYear',y,'Semester',sem,'AllocationSource','instructor-class-list'),auth.uid())
 ON CONFLICT(kind,record_key) DO UPDATE SET data=edupulse_institutional_records.data||excluded.data,updated_by=auth.uid(),updated_at=clock_timestamp();
 -- A continued class may have advanced this workspace inside the same transaction.
 SELECT * INTO saved FROM public.edupulse_workspaces WHERE owner_id=auth.uid() FOR UPDATE;
 next_data:=coalesce(saved.data,jsonb_build_object('syllabi','[]'::jsonb,'content','{}'::jsonb,'registrations','[]'::jsonb));
 SELECT r INTO prior FROM jsonb_array_elements(coalesce(next_data->'registrations','[]')) r WHERE r->>'courseCode'=code AND r->>'blockSection'=block AND coalesce(r->>'academicYear','2026-2027')=y AND edupulse_private.canonical_semester(coalesce(r->>'semester','1st Semester'))=sem ORDER BY (r->>'assignmentKey'=parent_key) DESC NULLS LAST LIMIT 1;
 IF command->>'mode'='append' AND prior IS NOT NULL THEN
  FOR student IN SELECT value FROM jsonb_array_elements(prior->'students') LOOP IF NOT roster @> jsonb_build_array(jsonb_build_object('StudentID',student->>'StudentID')) THEN roster:=roster||jsonb_build_array(student);END IF;END LOOP;
 END IF;
 IF jsonb_array_length(roster)>35 THEN RAISE EXCEPTION 'A course block supports up to 35 students.' USING ERRCODE='22023';END IF;
 registration:=jsonb_build_object('id',coalesce(prior->>'id','class:'||k),'courseCode',code,'courseTitle',parent.data->>'CourseTitle','assignmentKey',parent_key,'academicYear',y,'semester',sem,'blockSection',block,'status','active','uploadedBy',auth.uid()::text,'fileName',left(coalesce(command->>'filename','Confirmed class list'),255),'students',roster);
 -- An explicit move affects only this course/semester, never the home block or a past class.
 next_data:=jsonb_set(next_data,'{registrations}',(SELECT coalesce(jsonb_agg(CASE WHEN r->>'courseCode'=code AND r->>'blockSection'<>block AND coalesce(r->>'academicYear','2026-2027')=y AND edupulse_private.canonical_semester(coalesce(r->>'semester','1st Semester'))=sem THEN jsonb_set(r,'{students}',(SELECT coalesce(jsonb_agg(s),'[]') FROM jsonb_array_elements(coalesce(r->'students','[]')) s WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(roster) incoming WHERE lower(incoming->>'Email')=lower(s->>'Email')))) ELSE r END),'[]') FROM jsonb_array_elements(coalesce(next_data->'registrations','[]')) r));
 next_data:=jsonb_set(next_data,'{enrollmentOverrides}',(SELECT coalesce(jsonb_agg(d),'[]') FROM jsonb_array_elements(coalesce(next_data->'enrollmentOverrides','[]')) d WHERE NOT(d->>'courseCode'=code AND coalesce(d->>'academicYear','2026-2027')=y AND edupulse_private.canonical_semester(coalesce(d->>'semester','1st Semester'))=sem AND EXISTS(SELECT 1 FROM jsonb_array_elements(roster) incoming WHERE lower(incoming->>'Email')=lower(d->>'studentEmail')))));
 next_data:=jsonb_set(next_data,'{registrations}',(SELECT coalesce(jsonb_agg(r),'[]') FROM jsonb_array_elements(coalesce(next_data->'registrations','[]')) r WHERE r->>'id'<>registration->>'id')||jsonb_build_array(registration));
 SELECT data INTO parent.data FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=parent_key;
 basis:=edupulse_private.dean_course_basis(next_data,parent.data);
 IF basis IS NOT NULL THEN UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('TeachingSyllabusID',basis->>'id') WHERE kind='loads' AND record_key IN (k,parent_key);END IF;
 SELECT to_jsonb(receipt) INTO result FROM public.edupulse_save_workspace(coalesce(saved.revision,0),next_data) receipt;
 DELETE FROM edupulse_private.class_load_writes WHERE transaction_id=txid_current() AND actor=auth.uid();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'enrollments','Class list confirmed',concat_ws(' · ',code,block,sem,y));
 RETURN result||jsonb_build_object('key',k,'students',jsonb_array_length(roster));
END $$;
REVOKE ALL ON FUNCTION edupulse_private.register_instructor_class(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.register_instructor_class(jsonb) TO authenticated;
CREATE FUNCTION public.edupulse_register_class(command jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.register_instructor_class(command) $$;
REVOKE ALL ON FUNCTION public.edupulse_register_class(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_register_class(jsonb) TO authenticated;

-- Superseded generic loading cannot bypass the selected-term/assigned-class flow.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('public.edupulse_import_records(text,jsonb,text)'::regprocedure);
 body:=replace(body,$old$IF kind NOT IN ($old$,$new$IF kind IN ('courses','loads') THEN RAISE EXCEPTION 'Use Course in the selected current or next semester to add courses or review course-only assignments. Instructors confirm class lists.' USING ERRCODE='22023';END IF; IF kind NOT IN ($new$);
 IF strpos(body,'review course-only assignments')=0 THEN RAISE EXCEPTION 'Generic course import guard unavailable';END IF;
 EXECUTE body;
END $$;

-- Support views use the same fresh instructor identity and record the actual Admin actor.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 body:=replace(body,$old$WHEN 'students.read' THEN$old$,$new$WHEN 'class.register' THEN IF subject_role<>'instructor' THEN RAISE EXCEPTION 'Instructor account required' USING ERRCODE='42501';END IF;result:=public.edupulse_register_class(input); WHEN 'students.read' THEN$new$);
 body:=replace(body,$old$IF operation NOT IN ($old$,$new$IF operation NOT IN ('class.register',$new$);
 body:=replace(body,$old$IF operation IN ('dean.command',$old$,$new$IF operation IN ('class.register','dean.command',$new$);
 IF strpos(body,'public.edupulse_register_class(input)')=0 THEN RAISE EXCEPTION 'Support class registration patch unavailable';END IF;EXECUTE body;
END $$;

-- Show only an authenticated student's confirmed memberships, including classes
-- registered before syllabus approval. This exposes labels, never draft content.
CREATE OR REPLACE FUNCTION edupulse_private.student_course_loads() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF edupulse_private.academic_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Student account required' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(entry ORDER BY entry->>'course_code'),'[]') INTO result FROM (
  SELECT jsonb_build_object('id',c.id,'course_code',c.course_code,'course_title',c.course_title,'instructor_name',coalesce(u.raw_user_meta_data->>'full_name',u.email),'active',c.active,'block_section',e.block_section,'suspended',e.suspended,'units',coalesce(t.data->>'Units',m.data->>'Units'),'semester',c.semester,'academic_year',c.academic_year) entry
  FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id JOIN auth.users learner ON learner.id=auth.uid() AND lower(learner.email)=lower(e.student_email) JOIN auth.users u ON u.id=c.instructor_id
  LEFT JOIN public.edupulse_institutional_records t ON t.kind='course_terms' AND t.data->>'CourseCode'=c.course_code AND t.data->>'AcademicYear'=c.academic_year AND t.data->>'Semester'=edupulse_private.canonical_semester(c.semester)
  LEFT JOIN public.edupulse_institutional_records m ON m.kind='courses' AND m.record_key=c.course_code
  UNION ALL
  SELECT jsonb_build_object('id','assignment:'||p.record_key,'course_code',p.data->>'CourseCode','course_title',coalesce(t.data->>'CourseTitle',p.data->>'CourseTitle'),'instructor_name',coalesce(u.raw_user_meta_data->>'full_name',u.email),'active',false,'block_section',r->>'blockSection','suspended',coalesce((student->>'Status')='suspended',false),'units',coalesce(t.data->>'Units',p.data->>'Units'),'semester',p.data->>'Semester','academic_year',p.data->>'AcademicYear') entry
  FROM public.edupulse_institutional_records p JOIN auth.users u ON u.id::text=p.data->>'InstructorID' JOIN public.edupulse_workspaces w ON w.owner_id=u.id
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'registrations','[]')) r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r->'students','[]')) student
  JOIN auth.users learner ON learner.id=auth.uid() AND lower(learner.email)=lower(student->>'Email')
  LEFT JOIN public.edupulse_institutional_records t ON t.kind='course_terms' AND t.data->>'CourseCode'=p.data->>'CourseCode' AND t.data->>'AcademicYear'=p.data->>'AcademicYear' AND t.data->>'Semester'=p.data->>'Semester'
  WHERE p.kind='loads' AND p.data->>'LoadType'='course' AND r->>'assignmentKey'=p.record_key AND r->>'status'='active'
  AND NOT EXISTS(SELECT 1 FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id WHERE lower(e.student_email)=lower(learner.email) AND c.instructor_id=u.id AND c.course_code=p.data->>'CourseCode' AND c.academic_year=p.data->>'AcademicYear' AND edupulse_private.canonical_semester(c.semester)=p.data->>'Semester')
 ) labels;
 IF jsonb_array_length(result)>200 THEN RAISE EXCEPTION 'Assigned course list exceeds supported capacity' USING ERRCODE='54000';END IF;
 RETURN result;
END $$;
