-- Class codes are issued when a class exists (owner request, 25 November 2026).
-- A class is a block section record of a loaded course. When the Dean or Program Coordinator loads a course,
-- adds a block, or an instructor adds one, its code is made at once: one code per class, unique across every
-- loaded course (class_codes.code is UNIQUE and codes are never reused), so a student's code names exactly
-- one class. The instructor can still replace or turn off a code; a turned-off code is never made again by
-- an ordinary update, and a handover to another instructor issues a fresh code for the new instructor.
-- Issuing a code never blocks a load: any failure is skipped and the instructor can create the code by hand.

CREATE FUNCTION edupulse_private.issue_class_code(rec public.edupulse_institutional_records) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE instructor uuid; blk text:=rec.data->>'Block'; y text:=rec.data->>'AcademicYear'; sem text:=edupulse_private.canonical_semester(rec.data->>'Semester');
BEGIN
 IF rec.kind IS DISTINCT FROM 'loads' OR rec.data->>'LoadType' IS DISTINCT FROM 'class' THEN RETURN;END IF;
 IF coalesce(rec.data->>'InstructorID','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN;END IF;
 IF coalesce(blk,'') IN ('','IRREGULAR') OR length(blk)>40 OR coalesce(rec.data->>'CourseCode','')='' OR coalesce(y,'')='' OR coalesce(sem,'')='' THEN RETURN;END IF;
 BEGIN
  instructor:=(rec.data->>'InstructorID')::uuid;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=instructor) THEN RETURN;END IF;
  -- A finished semester gets no new code.
  IF NOT edupulse_private.editable_course_term(y,rec.data->>'Semester') THEN RETURN;END IF;
  -- A code made for a previous instructor of this class no longer opens it.
  UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE load_key=rec.record_key AND disabled_at IS NULL AND instructor_id<>instructor;
  IF EXISTS(SELECT 1 FROM edupulse_private.class_codes WHERE load_key=rec.record_key AND disabled_at IS NULL) THEN RETURN;END IF;
  INSERT INTO edupulse_private.class_codes(code,load_key,parent_key,instructor_id,course_code,block,academic_year,semester)
   VALUES(edupulse_private.new_class_code(),rec.record_key,coalesce(nullif(rec.data->>'ParentLoadKey',''),rec.record_key),instructor,rec.data->>'CourseCode',blk,y,sem);
 EXCEPTION WHEN OTHERS THEN RETURN;
 END;
END $$;

CREATE FUNCTION edupulse_private.class_code_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.kind='loads' AND OLD.data->>'LoadType'='class' THEN
   UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE load_key=OLD.record_key AND disabled_at IS NULL;
  END IF;
  RETURN OLD;
 END IF;
 IF NEW.kind='loads' AND NEW.data->>'LoadType'='class' AND (TG_OP='INSERT' OR OLD.data->>'InstructorID' IS DISTINCT FROM NEW.data->>'InstructorID') THEN
  BEGIN PERFORM edupulse_private.issue_class_code(NEW); EXCEPTION WHEN OTHERS THEN NULL; END;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_edupulse_class_code AFTER INSERT OR UPDATE OR DELETE ON public.edupulse_institutional_records FOR EACH ROW EXECUTE FUNCTION edupulse_private.class_code_trigger();

-- Classes loaded before this change and never given a code (a class whose code was turned off keeps its history and stays off).
CREATE FUNCTION edupulse_private.backfill_class_codes() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.edupulse_institutional_records;
BEGIN
 FOR r IN SELECT x.* FROM public.edupulse_institutional_records x WHERE x.kind='loads' AND x.data->>'LoadType'='class'
  AND NOT EXISTS(SELECT 1 FROM edupulse_private.class_codes c WHERE c.load_key=x.record_key) ORDER BY x.record_key LOOP
  BEGIN PERFORM edupulse_private.issue_class_code(r); EXCEPTION WHEN OTHERS THEN NULL; END;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.issue_class_code(public.edupulse_institutional_records),edupulse_private.class_code_trigger(),edupulse_private.backfill_class_codes() FROM PUBLIC,anon,authenticated;
SELECT edupulse_private.backfill_class_codes();

