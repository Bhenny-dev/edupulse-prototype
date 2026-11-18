-- A course load holds block sections with or without a class list. A teaching-load row "IT 101 A" is
-- course IT 101, block A; a code without a printed block (PROF ED 16) takes the next free letter in
-- schedule order. The Dean, Program Coordinator or the assigned instructor adds class lists later.

-- Mirrors src/utils/blockSections.ts: first meeting day, then start; 1:00-6:59 are afternoon classes.
CREATE FUNCTION edupulse_private.schedule_rank(days text, slot text) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT (CASE WHEN d LIKE 'SU%' THEN 7 WHEN d LIKE 'SAT%' THEN 6 WHEN d LIKE 'TH%' THEN 4 WHEN d LIKE 'M%' THEN 1 WHEN d LIKE 'T%' THEN 2 WHEN d LIKE 'W%' THEN 3 WHEN d LIKE 'F%' THEN 5 WHEN d LIKE 'S%' THEN 6 ELSE 9 END)*1440
  + CASE WHEN t IS NULL THEN 99*60 ELSE (CASE WHEN t[1]::integer BETWEEN 1 AND 6 THEN t[1]::integer+12 ELSE t[1]::integer END)*60+t[2]::integer END
 FROM (SELECT upper(regexp_replace(coalesce(days,''),'[^A-Za-z]','','g')) d,regexp_match(coalesce(slot,''),'([0-9]{1,2}):([0-9]{2})') t) parts
