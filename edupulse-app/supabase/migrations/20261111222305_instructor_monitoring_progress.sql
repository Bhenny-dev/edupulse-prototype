-- Course-scoped roster suspension and explicit, version-bound reading confirmations.
ALTER TABLE public.edupulse_enrollments ADD COLUMN suspended boolean NOT NULL DEFAULT false,
 ADD COLUMN year_level integer CHECK(year_level BETWEEN 1 AND 4);
ALTER TABLE public.edupulse_assessment_sessions ADD COLUMN student_email text NOT NULL DEFAULT '', ADD COLUMN is_test boolean;
UPDATE public.edupulse_assessment_sessions s SET student_email=lower(u.email) FROM auth.users u WHERE u.id=s.student_id AND s.student_email='';
CREATE FUNCTION edupulse_private.label_assessment_session() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 SELECT lower(email) INTO NEW.student_email FROM auth.users WHERE id=NEW.student_id;
 NEW.is_test:=EXISTS(SELECT 1 FROM edupulse_private.pipeline_activity_grants g WHERE g.publication_id=NEW.publication_id AND g.source_version=NEW.source_version AND g.student_id=NEW.student_id);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.label_assessment_session() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER label_assessment_session BEFORE INSERT ON public.edupulse_assessment_sessions FOR EACH ROW EXECUTE FUNCTION edupulse_private.label_assessment_session();
CREATE POLICY instructor_session_read ON public.edupulse_assessment_sessions FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role())='dean' OR ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND EXISTS(SELECT 1 FROM public.edupulse_publications p WHERE p.id=publication_id AND p.instructor_id=(SELECT auth.uid()))));

