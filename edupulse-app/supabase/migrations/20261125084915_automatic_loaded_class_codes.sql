-- A loaded course is already a class. Materialize its initial section at the
-- transaction boundary, after reviewed imports have supplied their explicit blocks.
-- Codes are atomic with loading: no silent failures, and disabled codes stay off.
-- Maintenance repair creates only an empty child of an already-authorized load;
-- it cannot invoke a handover, enroll learners or be selected by a signed-in role.
DO $$ DECLARE body text; position integer; BEGIN
 body:=pg_get_functiondef('edupulse_private.continue_load_teaching()'::regprocedure);
 position:=strpos(body,'BEGIN');
 IF position=0 THEN RAISE EXCEPTION 'Load continuation guard unavailable'; END IF;
 body:=overlay(body placing $patch$BEGIN
 IF TG_OP='INSERT' AND NEW.kind='loads' AND NEW.data->>'LoadType'='class'
  AND NEW.data->>'AllocationSource'='automatic-loaded-class' AND auth.uid() IS NULL
  AND session_user='postgres' AND current_setting('role')='none' THEN RETURN NEW; END IF;$patch$ from position for 5);
 EXECUTE body;
END $$;

CREATE OR REPLACE FUNCTION edupulse_private.issue_class_code(rec public.edupulse_institutional_records) RETURNS void
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
  IF edupulse_private.completed_term(y,rec.data->>'Semester') THEN RETURN;END IF;
  -- A code made for a previous instructor of this class no longer opens it.
  UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE load_key=rec.record_key AND disabled_at IS NULL AND instructor_id<>instructor;
  IF EXISTS(SELECT 1 FROM edupulse_private.class_codes WHERE load_key=rec.record_key AND disabled_at IS NULL) THEN RETURN;END IF;
  INSERT INTO edupulse_private.class_codes(code,load_key,parent_key,instructor_id,course_code,block,academic_year,semester)
   VALUES(edupulse_private.new_class_code(),rec.record_key,coalesce(nullif(rec.data->>'ParentLoadKey',''),rec.record_key),instructor,rec.data->>'CourseCode',blk,y,sem);
 END;
END $$;


CREATE OR REPLACE FUNCTION edupulse_private.class_code_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.kind='loads' AND OLD.data->>'LoadType'='class' THEN
   UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE load_key=OLD.record_key AND disabled_at IS NULL;
  END IF;
  RETURN OLD;
 END IF;
 IF NEW.kind='loads' AND NEW.data->>'LoadType'='class'
  AND (TG_OP='INSERT' OR OLD.data->>'InstructorID' IS DISTINCT FROM NEW.data->>'InstructorID') THEN
  PERFORM edupulse_private.issue_class_code(NEW);
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION edupulse_private.ensure_loaded_class(parent public.edupulse_institutional_records) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry jsonb; letter text; created_key text; child public.edupulse_institutional_records;
BEGIN
 IF parent.kind IS DISTINCT FROM 'loads' OR parent.data->>'LoadType' IS DISTINCT FROM 'course'
  OR coalesce(parent.data->>'Status','')~*'^(inactive|suspended|withdrawn|deleted)$'
  OR edupulse_private.completed_term(parent.data->>'AcademicYear',parent.data->>'Semester') THEN RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads'
  AND r.data->>'InstructorID'=parent.data->>'InstructorID' AND r.data->>'CourseCode'=parent.data->>'CourseCode'
  AND r.data->>'AcademicYear'=parent.data->>'AcademicYear'
  AND edupulse_private.canonical_semester(r.data->>'Semester')=edupulse_private.canonical_semester(parent.data->>'Semester')
  AND coalesce(r.data->>'Block','') NOT IN ('','IRREGULAR')) THEN
  FOR entry IN SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(parent.data->'SourceRows')='array' AND jsonb_array_length(parent.data->'SourceRows')>0 THEN parent.data->'SourceRows' ELSE '[{}]'::jsonb END)
   ORDER BY edupulse_private.printed_block(value->>'subject_code')='',edupulse_private.schedule_rank(value->>'days',value->>'time') LOOP
   letter:=nullif(edupulse_private.printed_block(entry->>'subject_code'),'');
   IF letter IS NULL THEN
    SELECT l INTO letter FROM unnest(string_to_array('A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z',',')) WITH ORDINALITY a(l,n)
    WHERE NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads'
     AND r.data->>'CourseCode'=parent.data->>'CourseCode' AND r.data->>'AcademicYear'=parent.data->>'AcademicYear'
     AND edupulse_private.canonical_semester(r.data->>'Semester')=edupulse_private.canonical_semester(parent.data->>'Semester') AND r.data->>'Block'=l)
    ORDER BY n LIMIT 1;
   END IF;
   IF letter IS NULL THEN RAISE EXCEPTION 'No free block label remains for this loaded course.' USING ERRCODE='22023'; END IF;
   IF coalesce(btrim(concat_ws('',entry->>'days',entry->>'time',entry->>'room')),'')='' THEN
    created_key:=edupulse_private.upsert_block_section(parent,letter,'{}'::jsonb,'automatic-loaded-class');
   ELSE
    created_key:=edupulse_private.teaching_load_block(parent.record_key,entry||jsonb_build_object('block',letter),'automatic-loaded-class');
   END IF;
   IF nullif(parent.data->>'TeachingSyllabusID','') IS NOT NULL THEN
    UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('TeachingSyllabusID',parent.data->>'TeachingSyllabusID') WHERE kind='loads' AND record_key=created_key;
   END IF;
  END LOOP;
 END IF;
 FOR child IN SELECT r.* FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'LoadType'='class'
  AND r.data->>'InstructorID'=parent.data->>'InstructorID' AND r.data->>'CourseCode'=parent.data->>'CourseCode'
  AND r.data->>'AcademicYear'=parent.data->>'AcademicYear'
  AND edupulse_private.canonical_semester(r.data->>'Semester')=edupulse_private.canonical_semester(parent.data->>'Semester')
  AND NOT EXISTS(SELECT 1 FROM edupulse_private.class_codes c WHERE c.load_key=r.record_key AND c.instructor_id=(r.data->>'InstructorID')::uuid) LOOP
  PERFORM edupulse_private.issue_class_code(child);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.ensure_loaded_class(public.edupulse_institutional_records) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION edupulse_private.loaded_class_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE parent public.edupulse_institutional_records;
BEGIN
 IF NEW.kind='loads' AND NEW.data->>'LoadType'='course' THEN
  SELECT * INTO parent FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=NEW.record_key;
  IF parent.record_key IS NOT NULL THEN PERFORM edupulse_private.ensure_loaded_class(parent); END IF;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.loaded_class_trigger() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER zz_edupulse_loaded_class AFTER INSERT OR UPDATE ON public.edupulse_institutional_records
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION edupulse_private.loaded_class_trigger();

DO $$ DECLARE parent public.edupulse_institutional_records; BEGIN
 FOR parent IN SELECT * FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'LoadType'='course' ORDER BY record_key LOOP
  PERFORM edupulse_private.ensure_loaded_class(parent);
 END LOOP;
END $$;
