-- The first management view may include institution-wide records. Read bounded
-- pages through the same verified Admin gateway and selected account policies.
DO $migration$
DECLARE
 definition text:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 operation_list text:=$list$'enter','leave','academic.read','workspace.read'$list$;
 read_case text:=$case$ WHEN 'academic.read' THEN$case$;
 replacement text:=$records$ WHEN 'academic.read.page' THEN
  IF subject_role NOT IN ('dean','associate_dean') OR subject_role IS DISTINCT FROM input->>'role' THEN
   RAISE EXCEPTION 'Current management account required' USING ERRCODE='42501';
  END IF;
  DECLARE
   resource text:=input->>'resource';
   page_offset integer:=coalesce((input->>'offset')::integer,0);
   page_size integer:=CASE WHEN resource='publications' THEN 100 ELSE 500 END;
   ordered_by text;
  BEGIN
   CASE resource
   WHEN 'directory' THEN result:=public.edupulse_dean_command('{"action":"directory"}'::jsonb);
   WHEN 'faculty' THEN result:=public.edupulse_faculty();
   ELSE
    IF page_offset<0 OR page_offset>=250000 THEN
     RAISE EXCEPTION 'Invalid academic page offset' USING ERRCODE='22023';
    END IF;
    IF subject_role='associate_dean' AND resource IN ('attempts','material_access','material_progress','assessment_sessions') THEN
     RAISE EXCEPTION 'Dean account required for student assessment and reading records' USING ERRCODE='42501';
    END IF;
    -- Both the table and its stable total ordering come from this allowlist.
    ordered_by:=CASE resource
     WHEN 'enrollments' THEN 'course_id, student_email, block_section'
     WHEN 'delivery_schedules' THEN 'course_id, block_section'
     WHEN 'institutional_records' THEN 'kind, record_key'
     WHEN 'material_access' THEN 'publication_id, student_id'
     WHEN 'material_progress' THEN 'publication_id, student_id, source_version'
     WHEN 'courses' THEN 'id'
     WHEN 'publications' THEN 'id'
     WHEN 'notices' THEN 'id'
     WHEN 'academic_events' THEN 'id'
     WHEN 'attempts' THEN 'id'
     WHEN 'assessment_sessions' THEN 'id'
    END;
    IF ordered_by IS NULL THEN RAISE EXCEPTION 'Unsupported academic resource' USING ERRCODE='42501'; END IF;
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(page) ORDER BY %1$s),''[]''::jsonb) FROM (SELECT * FROM public.%2$I ORDER BY %1$s LIMIT $1 OFFSET $2) page', ordered_by, 'edupulse_'||resource)
    INTO result USING page_size,page_offset;
   END CASE;
  END;
 WHEN 'academic.read' THEN$records$;
BEGIN
 IF strpos(definition,operation_list)=0 OR strpos(definition,read_case)=0 THEN
  RAISE EXCEPTION 'Admin academic paging patch unavailable';
 END IF;
 definition:=replace(definition,operation_list,$list$'enter','leave','academic.read','academic.read.page','workspace.read'$list$);
 definition:=replace(definition,read_case,replacement);
 EXECUTE definition;
END $migration$;
