-- Preserve the 5e7d956 feature contract with additive, authorized records.
CREATE TABLE public.edupulse_institutional_records (
 kind text NOT NULL CHECK(kind IN ('courses','loads','rosters')), record_key text NOT NULL,
 data jsonb NOT NULL, updated_by uuid NOT NULL REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,record_key)
);
CREATE TABLE public.edupulse_academic_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL, title text NOT NULL, detail text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.edupulse_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, publication_id text REFERENCES public.edupulse_publications(id),
 kind text NOT NULL DEFAULT 'general', title text NOT NULL, detail text NOT NULL DEFAULT '', path text NOT NULL DEFAULT '/notifications',
 created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE INDEX edupulse_notices_recipient_idx ON public.edupulse_notices(recipient_id,created_at DESC);
CREATE INDEX edupulse_notices_publication_idx ON public.edupulse_notices(publication_id);
CREATE INDEX edupulse_notices_actor_idx ON public.edupulse_notices(actor_id);
CREATE INDEX edupulse_events_actor_idx ON public.edupulse_academic_events(actor_id,created_at DESC);
CREATE INDEX edupulse_records_author_idx ON public.edupulse_institutional_records(updated_by);
ALTER TABLE public.edupulse_institutional_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_institutional_records,public.edupulse_academic_events,public.edupulse_notices FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.edupulse_institutional_records,public.edupulse_academic_events,public.edupulse_notices TO authenticated;
CREATE POLICY institutional_read ON public.edupulse_institutional_records FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean','admin') OR
 ((SELECT edupulse_private.academic_role())='instructor' AND (kind='courses' OR (kind='loads' AND data->>'InstructorID'=(SELECT auth.uid())::text)))
);
CREATE POLICY academic_event_read ON public.edupulse_academic_events FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role())='dean' OR ((SELECT edupulse_private.academic_role())='associate_dean' AND kind NOT IN ('assessment_review')) OR actor_id=(SELECT auth.uid())
);
CREATE POLICY notice_read ON public.edupulse_notices FOR SELECT TO authenticated USING (recipient_id=(SELECT auth.uid()) AND created_at<=now());

ALTER TABLE public.edupulse_courses ADD COLUMN syllabus_status text NOT NULL DEFAULT 'drafted', ADD COLUMN outline jsonb NOT NULL DEFAULT '[]', ADD COLUMN instructor_name text NOT NULL DEFAULT '', ADD COLUMN source_links jsonb NOT NULL DEFAULT '[]', ADD COLUMN delivery jsonb NOT NULL DEFAULT '{}', ADD COLUMN block_info jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.edupulse_enrollments ADD COLUMN source text NOT NULL DEFAULT 'instructor';
ALTER TABLE public.edupulse_publications ADD COLUMN release_at timestamptz, ADD COLUMN due_at timestamptz;
ALTER TABLE public.edupulse_publications ADD CONSTRAINT edupulse_delivery_dates CHECK(release_at IS NULL OR due_at IS NULL OR due_at>release_at);
ALTER TABLE public.edupulse_attempts ADD COLUMN topic_scores jsonb NOT NULL DEFAULT '[]', ADD COLUMN question_scores jsonb NOT NULL DEFAULT '[]', ADD COLUMN grading_status text NOT NULL DEFAULT 'graded', ADD COLUMN reviewed_at timestamptz;

