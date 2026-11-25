-- Classes and block sections come from management loading. Instructors retain
-- roster additions and invitation-code management for those existing classes.
DO $$ DECLARE body text; needle text; replacement text; BEGIN
 body:=pg_get_functiondef('edupulse_private.class_code_command(jsonb)'::regprocedure);
 needle:=$old$IF block_record.record_key IS NULL THEN
  -- The same private allowance the instructor's class-list confirmation uses; it is removed before return.
  INSERT INTO edupulse_private.class_load_writes VALUES(txid_current(),auth.uid(),parent.record_key);
  PERFORM edupulse_private.upsert_block_section(parent,wanted,'{}'::jsonb,'instructor-class-code');
  DELETE FROM edupulse_private.class_load_writes WHERE transaction_id=txid_current() AND actor=auth.uid();
  -- A new block section is given its code as it is added.
  SELECT * INTO current_code FROM edupulse_private.class_codes c WHERE c.load_key=k AND c.disabled_at IS NULL;
  IF op='create' AND current_code.id IS NOT NULL THEN
   RETURN jsonb_build_object('code',current_code.code,'load_key',k,'parent_key',parent.record_key,'block',wanted,'course_code',code,'academic_year',y,'semester',sem,'created_at',current_code.created_at,'created',true,'block_added',true);
  END IF;
 END IF;$old$;
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'Class code guard anchor unavailable'; END IF;
 body:=replace(body,needle,$new$IF block_record.record_key IS NULL THEN
  RAISE EXCEPTION 'The Dean or Program Coordinator must load this class first.' USING ERRCODE='42501';
 END IF;$new$);
 EXECUTE body;
 body:=pg_get_functiondef('edupulse_private.register_instructor_class(jsonb)'::regprocedure);
 needle:=$old$FOR student IN SELECT value FROM jsonb_array_elements(command->'students') LOOP$old$;
 replacement:=$new$IF NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records r
  WHERE r.kind='loads' AND r.data->>'InstructorID'=auth.uid()::text AND r.data->>'CourseCode'=code
   AND r.data->>'Block'=block AND r.data->>'AcademicYear'=y
   AND edupulse_private.canonical_semester(r.data->>'Semester')=sem) THEN
  RAISE EXCEPTION 'The Dean or Program Coordinator must load this class first.' USING ERRCODE='42501';
 END IF;
 FOR student IN SELECT value FROM jsonb_array_elements(command->'students') LOOP$new$;
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'Class list guard anchor unavailable'; END IF;
 body:=replace(body,needle,replacement);
 EXECUTE body;
END $$;