$$;
CREATE FUNCTION edupulse_private.printed_block(subject_code text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce((regexp_match(upper(btrim(regexp_replace(coalesce(subject_code,''),'[[:space:]]+',' ','g'))),'^.*[^ ] ([A-Z])$'))[1],(regexp_match(btrim(coalesce(subject_code,'')),'^.*[^ ]-([0-9]+)$'))[1],'')
$$;
REVOKE ALL ON FUNCTION edupulse_private.schedule_rank(text,text),edupulse_private.printed_block(text) FROM PUBLIC,anon,authenticated;

-- One writer for a block section. The key matches an instructor class confirmation, so a later class list
-- lands on the same record; one instructor holds a course block per semester.
CREATE FUNCTION edupulse_private.upsert_block_section(parent public.edupulse_institutional_records, block_name text, details jsonb, source text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE wanted text:=edupulse_private.dean_block(block_name); code text:=parent.data->>'CourseCode'; y text:=parent.data->>'AcademicYear'; sem text:=edupulse_private.canonical_semester(parent.data->>'Semester');
 k text; existing public.edupulse_institutional_records; slot jsonb:=coalesce(details->'Slot','null'); fields jsonb:=coalesce(details,'{}')-'Slot';
BEGIN
 IF wanted='' OR wanted='IRREGULAR' OR length(wanted)>40 THEN RAISE EXCEPTION 'Enter a block section such as A.' USING ERRCODE='22023';END IF;
 IF parent.record_key IS NULL OR parent.data->>'LoadType' IS DISTINCT FROM 'course' THEN RAISE EXCEPTION 'Choose a loaded course first.' USING ERRCODE='22023';END IF;
 k:=concat_ws('|',code,wanted,sem,y);
 SELECT * INTO existing FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=k FOR UPDATE;
 IF existing.record_key IS NOT NULL AND existing.data->>'InstructorID' IS DISTINCT FROM parent.data->>'InstructorID' THEN RAISE EXCEPTION '% block % is already loaded to another instructor this semester.',code,wanted USING ERRCODE='40001';END IF;
 fields:=fields||jsonb_build_object('CourseCode',code,'CourseTitle',parent.data->>'CourseTitle','InstructorID',parent.data->>'InstructorID','InstructorName',parent.data->>'InstructorName','Block',wanted,'LoadType','class','ParentLoadKey',parent.record_key,'AcademicYear',y,'Semester',sem);
 IF jsonb_typeof(slot)='object' THEN fields:=fields||jsonb_build_object('Schedules',coalesce(existing.data->'Schedules','[]')||CASE WHEN coalesce(existing.data->'Schedules','[]') @> jsonb_build_array(slot) THEN '[]'::jsonb ELSE jsonb_build_array(slot) END);END IF;
 IF existing.record_key IS NULL THEN
  INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('loads',k,jsonb_strip_nulls(fields||jsonb_build_object('AllocationSource',source)),coalesce(auth.uid(),parent.updated_by));
 ELSE
  UPDATE public.edupulse_institutional_records SET data=data||jsonb_strip_nulls(fields),updated_by=coalesce(auth.uid(),parent.updated_by),updated_at=clock_timestamp() WHERE kind='loads' AND record_key=k;
 END IF;
 RETURN k;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.upsert_block_section(public.edupulse_institutional_records,text,jsonb,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION edupulse_private.teaching_load_block(parent_key text, entry jsonb, source text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent public.edupulse_institutional_records;
BEGIN
 SELECT * INTO parent FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=parent_key;
 RETURN edupulse_private.upsert_block_section(parent,entry->>'block',jsonb_build_object('ScheduleDays',nullif(btrim(entry->>'days'),''),'ScheduleTime',nullif(btrim(entry->>'time'),''),'Room',nullif(btrim(entry->>'room'),''),'SourceSubjectCode',nullif(btrim(entry->>'subject_code'),''),
  'Slot',jsonb_strip_nulls(jsonb_build_object('days',nullif(btrim(entry->>'days'),''),'time',nullif(btrim(entry->>'time'),''),'room',nullif(btrim(entry->>'room'),''),'subject_code',nullif(btrim(entry->>'subject_code'),''),'units',entry->'units','computed_hours',entry->'computed_hours','students',entry->'students'))),source);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.teaching_load_block(text,jsonb,text) FROM PUBLIC,anon,authenticated;

-- Reviewed teaching-load rows create their block sections. The block label stays out of the retained
-- source row so a reloaded file does not duplicate schedules or units.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('edupulse_private.assign_course_batch(jsonb)'::regprocedure);
 body:=replace(body,$old$receipt:=edupulse_private.course_assignment_command(entry||jsonb_build_object('action','course-load.assign'));$old$,
  $new$receipt:=edupulse_private.course_assignment_command(entry||jsonb_build_object('action','course-load.assign'));
  IF coalesce(btrim(entry->>'block'),'')<>'' THEN PERFORM edupulse_private.teaching_load_block(receipt->>'key',entry,'dean-teaching-load');END IF;$new$);
 body:=replace(body,$old$entry-'expected_updated_at'$old$,$new$entry-'expected_updated_at'-'block'$new$);
 IF strpos(body,'teaching_load_block')=0 OR strpos(body,$s$-'expected_updated_at'-'block'$s$)=0 THEN RAISE EXCEPTION 'Teaching-load block patch unavailable';END IF;
 EXECUTE body;
END $$;

-- A class list confirmed by the instructor is mirrored on its block so the Dean sees who is in each block.
-- Moving a student between blocks of the same course refreshes every block of that course and semester.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('edupulse_private.register_instructor_class(jsonb)'::regprocedure);
 body:=replace(body,$old$ SELECT data INTO parent.data FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=parent_key;$old$,
  $new$ UPDATE public.edupulse_institutional_records l SET data=l.data||jsonb_build_object('Students',coalesce(r->'students','[]')) FROM jsonb_array_elements(coalesce(next_data->'registrations','[]')) r
  WHERE l.kind='loads' AND l.data->>'InstructorID'=auth.uid()::text AND r->>'courseCode'=code AND r->>'status'='active' AND coalesce(r->>'academicYear','2026-2027')=y AND edupulse_private.canonical_semester(coalesce(r->>'semester','1st Semester'))=sem AND l.record_key=concat_ws('|',code,r->>'blockSection',sem,y);
 SELECT data INTO parent.data FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=parent_key;$new$);
 IF strpos(body,$s$jsonb_build_object('Students',$s$)=0 THEN RAISE EXCEPTION 'Class list mirror patch unavailable';END IF;
 EXECUTE body;
END $$;

-- The Dean or Program Coordinator adds a block section, optionally with its students (home-block and
-- irregular students). The class list is registered exactly as the assigned instructor confirms one,
-- so the instructor's class list, enrollments and student access follow one path; the Dean is recorded.
CREATE FUNCTION edupulse_private.dean_block_section(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent public.edupulse_institutional_records; actor uuid:=auth.uid(); teacher uuid; teacher_email text; k text; label text; listed integer:=0; saved_revision bigint; receipt jsonb;
 claims text:=current_setting('request.jwt.claims',true); sub text:=current_setting('request.jwt.claim.sub',true); mail text:=current_setting('request.jwt.claim.email',true);
BEGIN
 IF actor IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 SELECT * INTO parent FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=command->>'assignment' AND r.data->>'LoadType'='course' FOR UPDATE;
 IF parent.record_key IS NULL OR parent.data->>'InstructorID' IS DISTINCT FROM command->>'expected_instructor' THEN RAISE EXCEPTION 'This course load changed. Reopen the course and try again.' USING ERRCODE='40001';END IF;
 IF NOT edupulse_private.editable_course_term(parent.data->>'AcademicYear',parent.data->>'Semester') THEN RAISE EXCEPTION 'Only the current or next semester can receive changes.' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(coalesce(command->'students','[]'))<>'array' OR jsonb_array_length(coalesce(command->'students','[]'))>35 THEN RAISE EXCEPTION 'A block section supports up to 35 students.' USING ERRCODE='22023';END IF;
 k:=edupulse_private.upsert_block_section(parent,command->>'block',jsonb_build_object('ScheduleDays',nullif(btrim(command->>'days'),''),'ScheduleTime',nullif(btrim(command->>'time'),''),'Room',nullif(btrim(command->>'room'),'')),'dean-block-section');
 SELECT data->>'Block' INTO label FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=k;
 IF jsonb_array_length(coalesce(command->'students','[]'))>0 THEN
  teacher:=(parent.data->>'InstructorID')::uuid;
  SELECT email INTO teacher_email FROM auth.users WHERE id=teacher AND raw_app_meta_data->>'role'='instructor';
  IF teacher_email IS NULL THEN RAISE EXCEPTION 'The assigned instructor account is unavailable. Load an active instructor first.' USING ERRCODE='22023';END IF;
  SELECT w.revision INTO saved_revision FROM public.edupulse_workspaces w WHERE w.owner_id=teacher;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',teacher,'email',teacher_email,'role','authenticated','app_metadata',jsonb_build_object('role','instructor'))::text,true);
  PERFORM set_config('request.jwt.claim.sub',teacher::text,true);
  PERFORM set_config('request.jwt.claim.email',teacher_email,true);
  receipt:=edupulse_private.register_instructor_class(jsonb_build_object('assignment',parent.record_key,'block',label,'mode','append','students',command->'students','revision',coalesce(saved_revision,0),'filename','Class list added by the Dean'));
  PERFORM set_config('request.jwt.claims',coalesce(claims,'{}'),true);
  PERFORM set_config('request.jwt.claim.sub',coalesce(sub,''),true);
  PERFORM set_config('request.jwt.claim.email',coalesce(mail,''),true);
  listed:=coalesce((receipt->>'students')::integer,0);
  UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('AllocationSource','dean-block-section','ClassListAddedBy',actor::text) WHERE kind='loads' AND record_key=k;
 END IF;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(actor,'enrollments',CASE WHEN listed>0 THEN 'Block class list added' ELSE 'Block section added' END,concat_ws(' · ',parent.data->>'CourseCode',label,parent.data->>'InstructorName',parent.data->>'Semester',parent.data->>'AcademicYear'));
 RETURN jsonb_build_object('key',k,'block',label,'students',listed);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.dean_block_section(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.dean_block_section(jsonb) TO authenticated;

DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 body:=replace(body,'CASE v_action',$patch$CASE v_action WHEN 'block.add' THEN RETURN edupulse_private.dean_block_section(command);$patch$);
 IF strpos(body,'dean_block_section')=0 THEN RAISE EXCEPTION 'Dean block section command unavailable';END IF;
 EXECUTE body;
END $$;

-- Maintenance backfill: course loads already read from teaching-load files receive their block sections,
-- and confirmed class lists are mirrored on their blocks. Only a no-JWT postgres session can run it.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('edupulse_private.continue_load_teaching()'::regprocedure);
 body:=replace(body,$old$ IF NEW.kind<>'loads' OR (TG_OP='UPDATE' AND NEW.data->>'InstructorID' IS NOT DISTINCT FROM OLD.data->>'InstructorID') THEN RETURN NEW; END IF;$old$,
  $new$ IF NEW.kind='loads' AND NEW.data->>'AllocationSource'='teaching-load-backfill' AND NEW.data->>'LoadType'='class'
  AND auth.uid() IS NULL AND session_user='postgres' AND current_setting('role')='none' THEN RETURN NEW; END IF;
 IF NEW.kind<>'loads' OR (TG_OP='UPDATE' AND NEW.data->>'InstructorID' IS NOT DISTINCT FROM OLD.data->>'InstructorID') THEN RETURN NEW; END IF;$new$);
 IF strpos(body,'teaching-load-backfill')=0 THEN RAISE EXCEPTION 'Block backfill guard patch unavailable';END IF;
 EXECUTE body;
END $$;

CREATE FUNCTION edupulse_private.backfill_load_block_sections() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent public.edupulse_institutional_records; entry jsonb; others text[]; mine text[]; letter text; made integer:=0; code text; y text; sem text;
BEGIN
 IF auth.uid() IS NOT NULL OR session_user<>'postgres' OR current_setting('role')<>'none' THEN RAISE EXCEPTION 'Maintenance only' USING ERRCODE='42501';END IF;
 FOR parent IN SELECT * FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'LoadType'='course' AND jsonb_typeof(r.data->'SourceRows')='array'
  AND edupulse_private.editable_course_term(r.data->>'AcademicYear',r.data->>'Semester') ORDER BY r.record_key LOOP
  code:=parent.data->>'CourseCode';y:=parent.data->>'AcademicYear';sem:=edupulse_private.canonical_semester(parent.data->>'Semester');
  CONTINUE WHEN EXISTS(SELECT 1 FROM public.edupulse_institutional_records c WHERE c.kind='courses' AND edupulse_private.dean_code_key(c.data->>'CourseCode')=edupulse_private.dean_code_key(code) AND c.data->>'Status' IN ('suspended','removed'));
  SELECT coalesce(array_agg(upper(r.data->>'Block')),'{}') INTO others FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'LoadType'='class' AND r.data->>'CourseCode'=code AND r.data->>'AcademicYear'=y AND edupulse_private.canonical_semester(r.data->>'Semester')=sem AND r.data->>'InstructorID' IS DISTINCT FROM parent.data->>'InstructorID';
  mine:='{}';
  FOR entry IN SELECT value FROM jsonb_array_elements(parent.data->'SourceRows') ORDER BY edupulse_private.printed_block(value->>'subject_code')='',edupulse_private.schedule_rank(value->>'days',value->>'time') LOOP
   letter:=nullif(edupulse_private.printed_block(entry->>'subject_code'),'');
   IF letter IS NULL THEN SELECT l INTO letter FROM unnest(string_to_array('A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z',',')) WITH ORDINALITY AS a(l,n) WHERE NOT l=ANY(others||mine) ORDER BY n LIMIT 1;END IF;
   CONTINUE WHEN letter IS NULL OR letter=ANY(others);
   mine:=array_append(mine,letter);
   CONTINUE WHEN EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=concat_ws('|',code,letter,sem,y));
   PERFORM edupulse_private.teaching_load_block(parent.record_key,entry||jsonb_build_object('block',letter),'teaching-load-backfill');
   made:=made+1;
  END LOOP;
 END LOOP;
 UPDATE public.edupulse_institutional_records l SET data=l.data||jsonb_build_object('Students',coalesce(r->'students','[]'))
 FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'registrations','[]')) r
 WHERE l.kind='loads' AND l.data->>'LoadType'='class' AND l.data->>'InstructorID'=w.owner_id::text AND r->>'status'='active' AND NOT l.data ? 'Students'
  AND l.record_key=concat_ws('|',r->>'courseCode',r->>'blockSection',edupulse_private.canonical_semester(coalesce(r->>'semester','1st Semester')),coalesce(r->>'academicYear','2026-2027'))
  AND edupulse_private.editable_course_term(l.data->>'AcademicYear',l.data->>'Semester');
 RETURN made;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.backfill_load_block_sections() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF auth.uid() IS NULL AND session_user='postgres' AND current_setting('role')='none' THEN
  RAISE NOTICE 'Block sections added from retained teaching-load rows: %',edupulse_private.backfill_load_block_sections();
 ELSE RAISE NOTICE 'Run SELECT edupulse_private.backfill_load_block_sections(); as postgres to add block sections to existing course loads.';
 END IF;
END $$;