CREATE FUNCTION edupulse_private.refresh_imported_enrollments() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 DELETE FROM public.edupulse_enrollments WHERE source='institutional';
 DELETE FROM public.edupulse_enrollments e USING public.edupulse_courses c,public.edupulse_institutional_records l WHERE e.course_id=c.id AND l.kind='loads' AND l.data->>'CourseCode'=c.course_code AND l.data->>'Block'=e.block_section AND l.data->>'InstructorID'<>e.instructor_id::text;
 INSERT INTO public.edupulse_enrollments(course_id,instructor_id,student_email,student_ref,display_name,block_section,source)
 SELECT c.id,c.instructor_id,lower(r.data->>'Email'),r.data->>'StudentID',r.data->>'Name',r.data->>'Block','institutional'
 FROM public.edupulse_courses c JOIN public.edupulse_institutional_records l ON l.kind='loads' AND l.data->>'CourseCode'=c.course_code AND l.data->>'InstructorID'=c.instructor_id::text
 JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND r.data->>'Block'=l.data->>'Block'
 WHERE lower(coalesce(r.data->>'Status','active')) NOT IN ('inactive','withdrawn') ON CONFLICT DO NOTHING;
 UPDATE public.edupulse_courses c SET block_info=(SELECT coalesce(jsonb_agg(jsonb_build_object('block',block_section,'students',students,'schedule',schedule,'yearLevel',year_level,'adviser',adviser)),'[]') FROM (SELECT e.block_section,count(DISTINCT e.student_email) students,max(r.data->>'Schedule') schedule,max(r.data->>'YearLevel') year_level,max(r.data->>'Adviser') adviser FROM public.edupulse_enrollments e LEFT JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND lower(r.data->>'Email')=e.student_email AND r.data->>'Block'=e.block_section WHERE e.course_id=c.id GROUP BY e.block_section) blocks);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.refresh_imported_enrollments() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.edupulse_faculty() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',coalesce(raw_user_meta_data->>'full_name',email),'email',email)),'[]') FROM (SELECT * FROM auth.users WHERE raw_app_meta_data->>'role'='instructor' ORDER BY id LIMIT 1000) u);
END $$;
REVOKE ALL ON FUNCTION public.edupulse_faculty() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_faculty() TO authenticated;

CREATE FUNCTION public.edupulse_import_records(kind text, rows jsonb, filename text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; k text; created integer:=0; updated integer:=0; required text[]; field text;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management required' USING ERRCODE='42501'; END IF;
 IF kind NOT IN ('courses','loads','rosters') OR jsonb_typeof(rows) IS DISTINCT FROM 'array' OR jsonb_array_length(rows) NOT BETWEEN 1 AND 1000 OR octet_length(rows::text)>1000000 OR length(filename)>255 THEN RAISE EXCEPTION 'Invalid import' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 required:=CASE kind WHEN 'courses' THEN ARRAY['CourseCode','CourseTitle'] WHEN 'loads' THEN ARRAY['InstructorID','CourseCode','Block','Semester'] ELSE ARRAY['StudentID','Name','Email','Block'] END;
 FOR r IN SELECT value FROM jsonb_array_elements(rows) LOOP
  FOREACH field IN ARRAY required LOOP IF length(trim(coalesce(r->>field,'')))=0 OR length(r->>field)>500 THEN RAISE EXCEPTION 'Missing or invalid import field: %',field USING ERRCODE='22023'; END IF; END LOOP;
  IF kind='loads' AND (NOT EXISTS(SELECT 1 FROM auth.users WHERE id::text=r->>'InstructorID' AND raw_app_meta_data->>'role'='instructor') OR NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records x WHERE x.kind='courses' AND x.record_key=r->>'CourseCode')) THEN RAISE EXCEPTION 'Import the course first and select a provisioned instructor' USING ERRCODE='22023'; END IF;
  IF kind='rosters' AND r->>'Email' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Student email required' USING ERRCODE='22023'; END IF;
  k:=CASE kind WHEN 'courses' THEN r->>'CourseCode' WHEN 'loads' THEN concat_ws('|',r->>'CourseCode',r->>'Block',r->>'Semester') ELSE r->>'StudentID' END;
  IF EXISTS(SELECT 1 FROM public.edupulse_institutional_records x WHERE x.kind=edupulse_import_records.kind AND x.record_key=k) THEN updated:=updated+1; ELSE created:=created+1; END IF;
  INSERT INTO public.edupulse_institutional_records VALUES(kind,k,r,auth.uid(),now()) ON CONFLICT ON CONSTRAINT edupulse_institutional_records_pkey DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=now();
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.edupulse_institutional_records x WHERE x.kind='rosters' AND lower(coalesce(x.data->>'Status','active')) NOT IN ('inactive','withdrawn') GROUP BY x.data->>'Block' HAVING count(*)>35) THEN RAISE EXCEPTION 'A block may contain at most 35 active students' USING ERRCODE='22023'; END IF;
 PERFORM edupulse_private.refresh_imported_enrollments();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'import',filename,kind||': '||created||' new, '||updated||' updated');
 RETURN jsonb_build_object('created',created,'updated',updated,'shared',true);
