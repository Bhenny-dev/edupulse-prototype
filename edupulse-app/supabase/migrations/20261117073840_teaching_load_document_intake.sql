-- Owner correction: restore the original all-department directory. Account reactivation
-- and the one-time load reset are separately backed up maintenance operations, not migrations.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.dean_directory()'::regprocedure);
 definition:=replace(definition,'s.active AND s.department=''College of Information Technology'' AND','s.active AND');
 definition:=replace(definition,'''middle_name'',s.middle_name,''email'',s.email','''middle_name'',s.middle_name,''department'',s.department,''email'',s.email');
 IF strpos(definition,'s.department=''College of Information Technology''')>0 OR strpos(definition,'''department'',s.department')=0 THEN RAISE EXCEPTION 'Directory patch unavailable'; END IF;
 EXECUTE definition;
 -- Include the year in new assignment keys; older keys stay readable until explicitly edited.
 definition:=pg_get_functiondef('edupulse_private.dean_assign_loads(jsonb,text)'::regprocedure);
 definition:=replace(definition,'v_key:=concat_ws(''|'',v_code,v_block,v_sem);','v_key:=concat_ws(''|'',v_code,v_block,v_sem,nullif(r->>''academic_year'',''''));');
 definition:=replace(definition,'''AllocationSource'',''dean-course-loading''','''AcademicYear'',coalesce(r->>''academic_year'',prior->>''AcademicYear'',''''),''AllocationSource'',''dean-course-loading''');
 IF strpos(definition,'nullif(r->>''academic_year''')=0 THEN RAISE EXCEPTION 'Year key patch unavailable'; END IF;
 EXECUTE definition;
END $$;

CREATE FUNCTION edupulse_private.dean_import_load_document(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry jsonb; k text; y text; n text; rec public.edupulse_institutional_records; result jsonb; batch jsonb:='[]'; seen text[]:='{}'; code text; block text; sem text; prop text;
BEGIN
 IF coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Management account required' USING ERRCODE='42501'; END IF;
 IF command->>'reviewed' IS DISTINCT FROM 'true' OR jsonb_typeof(command->'entries') IS DISTINCT FROM 'array' OR jsonb_array_length(command->'entries') NOT BETWEEN 1 AND 500 OR length(coalesce(command->>'filename','')) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Review between 1 and 500 extracted loads before confirming' USING ERRCODE='22023'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(command->'entries') LOOP
  y:=entry->>'academic_year';sem:=entry->>'semester';
  IF coalesce(y,'') !~ '^20[0-9]{2}-20[0-9]{2}$' OR right(y,4)::integer<>left(y,4)::integer+1 OR coalesce(sem,'') NOT IN ('1st Semester','2nd Semester','Summer') THEN RAISE EXCEPTION 'Choose the academic year and semester for every row' USING ERRCODE='22023'; END IF;
  code:=edupulse_private.dean_clean(entry->>'course_code',40);block:=edupulse_private.dean_block(entry->>'block');
  IF NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records c WHERE c.kind='courses' AND edupulse_private.dean_code_key(c.data->>'CourseCode')=edupulse_private.dean_code_key(code)) OR block='' OR block='IRREGULAR' THEN RAISE EXCEPTION 'Map every source subject to a recorded course and block' USING ERRCODE='22023'; END IF;
  IF coalesce(entry->>'page','') !~ '^[0-9]{1,3}$' OR (entry->>'page')::integer NOT BETWEEN 1 AND 300 OR coalesce(entry->>'row','') !~ '^[0-9]{1,3}$' OR (entry->>'row')::integer NOT BETWEEN 1 AND 500 OR length(coalesce(entry->>'subject_code','')) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Source page, row and subject code are required' USING ERRCODE='22023'; END IF;
  FOREACH prop IN ARRAY ARRAY['units','lecture','lab','hours','computed_hours','students'] LOOP
   n:=entry->>prop;
   IF n IS NOT NULL AND (n !~ '^[0-9]+(\.[0-9]+)?$' OR length(n)>8) THEN RAISE EXCEPTION 'Invalid numeric column %',prop USING ERRCODE='22023'; END IF;
   IF n IS NOT NULL AND n::numeric > (CASE WHEN prop='students' THEN 2000 WHEN prop IN ('hours','computed_hours') THEN 168 ELSE 50 END) THEN RAISE EXCEPTION 'Numeric column % exceeds its limit',prop USING ERRCODE='22023'; END IF;
  END LOOP;
  k:=concat_ws('|',code,block,sem,y);
  IF k=ANY(seen) THEN RAISE EXCEPTION 'Two selected rows target the same course, block and term; review their mappings' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,k);
  SELECT * INTO rec FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=k FOR UPDATE;
  IF (rec.record_key IS NULL AND entry->>'expected_updated_at' IS NOT NULL) OR (rec.record_key IS NOT NULL AND (entry->>'expected_updated_at' IS NULL OR rec.updated_at IS DISTINCT FROM (entry->>'expected_updated_at')::timestamptz)) THEN RAISE EXCEPTION 'A teaching load changed after preview. Reopen the preview before importing.' USING ERRCODE='40001'; END IF;
  batch:=batch||jsonb_build_array(entry);
 END LOOP;
 result:=edupulse_private.dean_assign_loads(batch,command->>'filename');
 FOR entry IN SELECT value FROM jsonb_array_elements(batch) LOOP
  k:=concat_ws('|',entry->>'course_code',edupulse_private.dean_block(entry->>'block'),entry->>'semester',entry->>'academic_year');
  UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object(
   'SourceFile',edupulse_private.dean_clean(command->>'filename',255),'SourcePage',entry->>'page','SourceRow',entry->>'row','SourceSubjectCode',entry->>'subject_code',
   'SourceInstructor',edupulse_private.dean_clean(entry->>'source_instructor',250),'SourceAcademicYear',edupulse_private.dean_clean(entry->>'source_year',20),'SourceSemester',edupulse_private.dean_clean(entry->>'source_semester',60),
   'HighestDegree',edupulse_private.dean_clean(entry->>'degree',200),'ScheduleTime',edupulse_private.dean_clean(entry->>'time',150),'ScheduleDays',edupulse_private.dean_clean(entry->>'days',80),
   'Room',edupulse_private.dean_clean(entry->>'room',150),'Program',edupulse_private.dean_clean(entry->>'program',250),'Units',entry->>'units','LectureUnits',entry->>'lecture','LabUnits',entry->>'lab',
   'DeclaredHours',entry->>'hours','ComputedHours',entry->>'computed_hours','StudentCount',entry->>'students','AllocationSource','reviewed-teaching-load-document')
  WHERE kind='loads' AND record_key=k;
  IF NOT FOUND THEN RAISE EXCEPTION 'The imported row could not be verified' USING ERRCODE='40001'; END IF;
 END LOOP;
 RETURN result||jsonb_build_object('imported',jsonb_array_length(batch));
