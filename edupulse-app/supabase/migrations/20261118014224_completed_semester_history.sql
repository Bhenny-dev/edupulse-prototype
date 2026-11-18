-- Completed (and other non-editable recorded) semesters are immutable through every writer.
CREATE OR REPLACE FUNCTION edupulse_private.completed_term(year text,semester text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(year~'^20[0-9]{2}-20[0-9]{2}$' AND edupulse_private.canonical_semester(semester) IN ('1st Semester','2nd Semester','Summer') AND NOT edupulse_private.editable_course_term(year,semester),false)
$$;

CREATE FUNCTION edupulse_private.guard_completed_workspace() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE source jsonb; candidate jsonb; before_content jsonb; after_content jsonb; entry jsonb;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.handover_workspace_write(NEW.owner_id) THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN
  FOR source IN SELECT value FROM jsonb_array_elements(coalesce(OLD.data->'syllabi','[]')) WHERE edupulse_private.completed_term(value->'courseInfo'->>'academicYear',value->'courseInfo'->>'periodOffered') AND (value->>'status' IN ('active','approved_uploaded','archived') OR EXISTS(SELECT 1 FROM public.edupulse_publications p WHERE p.course_id=md5(NEW.owner_id::text||':'||(value->>'id')))) LOOP
   SELECT value INTO candidate FROM jsonb_array_elements(NEW.data->'syllabi') WHERE value->>'id'=source->>'id';
   SELECT coalesce(jsonb_object_agg(k,v),'{}') INTO before_content FROM jsonb_each(coalesce(OLD.data->'content','{}')) e(k,v) WHERE v->>'syllabusId'=source->>'id';
   SELECT coalesce(jsonb_object_agg(k,v),'{}') INTO after_content FROM jsonb_each(coalesce(NEW.data->'content','{}')) e(k,v) WHERE v->>'syllabusId'=source->>'id';
   IF source IS DISTINCT FROM candidate OR before_content IS DISTINCT FROM after_content THEN RAISE EXCEPTION 'Completed-semester syllabi and courseware are view-only. Prepare a separate copy for the current or next semester.' USING ERRCODE='42501';END IF;
  END LOOP;
  FOR entry IN SELECT value FROM jsonb_array_elements(coalesce(OLD.data->'registrations','[]')) WHERE edupulse_private.completed_term(value->>'academicYear',value->>'semester') LOOP
   IF NOT coalesce(NEW.data->'registrations','[]') @> jsonb_build_array(entry) THEN RAISE EXCEPTION 'Completed-semester class lists are view-only.' USING ERRCODE='42501';END IF;
  END LOOP;
  FOR entry IN SELECT value FROM jsonb_array_elements(coalesce(OLD.data->'enrollmentOverrides','[]')) WHERE edupulse_private.completed_term(value->>'academicYear',value->>'semester') LOOP
   IF NOT coalesce(NEW.data->'enrollmentOverrides','[]') @> jsonb_build_array(entry) THEN RAISE EXCEPTION 'Completed-semester memberships are view-only.' USING ERRCODE='42501';END IF;
  END LOOP;
 END IF;
 FOR source IN SELECT value FROM jsonb_array_elements(coalesce(NEW.data->'syllabi','[]')) WHERE value->>'status' IN ('active','approved_uploaded','archived') AND edupulse_private.completed_term(value->'courseInfo'->>'academicYear',value->'courseInfo'->>'periodOffered') LOOP
  IF TG_OP='INSERT' OR NOT coalesce(OLD.data->'syllabi','[]') @> jsonb_build_array(source) THEN RAISE EXCEPTION 'Only the current or next semester can receive an operational syllabus.' USING ERRCODE='42501';END IF;
 END LOOP;
 FOR entry IN SELECT value FROM jsonb_array_elements(coalesce(NEW.data->'registrations','[]')) WHERE edupulse_private.completed_term(value->>'academicYear',value->>'semester') LOOP
  IF TG_OP='INSERT' OR NOT coalesce(OLD.data->'registrations','[]') @> jsonb_build_array(entry) THEN RAISE EXCEPTION 'Completed-semester class lists are view-only.' USING ERRCODE='42501';END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.guard_completed_workspace() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER aa_completed_workspace BEFORE INSERT OR UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.guard_completed_workspace();

CREATE FUNCTION edupulse_private.guard_completed_academic_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE course_id text;payload jsonb;old_payload jsonb;
BEGIN
 IF auth.uid() IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 IF TG_OP<>'INSERT' THEN
  old_payload:=to_jsonb(OLD);
  course_id:=CASE WHEN TG_TABLE_NAME='edupulse_courses' THEN old_payload->>'id' WHEN old_payload?'course_id' THEN old_payload->>'course_id' ELSE (SELECT p.course_id FROM public.edupulse_publications p WHERE p.id=old_payload->>'publication_id') END;
  IF edupulse_private.completed_course(course_id) THEN RAISE EXCEPTION 'This semester is view-only. Its recorded teaching and learner history cannot be changed.' USING ERRCODE='42501';END IF;
 END IF;
 IF TG_OP<>'DELETE' THEN
  payload:=to_jsonb(NEW);
  course_id:=CASE WHEN TG_TABLE_NAME='edupulse_courses' THEN payload->>'id' WHEN payload?'course_id' THEN payload->>'course_id' ELSE (SELECT p.course_id FROM public.edupulse_publications p WHERE p.id=payload->>'publication_id') END;
  IF edupulse_private.completed_course(course_id) OR TG_TABLE_NAME='edupulse_courses' AND edupulse_private.completed_term(payload->>'academic_year',payload->>'semester') THEN RAISE EXCEPTION 'This semester is view-only. Its recorded teaching and learner history cannot be changed.' USING ERRCODE='42501';END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.guard_completed_academic_row() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE name text;BEGIN
 FOREACH name IN ARRAY ARRAY['edupulse_courses','edupulse_enrollments','edupulse_publications','edupulse_attempts','edupulse_material_access','edupulse_material_progress','edupulse_assessment_sessions','edupulse_delivery_schedules'] LOOP
  EXECUTE format('CREATE TRIGGER aa_completed_semester BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION edupulse_private.guard_completed_academic_row()',name);
 END LOOP;
END $$;

-- An account removal releases only editable teaching loads; historical assignments remain.
DO $$ DECLARE name regprocedure;body text;BEGIN
 FOR name IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='edupulse_private' AND p.proname='dean_account_status' LOOP
  body:=pg_get_functiondef(name);
  body:=replace(body,$old$WHERE kind='loads' AND data->>'InstructorID'=p_id::text;$old$,$new$WHERE kind='loads' AND data->>'InstructorID'=p_id::text AND edupulse_private.editable_course_term(data->>'AcademicYear',data->>'Semester');$new$);EXECUTE body;
 END LOOP;
 body:=pg_get_functiondef('edupulse_private.apply_roster_overrides()'::regprocedure);
 body:=replace(body,'WHERE e.course_id=c.id AND c.instructor_id=NEW.owner_id',$scope$WHERE e.course_id=c.id AND NOT edupulse_private.completed_course(c.id) AND coalesce(nullif(c.academic_year,''),'2026-2027')=coalesce(nullif(decision->>'academicYear',''),'2026-2027') AND edupulse_private.canonical_semester(coalesce(nullif(c.semester,''),'1st Semester'))=edupulse_private.canonical_semester(coalesce(nullif(decision->>'semester',''),'1st Semester')) AND c.instructor_id=NEW.owner_id$scope$);EXECUTE body;
 body:=pg_get_functiondef('edupulse_private.guard_roster_membership()'::regprocedure);
 body:=replace(body,'DECLARE decision jsonb; code text; snapshot jsonb;','DECLARE decision jsonb; code text; snapshot jsonb; scope_year text; scope_semester text;');
 body:=replace(body,'SELECT c.course_code,w.data INTO code,snapshot','SELECT c.course_code,w.data,c.academic_year,c.semester INTO code,snapshot,scope_year,scope_semester');
 body:=replace(body,$old$WHERE value->>'courseCode'=code AND lower(value->>'studentEmail')=NEW.student_email LOOP$old$,$new$WHERE value->>'courseCode'=code AND lower(value->>'studentEmail')=NEW.student_email AND coalesce(nullif(value->>'academicYear',''),'2026-2027')=coalesce(nullif(scope_year,''),'2026-2027') AND edupulse_private.canonical_semester(coalesce(nullif(value->>'semester',''),'1st Semester'))=edupulse_private.canonical_semester(coalesce(nullif(scope_semester,''),'1st Semester')) LOOP$new$);EXECUTE body;
END $$;