END $$;
REVOKE ALL ON FUNCTION public.edupulse_import_records(text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_import_records(text,jsonb,text) TO authenticated;

CREATE FUNCTION edupulse_private.source_urls(refs jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(url),'[]') FROM (
  SELECT CASE jsonb_typeof(value) WHEN 'object' THEN value->>'url' WHEN 'string' THEN value#>>'{}' ELSE NULL END url
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(refs)='array' THEN refs ELSE '[]'::jsonb END)
 ) sources WHERE url ~* '^https?://'
$$;
REVOKE ALL ON FUNCTION edupulse_private.source_urls(jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION edupulse_private.restore_metadata() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s jsonb; item record; cid text; p public.edupulse_publications; row jsonb; old_row jsonb; topic text;
BEGIN
 IF coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RETURN NEW; END IF;
 FOR s IN SELECT value FROM jsonb_array_elements(NEW.data->'syllabi') WHERE coalesce(value->>'sample','false')<>'true' LOOP
  cid:=md5(NEW.owner_id::text||':'||(s->>'id'));
  UPDATE public.edupulse_courses SET syllabus_status=s->>'status',outline=coalesce(s->'courseOutline','[]'),instructor_name=coalesce((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id=NEW.owner_id),''),source_links=edupulse_private.source_urls(s->'onlineReferences'),delivery=(SELECT coalesce(jsonb_object_agg(state,n),'{}') FROM (SELECT value->>'status' state,count(*) n FROM jsonb_each(NEW.data->'content') WHERE value->>'syllabusId'=s->>'id' AND value->>'status' IS NOT NULL GROUP BY value->>'status') counts) WHERE id=cid;
 END LOOP;
 FOR item IN SELECT key,value FROM jsonb_each(NEW.data->'content') WHERE value->>'status'='published' LOOP
  SELECT * INTO p FROM public.edupulse_publications WHERE id=md5(NEW.owner_id::text||':'||item.key);
  IF p.id IS NULL OR NOT p.active THEN CONTINUE; END IF;
  IF p.type='assessment' AND p.content ? 'assessmentPolicy' THEN
   IF jsonb_typeof(p.content->'assessmentPolicy'->'maxAttempts') IS DISTINCT FROM 'number' OR (p.content->'assessmentPolicy'->>'maxAttempts')::numeric NOT IN (1,2,3) OR jsonb_typeof(p.content->'assessmentPolicy'->'durationSeconds') IS DISTINCT FROM 'number' OR (p.content->'assessmentPolicy'->>'durationSeconds')::numeric NOT BETWEEN 0 AND 7200 OR (p.content->'assessmentPolicy'->>'durationSeconds')::numeric<>trunc((p.content->'assessmentPolicy'->>'durationSeconds')::numeric) THEN RAISE EXCEPTION 'Invalid assessment duration or attempt limit' USING ERRCODE='22023'; END IF;
  END IF;
  UPDATE public.edupulse_publications SET release_at=nullif(item.value->>'releaseAt','')::timestamptz,due_at=nullif(item.value->>'dueAt','')::timestamptz WHERE id=p.id;
  SELECT value INTO row FROM jsonb_array_elements((SELECT outline FROM public.edupulse_courses WHERE id=p.course_id)) WHERE (value->>'week')::int=p.week;
  IF TG_OP='UPDATE' AND OLD.data->'content'->item.key->>'status'='published' THEN
   SELECT x INTO old_row FROM jsonb_array_elements(OLD.data->'syllabi') a CROSS JOIN LATERAL jsonb_array_elements(coalesce(a->'courseOutline','[]')) x WHERE a->>'id'=item.value->>'syllabusId' AND x->>'week'=p.week::text;
   IF old_row IS DISTINCT FROM row THEN UPDATE public.edupulse_publications SET active=false WHERE id=p.id; END IF;
  END IF;
  FOR topic IN SELECT value->>'topic' FROM jsonb_array_elements(coalesce(p.content->'questions','[]')) WHERE length(coalesce(value->>'topic',''))>0 LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(row->'contents','[]')) t WHERE t=topic) THEN RAISE EXCEPTION 'Assessment topic must match the approved outline week' USING ERRCODE='22023'; END IF;
  END LOOP;
 END LOOP;
 PERFORM edupulse_private.refresh_imported_enrollments();
 IF TG_OP='UPDATE' AND OLD.data IS DISTINCT FROM NEW.data THEN INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(NEW.owner_id,'workspace','Academic workspace updated','Revision '||NEW.revision); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.restore_metadata() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_edupulse_restore_metadata AFTER INSERT OR UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.restore_metadata();