CREATE FUNCTION edupulse_private.has_active_enrollment(course text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.edupulse_enrollments e JOIN auth.users u ON u.id=(SELECT auth.uid()) WHERE e.course_id=course AND e.student_email=lower(u.email) AND NOT e.suspended)
$$;
REVOKE ALL ON FUNCTION edupulse_private.has_active_enrollment(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.has_active_enrollment(text) TO authenticated;
DROP POLICY course_read ON public.edupulse_courses;
CREATE POLICY course_read ON public.edupulse_courses FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean') OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND active AND edupulse_private.has_active_enrollment(id)));
DROP POLICY publication_read ON public.edupulse_publications;
CREATE POLICY publication_read ON public.edupulse_publications FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean') OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND active AND (release_at IS NULL OR release_at<=now()) AND edupulse_private.has_active_enrollment(course_id) AND EXISTS(SELECT 1 FROM public.edupulse_courses c WHERE c.id=course_id AND c.active)));

CREATE TABLE public.edupulse_material_progress (
 publication_id text NOT NULL REFERENCES public.edupulse_publications(id) ON DELETE CASCADE,
 instructor_id uuid NOT NULL REFERENCES auth.users(id), student_id uuid NOT NULL REFERENCES auth.users(id),
 student_email text NOT NULL, source_version text NOT NULL,
 sections_read integer NOT NULL CHECK(sections_read>=0),total_sections integer NOT NULL CHECK(total_sections BETWEEN 1 AND 1000),
 updated_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,is_test boolean NOT NULL DEFAULT false,
 PRIMARY KEY(publication_id,student_id,source_version),CHECK(sections_read<=total_sections));
CREATE INDEX edupulse_progress_instructor_idx ON public.edupulse_material_progress(instructor_id);
CREATE INDEX edupulse_progress_student_idx ON public.edupulse_material_progress(student_id);
ALTER TABLE public.edupulse_material_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_material_progress FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.edupulse_material_progress TO authenticated;
CREATE POLICY progress_read ON public.edupulse_material_progress FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role())='dean' OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND student_id=(SELECT auth.uid())));
CREATE FUNCTION edupulse_private.read_material_section(publication text,version text,section integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; result public.edupulse_material_progress; n integer; email text; test_record boolean;
BEGIN
 IF (SELECT edupulse_private.academic_role()) IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Student sign-in required' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication AND active AND source_version=version AND type<>'assessment' AND (release_at IS NULL OR release_at<=now()) FOR SHARE;
 IF p.id IS NULL OR NOT edupulse_private.has_active_enrollment(p.course_id) OR NOT EXISTS(SELECT 1 FROM public.edupulse_courses c WHERE c.id=p.course_id AND c.active) THEN RAISE EXCEPTION 'Released enrolled material required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p.content->'sections') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Readable sections required' USING ERRCODE='22023'; END IF;
 n:=jsonb_array_length(p.content->'sections');
 IF n<1 OR n>1000 OR section IS NULL OR section<0 OR section>=n THEN RAISE EXCEPTION 'Invalid material section' USING ERRCODE='22023'; END IF;
 SELECT lower(u.email) INTO email FROM auth.users u WHERE u.id=auth.uid();
 IF NOT EXISTS(SELECT 1 FROM public.edupulse_material_access a WHERE a.publication_id=p.id AND a.student_id=auth.uid()) THEN RAISE EXCEPTION 'Open the material before confirming reading' USING ERRCODE='42501'; END IF;
 test_record:=EXISTS(SELECT 1 FROM edupulse_private.pipeline_activity_grants g WHERE g.publication_id=p.id AND g.source_version=p.source_version AND g.student_id=auth.uid());
 INSERT INTO public.edupulse_material_progress(publication_id,instructor_id,student_id,student_email,source_version,sections_read,total_sections,is_test)
 VALUES(p.id,p.instructor_id,auth.uid(),email,p.source_version,0,n,test_record) ON CONFLICT DO NOTHING;
 SELECT * INTO result FROM public.edupulse_material_progress r WHERE r.publication_id=p.id AND r.student_id=auth.uid() AND r.source_version=p.source_version FOR UPDATE;
 IF section>result.sections_read THEN RAISE EXCEPTION 'Confirm the preceding sections first' USING ERRCODE='22023'; END IF;
 IF section=result.sections_read THEN
 UPDATE public.edupulse_material_progress r SET sections_read=section+1,updated_at=now(),completed_at=CASE WHEN section+1=n THEN now() ELSE NULL END
 WHERE r.publication_id=p.id AND r.student_id=auth.uid() AND r.source_version=p.source_version RETURNING * INTO result;
 END IF;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.read_material_section(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.read_material_section(text,text,integer) TO authenticated;
CREATE FUNCTION public.edupulse_read_material_section(publication text,version text,section integer) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.read_material_section(publication,version,section) $$;
REVOKE ALL ON FUNCTION public.edupulse_read_material_section(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_read_material_section(text,text,integer) TO authenticated;

-- Existing publication/assessment validation and scoring stay authoritative. Add the same
-- membership check before any student action, including legacy endpoints and retakes.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.academic_action(text,text,jsonb,text)'::regprocedure);
 definition:=replace(definition,E'BEGIN\n',$guard$BEGIN
 IF edupulse_private.academic_role()='student' AND NOT edupulse_private.has_active_enrollment((SELECT pub.course_id FROM public.edupulse_publications pub WHERE pub.id=publication)) THEN RAISE EXCEPTION 'Active course membership required' USING ERRCODE='42501'; END IF;
$guard$);
 IF strpos(definition,'Active course membership required')=0 THEN RAISE EXCEPTION 'Student membership guard patch unavailable'; END IF;
 EXECUTE definition;
 definition:=pg_get_functiondef('public.edupulse_assessment_command(jsonb)'::regprocedure);
 definition:=replace(definition,E'BEGIN\n',$guard$BEGIN
 IF edupulse_private.academic_role()='student' AND command->>'operation' IN ('start','submit') AND NOT edupulse_private.has_active_enrollment((SELECT pub.course_id FROM public.edupulse_publications pub WHERE pub.id=command->>'publication')) THEN RAISE EXCEPTION 'Active course membership required' USING ERRCODE='42501'; END IF;
$guard$);
 IF strpos(definition,'Active course membership required')=0 THEN RAISE EXCEPTION 'Student membership guard patch unavailable'; END IF;
 EXECUTE definition;
END $$;
CREATE OR REPLACE FUNCTION edupulse_private.guard_roster_membership() RETURNS trigger
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
  NEW.suspended:=coalesce((decision->>'suspended')::boolean,false);
  NEW.year_level:=nullif(decision->>'yearLevel','')::integer;
  NEW.display_name:=coalesce(nullif(btrim(decision->>'displayName'),''),NEW.display_name);
  NEW.student_ref:=coalesce(btrim(decision->>'studentRef'),NEW.student_ref);
  IF nullif(btrim(decision->>'blockSection'),'') IS NOT NULL THEN NEW.block_section:=upper(btrim(decision->>'blockSection')); END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.edupulse_enrollments WHERE course_id=NEW.course_id AND block_section=NEW.block_section AND student_email<>NEW.student_email)>=35 THEN
  RAISE EXCEPTION 'A course block supports up to 35 students' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION edupulse_private.guard_roster_removal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Workspace owner required' USING ERRCODE='42501'; END IF;
 IF coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 IF EXISTS(
  WITH kept AS MATERIALIZED (SELECT value->>'courseCode' code FROM jsonb_array_elements(coalesce(NEW.data->'syllabi','[]'))),
  decisions AS MATERIALIZED (SELECT value->>'courseCode' code,lower(value->>'studentEmail') email,value->>'excluded' excluded FROM jsonb_array_elements(coalesce(NEW.data->'enrollmentOverrides','[]'))),
  roster AS MATERIALIZED (SELECT DISTINCT r->>'courseCode' code,lower(st->>'Email') email FROM jsonb_array_elements(coalesce(NEW.data->'registrations','[]')) r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r->'students','[]')) st WHERE r->>'status'='active')
  SELECT 1 FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id JOIN kept ON kept.code=c.course_code
  LEFT JOIN decisions d ON d.code=c.course_code AND d.email=e.student_email LEFT JOIN roster r ON r.code=c.course_code AND r.email=e.student_email
  WHERE e.instructor_id=NEW.owner_id AND c.instructor_id=NEW.owner_id AND NOT e.suspended AND (d.excluded='true' OR (e.source='workspace' AND r.email IS NULL))
 ) THEN RAISE EXCEPTION 'Suspend the student in this course before removing the membership' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.guard_roster_removal() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER aa_edupulse_guard_roster_removal BEFORE UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.guard_roster_removal();