END $$;
REVOKE ALL ON FUNCTION edupulse_private.dean_import_load_document(jsonb) FROM PUBLIC,anon,authenticated;

DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 definition:=replace(definition,'WHEN ''load.assign'' THEN','WHEN ''load.import_document'' THEN RETURN edupulse_private.dean_import_load_document(command); WHEN ''load.assign'' THEN');
 definition:=replace(definition,'target_key:=concat_ws(''|'',previous->>''CourseCode'',target_block,target_sem);','target_key:=concat_ws(''|'',previous->>''CourseCode'',target_block,target_sem,nullif(previous->>''AcademicYear'',''''));');
 definition:=replace(definition,'''block'',target_block,''semester'',target_sem)', '''block'',target_block,''semester'',target_sem,''academic_year'',previous->>''AcademicYear'')');
 IF strpos(definition,'dean_import_load_document(command)')=0 THEN RAISE EXCEPTION 'Document command patch unavailable'; END IF;
 EXECUTE definition;
 -- Historical or next-term loads are records, never current enrollments. Syllabus authoring
 -- and access remain subject to their own approval/release rules.
 definition:=pg_get_functiondef('edupulse_private.refresh_imported_enrollments()'::regprocedure);
 definition:=replace(definition,'l.kind=''loads'' AND', 'l.kind=''loads'' AND coalesce(nullif(l.data->>''AcademicYear'',''''),''2026-2027'')=''2026-2027'' AND coalesce(l.data->>''Semester'','''') !~* ''^(2|second|summer)'' AND');
 EXECUTE definition;
END $$;
