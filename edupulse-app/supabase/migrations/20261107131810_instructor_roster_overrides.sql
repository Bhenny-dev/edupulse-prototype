-- Apply explicit instructor membership decisions after the existing workspace projection.
-- Shared imports remain the institutional source; they cannot silently undo a course removal.
-- Imports also insert enrollments directly. Enforce the same owner's decision there.
CREATE FUNCTION edupulse_private.guard_roster_membership() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE decision jsonb; code text; snapshot jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 SELECT c.course_code,w.data INTO code,snapshot FROM public.edupulse_courses c
  JOIN public.edupulse_workspaces w ON w.owner_id=c.instructor_id
  WHERE c.id=NEW.course_id AND c.instructor_id=NEW.instructor_id;
 FOR decision IN SELECT value FROM jsonb_array_elements(coalesce(snapshot->'enrollmentOverrides','[]'))
  WHERE value->>'courseCode'=code AND lower(value->>'studentEmail')=NEW.student_email LOOP
  IF decision->>'excluded'='true' THEN RETURN NULL; END IF;
  IF nullif(btrim(decision->>'blockSection'),'') IS NOT NULL THEN NEW.block_section:=upper(btrim(decision->>'blockSection')); END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.edupulse_enrollments WHERE course_id=NEW.course_id AND block_section=NEW.block_section AND student_email<>NEW.student_email)>=35 THEN
  RAISE EXCEPTION 'A course block supports up to 35 students' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.guard_roster_membership() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER edupulse_guard_roster_membership BEFORE INSERT OR UPDATE ON public.edupulse_enrollments
 FOR EACH ROW EXECUTE FUNCTION edupulse_private.guard_roster_membership();

CREATE FUNCTION edupulse_private.apply_roster_overrides() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE decision jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Workspace owner required' USING ERRCODE='42501'; END IF;
 IF coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RETURN NEW; END IF;
 FOR decision IN SELECT value FROM jsonb_array_elements(coalesce(NEW.data->'enrollmentOverrides','[]')) LOOP
  IF decision->>'courseCode' IS NULL OR coalesce(decision->>'studentEmail','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR jsonb_typeof(decision->'excluded') IS DISTINCT FROM 'boolean' THEN
   RAISE EXCEPTION 'Invalid course membership decision' USING ERRCODE='22023';
  END IF;
  IF (decision->>'excluded')::boolean THEN
   DELETE FROM public.edupulse_enrollments e USING public.edupulse_courses c
    WHERE e.course_id=c.id AND c.instructor_id=NEW.owner_id AND e.instructor_id=NEW.owner_id
      AND c.course_code=decision->>'courseCode' AND e.student_email=lower(decision->>'studentEmail');
  ELSIF nullif(btrim(decision->>'blockSection'),'') IS NOT NULL THEN
   UPDATE public.edupulse_enrollments e SET block_section=upper(btrim(decision->>'blockSection')) FROM public.edupulse_courses c
    WHERE e.course_id=c.id AND c.instructor_id=NEW.owner_id AND e.instructor_id=NEW.owner_id
      AND c.course_code=decision->>'courseCode' AND e.student_email=lower(decision->>'studentEmail');
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.edupulse_enrollments WHERE instructor_id=NEW.owner_id GROUP BY course_id,block_section HAVING count(*)>35) THEN
  RAISE EXCEPTION 'A course block supports up to 35 students' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.apply_roster_overrides() FROM PUBLIC,anon,authenticated;
-- PostgreSQL runs same-kind triggers by name; this must follow edupulse_project_workspace.
CREATE TRIGGER zz_edupulse_roster_overrides AFTER INSERT OR UPDATE ON public.edupulse_workspaces
 FOR EACH ROW EXECUTE FUNCTION edupulse_private.apply_roster_overrides();