-- The support gateway switches to the selected subject and applies normal RLS;
-- add read-only progress/session projections there, without allowing student activity.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,$find$'accesses',CASE WHEN subject_role='associate_dean'$find$,$add$'reading',CASE WHEN subject_role='associate_dean' THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') FROM public.edupulse_material_progress t) END,
 'sessions',CASE WHEN subject_role='associate_dean' THEN '[]'::jsonb ELSE (SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') FROM public.edupulse_assessment_sessions t) END,
 'accesses',CASE WHEN subject_role='associate_dean'$add$);
 IF strpos(definition,'edupulse_material_progress t')=0 THEN RAISE EXCEPTION 'Support progress projection patch unavailable'; END IF;
 EXECUTE definition;
END $$;

CREATE OR REPLACE FUNCTION edupulse_private.validate_roster_overrides() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE decision jsonb;
BEGIN
 IF NOT NEW.data ? 'enrollmentOverrides' THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.data->'enrollmentOverrides') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid course membership decisions' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(NEW.data->'enrollmentOverrides')>5000 THEN RAISE EXCEPTION 'Too many course membership decisions' USING ERRCODE='22023'; END IF;
 FOR decision IN SELECT value FROM jsonb_array_elements(NEW.data->'enrollmentOverrides') LOOP
  IF jsonb_typeof(decision) IS DISTINCT FROM 'object' OR jsonb_typeof(decision->'courseCode') IS DISTINCT FROM 'string'
    OR length(btrim(decision->>'courseCode')) NOT BETWEEN 1 AND 80
    OR jsonb_typeof(decision->'studentEmail') IS DISTINCT FROM 'string' OR length(decision->>'studentEmail')>254
    OR coalesce(decision->>'studentEmail','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    OR jsonb_typeof(decision->'excluded') IS DISTINCT FROM 'boolean'
    OR (decision ? 'suspended' AND jsonb_typeof(decision->'suspended') IS DISTINCT FROM 'boolean')
    OR (decision ? 'displayName' AND (jsonb_typeof(decision->'displayName') IS DISTINCT FROM 'string' OR length(btrim(decision->>'displayName')) NOT BETWEEN 1 AND 200))
    OR (decision ? 'studentRef' AND (jsonb_typeof(decision->'studentRef') IS DISTINCT FROM 'string' OR length(decision->>'studentRef')>80))
    OR (decision ? 'yearLevel' AND (jsonb_typeof(decision->'yearLevel') IS DISTINCT FROM 'number' OR decision->>'yearLevel' !~ '^[1-4]$'))
    OR (decision ? 'blockSection' AND (jsonb_typeof(decision->'blockSection') IS DISTINCT FROM 'string' OR length(btrim(decision->>'blockSection')) NOT BETWEEN 1 AND 80)) THEN
   RAISE EXCEPTION 'Invalid course membership decision' USING ERRCODE='22023';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'enrollmentOverrides') value GROUP BY value->>'courseCode',lower(value->>'studentEmail') HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Duplicate course membership decision' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.validate_roster_overrides() FROM PUBLIC,anon,authenticated;