DROP POLICY publication_read ON public.edupulse_publications;
CREATE POLICY publication_read ON public.edupulse_publications FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean') OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND active AND (release_at IS NULL OR release_at<=now()) AND EXISTS(SELECT 1 FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id WHERE e.course_id=edupulse_publications.course_id AND c.active AND e.student_email=lower((SELECT auth.jwt()->>'email'))))
);

CREATE FUNCTION public.edupulse_notice_action(operation text, ids uuid[] DEFAULT '{}', publication text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; total integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF operation='read' THEN UPDATE public.edupulse_notices SET read_at=now() WHERE recipient_id=auth.uid() AND id=ANY(ids); RETURN jsonb_build_object('saved',true); END IF;
 IF operation<>'remind' OR coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RAISE EXCEPTION 'Instructor required' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication AND instructor_id=auth.uid() AND active AND (release_at IS NULL OR release_at<=now());
 IF p.id IS NULL THEN RAISE EXCEPTION 'Owned published material required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-reminder:'||p.id));
 INSERT INTO public.edupulse_notices(recipient_id,actor_id,publication_id,kind,title,detail,path)
 SELECT DISTINCT u.id,auth.uid(),p.id,'reminder','Reminder: '||p.title,'Your instructor asks you to '||CASE p.type WHEN 'assessment' THEN 'complete this assessment.' ELSE 'open this learning material.' END,CASE p.type WHEN 'assessment' THEN '/assessment' ELSE '/courseware' END
 FROM public.edupulse_enrollments e JOIN auth.users u ON lower(u.email)=e.student_email AND u.raw_app_meta_data->>'role'='student'
 WHERE e.course_id=p.course_id AND NOT EXISTS(SELECT 1 FROM public.edupulse_notices n WHERE n.recipient_id=u.id AND n.publication_id=p.id AND n.actor_id=auth.uid() AND n.kind='reminder' AND n.created_at>now()-interval '1 day')
 AND CASE WHEN p.type='assessment' THEN NOT EXISTS(SELECT 1 FROM public.edupulse_attempts a WHERE a.publication_id=p.id AND a.student_id=u.id AND a.source_version=p.source_version) ELSE NOT EXISTS(SELECT 1 FROM public.edupulse_material_access a WHERE a.publication_id=p.id AND a.student_id=u.id) END;
 GET DIAGNOSTICS total=ROW_COUNT;
 RETURN jsonb_build_object('sent',total);