-- The instructor's create now accepts the code a new block was just given, instead of making a second active one.
CREATE OR REPLACE FUNCTION edupulse_private.class_code_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op text:=coalesce(command->>'action',''); parent public.edupulse_institutional_records; block_record public.edupulse_institutional_records;
 wanted text; k text; sem text; y text; code text; current_code edupulse_private.class_codes; created edupulse_private.class_codes;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.academic_role() IS DISTINCT FROM 'instructor' THEN RAISE EXCEPTION 'An assigned instructor account is required.' USING ERRCODE='42501';END IF;
 IF op NOT IN ('create','regenerate','disable') THEN RAISE EXCEPTION 'Choose create, regenerate or disable.' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 SELECT * INTO parent FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=command->>'assignment' AND r.data->>'InstructorID'=auth.uid()::text FOR UPDATE;
 -- A block or older load row names its course: use the course load of the same course and term.
 IF parent.record_key IS NOT NULL AND parent.data->>'LoadType' IS DISTINCT FROM 'course' THEN
  SELECT * INTO parent FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'LoadType'='course' AND r.data->>'InstructorID'=auth.uid()::text
   AND r.data->>'CourseCode'=parent.data->>'CourseCode' AND r.data->>'AcademicYear'=parent.data->>'AcademicYear'
   AND edupulse_private.canonical_semester(r.data->>'Semester')=edupulse_private.canonical_semester(parent.data->>'Semester') ORDER BY r.record_key LIMIT 1 FOR UPDATE;
 END IF;
 IF parent.record_key IS NULL THEN RAISE EXCEPTION 'Choose a course the Dean assigned to you. Ask the Dean to load it for this semester if it is missing.' USING ERRCODE='42501';END IF;
 IF NOT edupulse_private.editable_course_term(parent.data->>'AcademicYear',parent.data->>'Semester') THEN RAISE EXCEPTION 'Completed semesters are view-only.' USING ERRCODE='42501';END IF;
 wanted:=edupulse_private.dean_block(command->>'block');
 IF coalesce(wanted,'') IN ('','IRREGULAR') OR length(wanted)>40 OR wanted !~* '^[A-Z0-9][A-Z0-9 .()/_-]*$' THEN RAISE EXCEPTION 'Enter a block section such as A.' USING ERRCODE='22023';END IF;
 code:=parent.data->>'CourseCode';y:=parent.data->>'AcademicYear';sem:=edupulse_private.canonical_semester(parent.data->>'Semester');
 k:=concat_ws('|',code,wanted,sem,y);
 SELECT * INTO block_record FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=k FOR UPDATE;
 IF block_record.record_key IS NOT NULL AND block_record.data->>'InstructorID' IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION '% block % is handled by another instructor this semester.',code,wanted USING ERRCODE='40001';END IF;
 -- A code made by a previous instructor of this block no longer opens it.
 UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE load_key=k AND disabled_at IS NULL AND instructor_id<>auth.uid();
 SELECT * INTO current_code FROM edupulse_private.class_codes c WHERE c.load_key=k AND c.disabled_at IS NULL;
 IF op='disable' THEN
  IF current_code.id IS NOT NULL THEN
   UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE id=current_code.id;
   INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'enrollments','Class code turned off',concat_ws(' · ',code,wanted,sem,y));
  END IF;
  RETURN jsonb_build_object('load_key',k,'block',wanted,'course_code',code,'code',NULL,'disabled',current_code.id IS NOT NULL);
 END IF;
 IF op='create' AND current_code.id IS NOT NULL THEN
  RETURN jsonb_build_object('code',current_code.code,'load_key',k,'parent_key',parent.record_key,'block',wanted,'course_code',code,'academic_year',y,'semester',sem,'created_at',current_code.created_at,'created',false);
 END IF;
 IF block_record.record_key IS NULL THEN
  -- The same private allowance the instructor's class-list confirmation uses; it is removed before return.
  INSERT INTO edupulse_private.class_load_writes VALUES(txid_current(),auth.uid(),parent.record_key);
  PERFORM edupulse_private.upsert_block_section(parent,wanted,'{}'::jsonb,'instructor-class-code');
  DELETE FROM edupulse_private.class_load_writes WHERE transaction_id=txid_current() AND actor=auth.uid();
  -- A new block section is given its code as it is added.
  SELECT * INTO current_code FROM edupulse_private.class_codes c WHERE c.load_key=k AND c.disabled_at IS NULL;
  IF op='create' AND current_code.id IS NOT NULL THEN
   RETURN jsonb_build_object('code',current_code.code,'load_key',k,'parent_key',parent.record_key,'block',wanted,'course_code',code,'academic_year',y,'semester',sem,'created_at',current_code.created_at,'created',true,'block_added',true);
  END IF;
 END IF;
 IF current_code.id IS NOT NULL THEN UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE id=current_code.id;END IF;
 INSERT INTO edupulse_private.class_codes(code,load_key,parent_key,instructor_id,course_code,block,academic_year,semester)
  VALUES(edupulse_private.new_class_code(),k,parent.record_key,auth.uid(),code,wanted,y,sem) RETURNING * INTO created;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'enrollments',CASE WHEN current_code.id IS NULL THEN 'Class code created' ELSE 'Class code replaced' END,concat_ws(' · ',code,wanted,sem,y));
 RETURN jsonb_build_object('code',created.code,'load_key',k,'parent_key',parent.record_key,'block',wanted,'course_code',code,'academic_year',y,'semester',sem,'created_at',created.created_at,'created',true,'block_added',block_record.record_key IS NULL);
END $$;
