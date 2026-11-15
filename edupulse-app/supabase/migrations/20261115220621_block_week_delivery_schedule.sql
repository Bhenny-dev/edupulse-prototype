ALTER TABLE public.edupulse_publications ADD COLUMN delivery_mode text NOT NULL DEFAULT 'legacy' CHECK(delivery_mode IN ('legacy','block_schedule'));
-- Explicit block/week delivery windows. Existing publications keep their saved delivery mode.
CREATE TABLE public.edupulse_delivery_schedules (
 course_id text NOT NULL REFERENCES public.edupulse_courses(id),
 instructor_id uuid NOT NULL REFERENCES auth.users(id), syllabus_id text NOT NULL,
 block_section text NOT NULL CHECK(length(block_section) BETWEEN 1 AND 80),
 revision bigint NOT NULL CHECK(revision>0), windows jsonb NOT NULL CHECK(jsonb_typeof(windows)='array' AND jsonb_array_length(windows) BETWEEN 1 AND 52),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(course_id,block_section)
);
CREATE INDEX edupulse_delivery_schedule_instructor ON public.edupulse_delivery_schedules(instructor_id);
ALTER TABLE public.edupulse_delivery_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_delivery_schedules FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.edupulse_delivery_schedules TO authenticated;
CREATE POLICY delivery_schedule_read ON public.edupulse_delivery_schedules FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean') OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND EXISTS(SELECT 1 FROM public.edupulse_enrollments e 
  WHERE e.course_id=edupulse_delivery_schedules.course_id AND e.block_section=edupulse_delivery_schedules.block_section AND e.student_email=lower((SELECT auth.jwt()->>'email')) AND NOT e.suspended))
);

CREATE FUNCTION public.edupulse_delivery_schedule(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE source jsonb; cid text; prior public.edupulse_delivery_schedules; item jsonb; normalized jsonb:='[]';
 weeks jsonb; requested jsonb; opening timestamptz; closing timestamptz; day date; start_time time; end_time time; saved public.edupulse_delivery_schedules;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RAISE EXCEPTION 'Only the assigned instructor can schedule a class.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(command->'windows') IS DISTINCT FROM 'array' OR jsonb_array_length(command->'windows') NOT BETWEEN 1 AND 52 OR length(coalesce(command->>'block','')) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Provide the block and its weekly opening dates.' USING ERRCODE='22023'; END IF;
 SELECT s,c.id INTO source,cid FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(w.data->'syllabi') s
 JOIN public.edupulse_courses c ON c.instructor_id=w.owner_id AND c.syllabus_id=s->>'id'
 WHERE w.owner_id=auth.uid() AND s->>'id'=command->>'syllabus' AND coalesce(s->>'suspended','false')<>'true' AND s->>'status'<>'archived' FOR SHARE OF w;
 IF source IS NULL OR NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records l WHERE l.kind='loads' AND l.data->>'InstructorID'=auth.uid()::text
  AND upper(regexp_replace(l.data->>'CourseCode','[[:space:]]','','g'))=upper(regexp_replace(source->>'courseCode','[[:space:]]','','g'))
  AND l.data->>'Block'=command->>'block' AND coalesce(l.data->>'Status','') !~* '^(inactive|suspended|withdrawn|deleted)$'
  AND (coalesce(source->'courseInfo'->>'academicYear','')='' OR coalesce(l.data->>'AcademicYear','')='' OR l.data->>'AcademicYear'=source->'courseInfo'->>'academicYear')
  AND (coalesce(source->'courseInfo'->>'periodOffered','')='' OR coalesce(l.data->>'Semester','')='' OR
   CASE WHEN l.data->>'Semester' ~* '(1|first)' THEN '1' WHEN l.data->>'Semester' ~* '(2|second)' THEN '2' ELSE lower(l.data->>'Semester') END =
   CASE WHEN source->'courseInfo'->>'periodOffered' ~* '(1|first)' THEN '1' WHEN source->'courseInfo'->>'periodOffered' ~* '(2|second)' THEN '2' ELSE lower(source->'courseInfo'->>'periodOffered') END)) THEN
  RAISE EXCEPTION 'This syllabus and block are not in your current course load.' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_agg((r->>'week')::int ORDER BY (r->>'week')::int) INTO weeks FROM jsonb_array_elements(source->'courseOutline') r;
 SELECT jsonb_agg((r->>'week')::int ORDER BY (r->>'week')::int) INTO requested FROM jsonb_array_elements(command->'windows') r;
 IF weeks IS NULL OR weeks IS DISTINCT FROM requested THEN RAISE EXCEPTION 'The extracted weeks changed. Reopen Block sections and review the dates.' USING ERRCODE='40001'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(command->'windows') LOOP
  BEGIN
   IF coalesce(item->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' OR coalesce(item->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid date or opening time'; END IF;
   day:=(item->>'date')::date; start_time:=(item->>'start')::time;
   IF coalesce(item->>'end','')<>'' AND item->>'end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid closing time'; END IF;
   end_time:=nullif(item->>'end','')::time;
   IF end_time IS NOT NULL AND end_time<=start_time THEN RAISE EXCEPTION 'Closing time must follow opening time on the same day'; END IF;
   opening:=(day+start_time) AT TIME ZONE 'Asia/Manila'; closing:=CASE WHEN end_time IS NULL THEN NULL ELSE (day+end_time) AT TIME ZONE 'Asia/Manila' END;
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Each week needs a valid date and class start time. An optional close must follow the start on the same day.' USING ERRCODE='22023'; END;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('week',(item->>'week')::int,'opens_at',opening,'closes_at',closing));
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtext('delivery:'||cid||':'||(command->>'block')));
 SELECT * INTO prior FROM public.edupulse_delivery_schedules WHERE course_id=cid AND block_section=command->>'block' FOR UPDATE;
 IF coalesce((command->>'revision')::bigint,-1)<>coalesce(prior.revision,0) THEN RAISE EXCEPTION 'This block schedule changed. Reopen it before saving.' USING ERRCODE='40001'; END IF;
 INSERT INTO public.edupulse_delivery_schedules(course_id,instructor_id,syllabus_id,block_section,revision,windows)
 VALUES(cid,auth.uid(),source->>'id',command->>'block',coalesce(prior.revision,0)+1,normalized)
 ON CONFLICT(course_id,block_section) DO UPDATE SET revision=excluded.revision,windows=excluded.windows,updated_at=clock_timestamp()
 RETURNING * INTO saved;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'delivery','Block delivery schedule saved',(source->>'courseCode')||' · '||(command->>'block'));
 RETURN to_jsonb(saved);