END $$;
REVOKE ALL ON FUNCTION public.edupulse_notice_action(text,uuid[],text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_notice_action(text,uuid[],text) TO authenticated;

CREATE OR REPLACE FUNCTION edupulse_private.project_workspace() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s jsonb; r jsonb; student jsonb; item record; question jsonb; cid text; pid text; public_content jsonb; keys jsonb; previous jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
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
  IF cid IS NULL THEN
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.data->'syllabi') a WHERE a->>'id'=item.value->>'syllabusId' AND a->>'status'='archived') THEN CONTINUE; END IF;
   RAISE EXCEPTION 'An active approved syllabus is required to publish' USING ERRCODE='22023';
  END IF;
  previous := CASE WHEN TG_OP='UPDATE' THEN OLD.data->'content'->item.key ELSE NULL END;
  IF previous IS NULL OR previous->>'status' NOT IN ('checked','published') OR previous->'content' IS DISTINCT FROM item.value->'content' OR previous->>'type' IS DISTINCT FROM item.value->>'type' OR previous->>'week' IS DISTINCT FROM item.value->>'week' OR previous->>'syllabusId' IS DISTINCT FROM item.value->>'syllabusId' THEN
   RAISE EXCEPTION 'Save and review a checked draft before publication' USING ERRCODE='22023';
  END IF;
  public_content := item.value->'content'; keys := '[]';
  IF item.value->>'type'='assessment' THEN
   IF jsonb_typeof(public_content->'questions') IS DISTINCT FROM 'array' OR jsonb_array_length(public_content->'questions') NOT BETWEEN 3 AND 5 THEN RAISE EXCEPTION 'Invalid reviewed assessment' USING ERRCODE='22023'; END IF;
   FOR question IN SELECT value FROM jsonb_array_elements(public_content->'questions') LOOP
    IF question->>'type'='short_answer' THEN keys := keys || '[null]'::jsonb; CONTINUE; END IF;
    IF coalesce(question->>'type','multiple_choice') NOT IN ('multiple_choice','true_false') OR jsonb_typeof(question->'correctIndex') IS DISTINCT FROM 'number' OR (question->>'correctIndex')::numeric<>trunc((question->>'correctIndex')::numeric) OR (question->>'correctIndex')::int NOT BETWEEN 0 AND (CASE WHEN question->>'type'='true_false' THEN 1 ELSE 3 END) OR jsonb_typeof(question->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(question->'options')<>(CASE WHEN question->>'type'='true_false' THEN 2 ELSE 4 END) THEN RAISE EXCEPTION 'Invalid assessment key' USING ERRCODE='22023'; END IF;
    IF question->>'type'='true_false' AND question->'options' IS DISTINCT FROM '["True","False"]'::jsonb THEN RAISE EXCEPTION 'True/false options must remain fixed' USING ERRCODE='22023'; END IF;
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

-- Populate new read-model fields from existing owner snapshots without changing
-- workspace revisions, approval attachments, marks or publication visibility.
UPDATE public.edupulse_courses c SET
 syllabus_status=s.value->>'status',outline=coalesce(s.value->'courseOutline','[]'),
 instructor_name=coalesce(u.raw_user_meta_data->>'full_name',''),
 source_links=edupulse_private.source_urls(s.value->'onlineReferences'),
 delivery=(SELECT coalesce(jsonb_object_agg(state,n),'{}') FROM (
  SELECT value->>'status' state,count(*) n FROM jsonb_each(coalesce(w.data->'content','{}'))
  WHERE value->>'syllabusId'=s.value->>'id' AND value->>'status' IS NOT NULL GROUP BY value->>'status'
 ) counts)
FROM public.edupulse_workspaces w JOIN auth.users u ON u.id=w.owner_id
CROSS JOIN LATERAL jsonb_array_elements(w.data->'syllabi') s
WHERE c.id=md5(w.owner_id::text||':'||(s.value->>'id'));
SELECT edupulse_private.refresh_imported_enrollments();
