-- Additive, read-compatible projection. Legacy owner workspaces remain authoritative.
-- This deployment serves one institution/college; no cross-project/tenant sharing.
CREATE SCHEMA IF NOT EXISTS edupulse_private;
REVOKE ALL ON SCHEMA edupulse_private FROM PUBLIC, anon, authenticated;
-- Consult trusted current metadata so removed/reassigned users cannot retain a
-- privileged academic role until an old access token expires.
CREATE FUNCTION edupulse_private.academic_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id=(SELECT auth.uid())
$$;
REVOKE ALL ON FUNCTION edupulse_private.academic_role() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.academic_role() TO authenticated;

CREATE TABLE public.edupulse_courses (
 id text PRIMARY KEY, instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 syllabus_id text NOT NULL, course_code text NOT NULL, course_title text NOT NULL,
 active boolean NOT NULL, source_revision bigint NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(instructor_id, syllabus_id)
);
CREATE TABLE public.edupulse_enrollments (
 course_id text NOT NULL REFERENCES public.edupulse_courses(id) ON DELETE CASCADE,
 instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 student_email text NOT NULL CHECK(student_email = lower(student_email)),
 student_ref text NOT NULL DEFAULT '', display_name text NOT NULL, block_section text NOT NULL,
 PRIMARY KEY(course_id, student_email, block_section)
);
CREATE TABLE public.edupulse_publications (
 id text PRIMARY KEY, course_id text NOT NULL REFERENCES public.edupulse_courses(id) ON DELETE CASCADE,
 instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, workspace_item_id text NOT NULL,
 week integer NOT NULL CHECK(week BETWEEN 1 AND 52), type text NOT NULL CHECK(type IN ('material','activity','assessment')),
 title text NOT NULL, content jsonb NOT NULL, source_version text NOT NULL,
 active boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(instructor_id, workspace_item_id)
);
CREATE TABLE edupulse_private.assessment_keys (
 publication_id text PRIMARY KEY REFERENCES public.edupulse_publications(id) ON DELETE CASCADE,
 source_version text NOT NULL, answers jsonb NOT NULL
);
CREATE TABLE public.edupulse_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), publication_id text NOT NULL REFERENCES public.edupulse_publications(id) ON DELETE CASCADE,
 instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 source_version text NOT NULL, answers jsonb NOT NULL, score integer NOT NULL, max_score integer NOT NULL,
 submitted_at timestamptz NOT NULL DEFAULT now(), CHECK(score BETWEEN 0 AND max_score),
 UNIQUE(publication_id, student_id, source_version)
);
CREATE TABLE public.edupulse_material_access (
 publication_id text NOT NULL REFERENCES public.edupulse_publications(id) ON DELETE CASCADE,
 instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 first_opened_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(publication_id, student_id)
);
CREATE INDEX edupulse_courses_instructor_idx ON public.edupulse_courses(instructor_id);
CREATE INDEX edupulse_enrollments_email_idx ON public.edupulse_enrollments(student_email, course_id);
CREATE INDEX edupulse_enrollments_instructor_idx ON public.edupulse_enrollments(instructor_id);
CREATE INDEX edupulse_publications_course_idx ON public.edupulse_publications(course_id, active);
CREATE INDEX edupulse_publications_instructor_idx ON public.edupulse_publications(instructor_id);
CREATE INDEX edupulse_attempts_instructor_idx ON public.edupulse_attempts(instructor_id);
CREATE INDEX edupulse_attempts_student_idx ON public.edupulse_attempts(student_id);
CREATE INDEX edupulse_material_access_instructor_idx ON public.edupulse_material_access(instructor_id);
CREATE INDEX edupulse_material_access_student_idx ON public.edupulse_material_access(student_id);

ALTER TABLE public.edupulse_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_material_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE edupulse_private.assessment_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_courses, public.edupulse_enrollments, public.edupulse_publications, public.edupulse_attempts, public.edupulse_material_access FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.edupulse_courses, public.edupulse_enrollments, public.edupulse_publications, public.edupulse_attempts, public.edupulse_material_access TO authenticated;

CREATE POLICY enrollment_read ON public.edupulse_enrollments FOR SELECT TO authenticated USING (
 ((SELECT edupulse_private.academic_role()) IN ('dean','associate_dean')) OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND student_email=lower((SELECT auth.jwt()->>'email')))
);
CREATE POLICY course_read ON public.edupulse_courses FOR SELECT TO authenticated USING (
 ((SELECT edupulse_private.academic_role()) IN ('dean','associate_dean')) OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND active AND EXISTS (SELECT 1 FROM public.edupulse_enrollments e WHERE e.course_id=id AND e.student_email=lower((SELECT auth.jwt()->>'email'))))
);
CREATE POLICY publication_read ON public.edupulse_publications FOR SELECT TO authenticated USING (
 ((SELECT edupulse_private.academic_role()) IN ('dean','associate_dean')) OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND active AND EXISTS (SELECT 1 FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id WHERE e.course_id=edupulse_publications.course_id AND c.active AND e.student_email=lower((SELECT auth.jwt()->>'email'))))
);
CREATE POLICY attempt_read ON public.edupulse_attempts FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role())='dean' OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND student_id=(SELECT auth.uid()))
);
CREATE POLICY access_read ON public.edupulse_material_access FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role())='dean' OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND student_id=(SELECT auth.uid()))
);