END $$;
REVOKE ALL ON FUNCTION public.edupulse_delivery_schedule(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_delivery_schedule(jsonb) TO authenticated;

-- A student can have a block or an irregular membership. Any currently enrolled matching delivery_window may authorize access.
CREATE FUNCTION edupulse_private.student_delivery_window(course text, teaching_week integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('opens_at',w->>'opens_at','closes_at',w->>'closes_at')
 FROM public.edupulse_delivery_schedules s CROSS JOIN LATERAL jsonb_array_elements(s.windows) w
 WHERE s.course_id=course AND (w->>'week')::int=teaching_week AND edupulse_private.academic_role()='student'
 AND EXISTS(SELECT 1 FROM public.edupulse_enrollments e JOIN auth.users u ON u.id=auth.uid()
  WHERE e.course_id=course AND e.block_section=s.block_section AND e.student_email=lower(u.email) AND NOT e.suspended)
 ORDER BY ((w->>'opens_at')::timestamptz<=now() AND (w->>'closes_at' IS NULL OR (w->>'closes_at')::timestamptz>now())) DESC,
  CASE WHEN (w->>'opens_at')::timestamptz>now() THEN (w->>'opens_at')::timestamptz END ASC NULLS LAST,(w->>'opens_at')::timestamptz DESC LIMIT 1
$$;
CREATE FUNCTION edupulse_private.publication_window_open(publication text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; delivery_window jsonb;
BEGIN
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication;
 IF p.id IS NULL THEN RETURN false; END IF;
 IF coalesce(p.delivery_mode,'')<>'block_schedule' THEN RETURN true; END IF;
 delivery_window:=edupulse_private.student_delivery_window(p.course_id,p.week);
 RETURN delivery_window IS NOT NULL AND (delivery_window->>'opens_at')::timestamptz<=now() AND (delivery_window->>'closes_at' IS NULL OR (delivery_window->>'closes_at')::timestamptz>now());
END $$;
REVOKE ALL ON FUNCTION edupulse_private.student_delivery_window(text,integer),edupulse_private.publication_window_open(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.student_delivery_window(text,integer),edupulse_private.publication_window_open(text) TO authenticated;
DROP POLICY publication_read ON public.edupulse_publications;
CREATE POLICY publication_read ON public.edupulse_publications FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean') OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role())='student' AND active AND (release_at IS NULL OR release_at<=now()) AND edupulse_private.has_active_enrollment(course_id)
  AND EXISTS(SELECT 1 FROM public.edupulse_courses c WHERE c.id=course_id AND c.active) AND edupulse_private.publication_window_open(id)));

-- Keep titles and scored history visible without exposing material text or assessment questions outside the class delivery_window.
CREATE FUNCTION public.edupulse_student_publications(publication text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; result jsonb:='[]'; dto jsonb; delivery_window jsonb; state text; permitted boolean;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.academic_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Student account required' USING ERRCODE='42501'; END IF;
 FOR p IN SELECT * FROM public.edupulse_publications q WHERE q.active AND (publication IS NULL OR q.id=publication)
  AND (q.release_at IS NULL OR q.release_at<=now()) AND edupulse_private.has_active_enrollment(q.course_id)
  AND EXISTS(SELECT 1 FROM public.edupulse_courses c WHERE c.id=q.course_id AND c.active) ORDER BY q.id LOOP
  IF jsonb_array_length(result)>=5000 THEN RAISE EXCEPTION 'The publication list exceeds this view capacity.' USING ERRCODE='54000'; END IF;
  permitted:=true; dto:=to_jsonb(p);
  IF p.delivery_mode='block_schedule' THEN
   delivery_window:=edupulse_private.student_delivery_window(p.course_id,p.week);
   state:=CASE WHEN delivery_window IS NULL THEN 'unconfigured' WHEN (delivery_window->>'opens_at')::timestamptz>now() THEN 'scheduled' WHEN delivery_window->>'closes_at' IS NOT NULL AND (delivery_window->>'closes_at')::timestamptz<=now() THEN 'closed' ELSE 'open' END;
   permitted:=state='open';
   dto:=dto||jsonb_build_object('delivery_mode','block_schedule','delivery_state',state,'delivery_open_at',delivery_window->>'opens_at','delivery_close_at',delivery_window->>'closes_at');
  END IF;
  result:=result||jsonb_build_array(CASE WHEN permitted THEN dto ELSE (dto-'content')||jsonb_build_object('content',NULL) END);
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.edupulse_student_publications(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_student_publications(text) TO authenticated;

-- Definer business functions need the same time check as direct publication/file reads.
DO $$ DECLARE definition text; target text; guard text; BEGIN
 FOREACH target IN ARRAY ARRAY['public.edupulse_academic_action(text,text,jsonb,text)','public.edupulse_assessment_command(jsonb)','edupulse_private.read_material_section(text,text,integer)'] LOOP
  definition:=pg_get_functiondef(target::regprocedure);
  guard:=CASE WHEN target LIKE '%assessment_command%' THEN $g$IF edupulse_private.academic_role()='student' AND command->>'operation' IN ('start','submit') AND NOT edupulse_private.publication_window_open(command->>'publication') THEN RAISE EXCEPTION 'This block class is not open for this assessment.' USING ERRCODE='42501'; END IF;$g$
   ELSE $g$IF edupulse_private.academic_role()='student' AND NOT edupulse_private.publication_window_open(publication) THEN RAISE EXCEPTION 'This block class is not open for this material.' USING ERRCODE='42501'; END IF;$g$ END;
  definition:=regexp_replace(definition,'BEGIN','BEGIN '||guard);
  IF strpos(definition,'publication_window_open')=0 THEN RAISE EXCEPTION 'Delivery action patch unavailable'; END IF;
  EXECUTE definition;
 END LOOP;
 -- Support mode adopts the verified instructor/student, preserving actor attribution and ordinary RLS.
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'WHEN ''sync'' THEN', 'WHEN ''delivery-schedule'' THEN result:=public.edupulse_delivery_schedule(input); WHEN ''read-publication'' THEN result:=public.edupulse_student_publications(input->>''publication''); WHEN ''sync'' THEN');
 definition:=replace(definition,'''courses'',(SELECT', '''deliverySchedules'',(SELECT coalesce(jsonb_agg(to_jsonb(s)),''[]'') FROM public.edupulse_delivery_schedules s),''courses'',(SELECT');
 definition:=replace(definition,'''publications'',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),''[]'') FROM public.edupulse_publications t)', '''publications'',CASE WHEN subject_role=''student'' THEN public.edupulse_student_publications() ELSE (SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),''[]'') FROM public.edupulse_publications t) END');
 -- Read-only publication lookup is allowed in a student support view, without learner demonstration writes.
 definition:=replace(definition,'''operation''<>''read''','''operation'' NOT IN (''read'',''read-publication'')');
 IF strpos(definition,'public.edupulse_delivery_schedule(input)')=0 OR strpos(definition,'''deliverySchedules''')=0 OR strpos(definition,'THEN public.edupulse_student_publications()')=0 THEN RAISE EXCEPTION 'Support delivery patch unavailable'; END IF;
 EXECUTE definition;
END $$;

CREATE FUNCTION edupulse_private.require_block_delivery_schedule() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item record; prior jsonb; source jsonb; cid text;
BEGIN
 FOR item IN SELECT * FROM jsonb_each(coalesce(NEW.data->'content','{}')) LOOP
  prior:=CASE WHEN TG_OP='UPDATE' THEN OLD.data->'content'->item.key ELSE NULL END;
  IF item.value->>'status' IS DISTINCT FROM 'published' OR item.value IS NOT DISTINCT FROM prior THEN CONTINUE; END IF;
  IF item.value->>'deliveryMode' IS DISTINCT FROM 'block_schedule' THEN RAISE EXCEPTION 'Use Weeks and topics and configure Block sections before delivering new or revised content.' USING ERRCODE='22023'; END IF;
  SELECT s INTO source FROM jsonb_array_elements(NEW.data->'syllabi') s WHERE s->>'id'=item.value->>'syllabusId';
  cid:=md5(NEW.owner_id::text||':'||(source->>'id'));
  IF NOT EXISTS(SELECT 1 FROM public.edupulse_delivery_schedules d CROSS JOIN LATERAL jsonb_array_elements(d.windows) w
   WHERE d.course_id=cid AND d.instructor_id=NEW.owner_id AND (w->>'week')::int=(item.value->>'week')::int
   AND EXISTS(SELECT 1 FROM public.edupulse_institutional_records l WHERE l.kind='loads' AND l.data->>'InstructorID'=NEW.owner_id::text AND l.data->>'Block'=d.block_section
    AND upper(regexp_replace(l.data->>'CourseCode','[[:space:]]','','g'))=upper(regexp_replace(source->>'courseCode','[[:space:]]','','g')) AND coalesce(l.data->>'Status','') !~* '^(inactive|suspended|withdrawn|deleted)$')) THEN
   RAISE EXCEPTION 'Save a block-section opening date and class start time for this week before delivery.' USING ERRCODE='22023';
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.require_block_delivery_schedule() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER require_block_delivery_schedule BEFORE INSERT OR UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.require_block_delivery_schedule();

-- Scheduling is publication metadata, outside the assessment-content version hash.
CREATE FUNCTION edupulse_private.project_block_delivery_mode() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item record;
BEGIN
 FOR item IN SELECT * FROM jsonb_each(coalesce(NEW.data->'content','{}')) LOOP
  UPDATE public.edupulse_publications SET delivery_mode=CASE WHEN item.value->>'deliveryMode'='block_schedule' THEN 'block_schedule' ELSE 'legacy' END
  WHERE instructor_id=NEW.owner_id AND workspace_item_id=item.key;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.project_block_delivery_mode() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_edupulse_block_delivery_mode AFTER INSERT OR UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.project_block_delivery_mode();

-- Creating a new self-practice set also requires currently available reading.
-- Already-created practice and its repeatable attempts keep their separate history.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.practice_action(jsonb)'::regprocedure);
 definition:=regexp_replace(definition,'BEGIN', $g$BEGIN IF input->>'operation'='create' AND NOT edupulse_private.publication_window_open(input->>'publication') THEN RAISE EXCEPTION 'Reading is not open for your block class.' USING ERRCODE='42501'; END IF;$g$);
 IF strpos(definition,'publication_window_open')=0 THEN RAISE EXCEPTION 'Practice delivery patch unavailable'; END IF;
 EXECUTE definition;
END $$;