-- A narrowly scoped trigger projects only the authenticated owner's reviewed snapshot.
-- Definer access is needed to write projection tables and private keys, never to grant raw table writes.
CREATE FUNCTION edupulse_private.project_workspace() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s jsonb; r jsonb; student jsonb; item record; question jsonb; cid text; pid text; public_content jsonb; keys jsonb; previous jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM NEW.owner_id THEN RAISE EXCEPTION 'Workspace owner required' USING ERRCODE='42501'; END IF;
 IF coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RETURN NEW; END IF;
 UPDATE public.edupulse_courses SET active=false WHERE instructor_id=NEW.owner_id;
 UPDATE public.edupulse_publications SET active=false WHERE instructor_id=NEW.owner_id;
 DELETE FROM public.edupulse_enrollments WHERE instructor_id=NEW.owner_id;
 FOR s IN SELECT value FROM jsonb_array_elements(NEW.data->'syllabi') LOOP
  IF coalesce((s->>'sample')::boolean,false) THEN CONTINUE; END IF;
  cid := md5(NEW.owner_id::text || ':' || (s->>'id'));
  INSERT INTO public.edupulse_courses(id,instructor_id,syllabus_id,course_code,course_title,active,source_revision)
   VALUES(cid,NEW.owner_id,s->>'id',s->>'courseCode',s->>'courseTitle',s->>'status'='active' AND s->'approvedFile'->>'approvalAttested'='true',NEW.revision)
   ON CONFLICT(id) DO UPDATE SET course_code=excluded.course_code,course_title=excluded.course_title,active=excluded.active,source_revision=excluded.source_revision,updated_at=now();
  FOR r IN SELECT value FROM jsonb_array_elements(coalesce(NEW.data->'registrations','[]')) WHERE value->>'courseCode'=s->>'courseCode' AND value->>'status'='active' LOOP
   FOR student IN SELECT value FROM jsonb_array_elements(coalesce(r->'students','[]')) LOOP
    IF coalesce(student->>'Email','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN CONTINUE; END IF;
    INSERT INTO public.edupulse_enrollments(course_id,instructor_id,student_email,student_ref,display_name,block_section)
     VALUES(cid,NEW.owner_id,lower(student->>'Email'),coalesce(student->>'StudentID',''),coalesce(student->>'Name',''),coalesce(r->>'blockSection','')) ON CONFLICT DO NOTHING;
   END LOOP;
  END LOOP;
 END LOOP;
 FOR item IN SELECT key,value FROM jsonb_each(NEW.data->'content') WHERE value->>'status'='published' LOOP
  SELECT id INTO cid FROM public.edupulse_courses WHERE instructor_id=NEW.owner_id AND syllabus_id=item.value->>'syllabusId' AND active;
  IF cid IS NULL THEN RAISE EXCEPTION 'An active approved syllabus is required to publish' USING ERRCODE='22023'; END IF;
  previous := CASE WHEN TG_OP='UPDATE' THEN OLD.data->'content'->item.key ELSE NULL END;
  IF previous IS NULL OR previous->>'status' NOT IN ('checked','published') OR previous->'content' IS DISTINCT FROM item.value->'content' OR previous->>'type' IS DISTINCT FROM item.value->>'type' OR previous->>'week' IS DISTINCT FROM item.value->>'week' OR previous->>'syllabusId' IS DISTINCT FROM item.value->>'syllabusId' THEN
   RAISE EXCEPTION 'Save and review a checked draft before publication' USING ERRCODE='22023';
  END IF;
  public_content := item.value->'content'; keys := '[]';
  IF item.value->>'type'='assessment' THEN
   IF jsonb_typeof(public_content->'questions') IS DISTINCT FROM 'array' OR jsonb_array_length(public_content->'questions') NOT BETWEEN 3 AND 5 THEN RAISE EXCEPTION 'Invalid reviewed assessment' USING ERRCODE='22023'; END IF;
   FOR question IN SELECT value FROM jsonb_array_elements(public_content->'questions') LOOP
    IF jsonb_typeof(question->'correctIndex') IS DISTINCT FROM 'number' OR (question->>'correctIndex')::int NOT BETWEEN 0 AND 3 OR jsonb_array_length(question->'options')<>4 THEN RAISE EXCEPTION 'Invalid assessment key' USING ERRCODE='22023'; END IF;
    keys := keys || jsonb_build_array(question->'correctIndex');
   END LOOP;
   SELECT jsonb_set(public_content,'{questions}',jsonb_agg(value - 'correctIndex' - 'explanation' - 'correct' - 'answer')) INTO public_content FROM jsonb_array_elements(public_content->'questions');
  END IF;
  pid := md5(NEW.owner_id::text || ':' || item.key);
  INSERT INTO public.edupulse_publications(id,course_id,instructor_id,workspace_item_id,week,type,title,content,source_version,active)
   VALUES(pid,cid,NEW.owner_id,item.key,(item.value->>'week')::int,item.value->>'type',coalesce(item.value->'content'->>'title','Course material'),public_content,md5((item.value->'content')::text),true)
   ON CONFLICT(id) DO UPDATE SET course_id=excluded.course_id,week=excluded.week,type=excluded.type,title=excluded.title,content=excluded.content,source_version=excluded.source_version,active=true,updated_at=now();
  IF item.value->>'type'='assessment' THEN INSERT INTO edupulse_private.assessment_keys VALUES(pid,md5((item.value->'content')::text),keys) ON CONFLICT(publication_id) DO UPDATE SET source_version=excluded.source_version,answers=excluded.answers; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.project_workspace() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER edupulse_project_workspace AFTER INSERT OR UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.project_workspace();

CREATE FUNCTION public.edupulse_sync_academic_workspace() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RAISE EXCEPTION 'Instructor required' USING ERRCODE='42501'; END IF;
 UPDATE public.edupulse_workspaces SET data=data WHERE owner_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.edupulse_sync_academic_workspace() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_sync_academic_workspace() TO authenticated;

-- Private, bounded grading command. No caller can supply a score or another student's ID.
CREATE FUNCTION edupulse_private.academic_action(publication text, version text, responses jsonb, operation text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; result public.edupulse_attempts; keys jsonb; points integer:=0; i integer;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'')<>'student' THEN RAISE EXCEPTION 'Student required' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication FOR SHARE;
 IF p.id IS NULL OR NOT p.active OR p.source_version<>version OR NOT EXISTS(SELECT 1 FROM public.edupulse_courses c JOIN public.edupulse_enrollments e ON e.course_id=c.id WHERE c.id=p.course_id AND c.active AND e.student_email=lower(auth.jwt()->>'email')) THEN RAISE EXCEPTION 'Published enrolled material required' USING ERRCODE='42501'; END IF;
 IF operation='open' AND p.type<>'assessment' THEN
  INSERT INTO public.edupulse_material_access(publication_id,instructor_id,student_id) VALUES(p.id,p.instructor_id,auth.uid()) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('opened',true);
 END IF;
 IF operation<>'submit' OR p.type<>'assessment' THEN RAISE EXCEPTION 'Invalid academic operation' USING ERRCODE='22023'; END IF;
 SELECT answers INTO keys FROM edupulse_private.assessment_keys WHERE publication_id=p.id AND source_version=version;
 IF keys IS NULL OR jsonb_typeof(responses) IS DISTINCT FROM 'array' OR jsonb_array_length(responses)<>jsonb_array_length(keys) THEN RAISE EXCEPTION 'Answer every assessment item' USING ERRCODE='22023'; END IF;
 FOR i IN 0..jsonb_array_length(keys)-1 LOOP
  IF jsonb_typeof(responses->i)<>'number' OR (responses->>i)::int NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Invalid response' USING ERRCODE='22023'; END IF;
  IF responses->i=keys->i THEN points:=points+1; END IF;
 END LOOP;
 INSERT INTO public.edupulse_attempts(publication_id,instructor_id,student_id,source_version,answers,score,max_score)
  VALUES(p.id,p.instructor_id,auth.uid(),version,responses,points,jsonb_array_length(keys)) ON CONFLICT(publication_id,student_id,source_version) DO NOTHING;
 SELECT * INTO result FROM public.edupulse_attempts WHERE publication_id=p.id AND student_id=auth.uid() AND source_version=version;
 RETURN jsonb_build_object('id',result.id,'score',result.score,'max_score',result.max_score,'submitted_at',result.submitted_at);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.academic_action(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA edupulse_private TO authenticated;
GRANT EXECUTE ON FUNCTION edupulse_private.academic_action(text,text,jsonb,text) TO authenticated;
CREATE FUNCTION public.edupulse_academic_action(publication text, version text, responses jsonb DEFAULT '[]', operation text DEFAULT 'open') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.academic_action(publication,version,responses,operation) $$;
REVOKE ALL ON FUNCTION public.edupulse_academic_action(text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_academic_action(text,text,jsonb,text) TO authenticated;
