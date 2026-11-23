-- Classroom-style class codes and announcements (owner request, 23 November 2026).
-- A class is a block section of a course the Dean assigned. The instructor creates a code for it; a registered
-- student who enters the code is added to that block's class list through the instructor's own registration
-- path (register_instructor_class), exactly as the Dean's block.add does, so enrollment keeps one source.

CREATE TABLE edupulse_private.class_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK (code ~ '^[A-HJKMNP-Z2-9]{7}$'),
 load_key text NOT NULL,
 parent_key text NOT NULL,
 instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 course_code text NOT NULL, block text NOT NULL, academic_year text NOT NULL, semester text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 disabled_at timestamptz
);
CREATE UNIQUE INDEX class_codes_one_active ON edupulse_private.class_codes(load_key) WHERE disabled_at IS NULL;
ALTER TABLE edupulse_private.class_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.class_codes FROM PUBLIC,anon,authenticated;

-- Who joined with a code, for the instructor's class list. The class list itself stays in the workspace.
CREATE TABLE edupulse_private.class_joins (
 load_key text NOT NULL,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 code_id uuid NOT NULL REFERENCES edupulse_private.class_codes(id) ON DELETE CASCADE,
 instructor_id uuid NOT NULL,
 student_email text NOT NULL, student_number text NOT NULL,
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (load_key, student_id)
);
ALTER TABLE edupulse_private.class_joins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.class_joins FROM PUBLIC,anon,authenticated;

-- Announcements belong to the instructor's course in one term; a block narrows them, a week files them
-- under that week of Teaching Materials and Assessments. Attachments are links only.
CREATE TABLE edupulse_private.class_announcements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 course_code text NOT NULL, academic_year text NOT NULL, semester text NOT NULL,
 block text CHECK (block IS NULL OR length(block) BETWEEN 1 AND 40),
 week integer CHECK (week IS NULL OR week BETWEEN 1 AND 52),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
 body text NOT NULL DEFAULT '' CHECK (length(body)<=5000),
 attachments jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(attachments)='array' AND jsonb_array_length(attachments)<=10),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX class_announcements_course ON edupulse_private.class_announcements(instructor_id,course_code,academic_year,semester);
ALTER TABLE edupulse_private.class_announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.class_announcements FROM PUBLIC,anon,authenticated;

-- 7 characters without I, L, O, 0 or 1. Codes are never reused, so an old code cannot open a newer class.
CREATE FUNCTION edupulse_private.class_code_key(raw text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT upper(regexp_replace(coalesce(raw,''),'[^A-Za-z0-9]','','g'))
$$;
CREATE FUNCTION edupulse_private.new_class_code() RETURNS text LANGUAGE plpgsql VOLATILE SET search_path='' AS $$
DECLARE alphabet constant text:='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; bytes bytea; candidate text; tries integer:=0;
BEGIN
 LOOP
  tries:=tries+1;
  -- Bytes 6 and 8 of a version 4 UUID carry fixed version and variant bits; the others are random.
  bytes:=uuid_send(gen_random_uuid());
  SELECT string_agg(substr(alphabet,(get_byte(bytes,i)%31)+1,1),'' ORDER BY n) INTO candidate FROM unnest(ARRAY[0,1,2,3,4,5,10]) WITH ORDINALITY AS t(i,n);
  EXIT WHEN NOT EXISTS(SELECT 1 FROM edupulse_private.class_codes WHERE code=candidate);
  IF tries>=20 THEN RAISE EXCEPTION 'A class code could not be generated. Try again.' USING ERRCODE='40001';END IF;
 END LOOP;
 RETURN candidate;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.class_code_key(text),edupulse_private.new_class_code() FROM PUBLIC,anon,authenticated;

-- The instructor creates, replaces or turns off the code of one block section of a course assigned to them.
-- A block the load does not list yet is added to the course load, as the instructor's Add block section does.
CREATE FUNCTION edupulse_private.class_code_command(command jsonb) RETURNS jsonb
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
 END IF;
 IF current_code.id IS NOT NULL THEN UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE id=current_code.id;END IF;
 INSERT INTO edupulse_private.class_codes(code,load_key,parent_key,instructor_id,course_code,block,academic_year,semester)
  VALUES(edupulse_private.new_class_code(),k,parent.record_key,auth.uid(),code,wanted,y,sem) RETURNING * INTO created;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'enrollments',CASE WHEN current_code.id IS NULL THEN 'Class code created' ELSE 'Class code replaced' END,concat_ws(' · ',code,wanted,sem,y));
 RETURN jsonb_build_object('code',created.code,'load_key',k,'parent_key',parent.record_key,'block',wanted,'course_code',code,'academic_year',y,'semester',sem,'created_at',created.created_at,'created',true,'block_added',block_record.record_key IS NULL);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.class_code_command(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.class_code_command(jsonb) TO authenticated;

-- A student looks a code up (the class is named before anything changes) and joins. Joining adds only the
-- signed-in student's own directory record; a student already in another block of the course is refused
-- with the reason instead of being moved.
CREATE FUNCTION edupulse_private.class_join(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op text:=coalesce(command->>'action',''); wanted text:=edupulse_private.class_code_key(command->>'code'); actor uuid:=auth.uid();
 found edupulse_private.class_codes; block_record public.edupulse_institutional_records; person public.edupulse_students;
 teacher_email text; teacher_name text; listed jsonb; members integer; other text; saved_revision bigint; receipt jsonb; result jsonb; course text;
 claims text:=current_setting('request.jwt.claims',true); sub text:=current_setting('request.jwt.claim.sub',true); mail text:=current_setting('request.jwt.claim.email',true);
BEGIN
 IF actor IS NULL OR edupulse_private.academic_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Sign in with your student account to join a class.' USING ERRCODE='42501';END IF;
 IF op NOT IN ('lookup','join') THEN RAISE EXCEPTION 'Choose lookup or join.' USING ERRCODE='22023';END IF;
 IF wanted !~ '^[A-HJKMNP-Z2-9]{7}$' THEN RAISE EXCEPTION 'A class code has 7 letters or numbers. Check the code with your instructor.' USING ERRCODE='22023';END IF;
 IF op='join' THEN PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));END IF;
 SELECT * INTO found FROM edupulse_private.class_codes WHERE code=wanted;
 IF found.id IS NULL THEN RAISE EXCEPTION 'No class uses this code. Check it with your instructor.' USING ERRCODE='22023';END IF;
 IF found.disabled_at IS NOT NULL THEN RAISE EXCEPTION 'This class code was turned off or replaced. Ask your instructor for the current code.' USING ERRCODE='22023';END IF;
 SELECT * INTO block_record FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=found.load_key;
 IF block_record.record_key IS NULL OR block_record.data->>'InstructorID' IS DISTINCT FROM found.instructor_id::text THEN RAISE EXCEPTION 'This class is no longer handled by the instructor who shared the code. Ask your current instructor for a new code.' USING ERRCODE='22023';END IF;
 IF NOT edupulse_private.editable_course_term(found.academic_year,found.semester) THEN RAISE EXCEPTION 'This class belongs to a completed semester.' USING ERRCODE='22023';END IF;
 SELECT s.* INTO person FROM public.edupulse_students s JOIN auth.users u ON u.id=s.user_id
  WHERE s.user_id=actor AND s.active AND coalesce(u.raw_app_meta_data->>'suspended','false')<>'true' AND (u.banned_until IS NULL OR u.banned_until<now());
 IF person.user_id IS NULL THEN RAISE EXCEPTION 'Your student record is not in the College directory yet. Ask the Dean''s office to add it, then join again.' USING ERRCODE='22023';END IF;
 SELECT u.email,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email) INTO teacher_email,teacher_name FROM auth.users u
  WHERE u.id=found.instructor_id AND u.raw_app_meta_data->>'role'='instructor' AND coalesce(u.raw_app_meta_data->>'suspended','false')<>'true';
 IF teacher_email IS NULL THEN RAISE EXCEPTION 'The instructor account of this class is unavailable.' USING ERRCODE='22023';END IF;
 -- The instructor's class list is the record of who is in the class.
 SELECT r->'students' INTO listed FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'registrations','[]')) r
  WHERE w.owner_id=found.instructor_id AND r->>'courseCode'=found.course_code AND r->>'blockSection'=found.block AND r->>'status'='active'
   AND coalesce(r->>'academicYear','2026-2027')=found.academic_year AND edupulse_private.canonical_semester(coalesce(r->>'semester','1st Semester'))=found.semester LIMIT 1;
 members:=coalesce(jsonb_array_length(listed),0);
 SELECT c.id INTO course FROM public.edupulse_courses c WHERE c.instructor_id=found.instructor_id AND c.course_code=found.course_code AND c.active
  AND (c.academic_year='' OR c.academic_year=found.academic_year) AND (c.semester='' OR edupulse_private.canonical_semester(c.semester)=found.semester) ORDER BY c.updated_at DESC LIMIT 1;
 result:=jsonb_build_object('code',found.code,'course_code',found.course_code,'course_title',coalesce(nullif(block_record.data->>'CourseTitle',''),found.course_code),'block',found.block,
  'academic_year',found.academic_year,'semester',found.semester,'instructor_name',teacher_name,'students',members,'course_open',course IS NOT NULL,'course_id',course);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(listed,'[]')) s WHERE s->>'StudentID'=person.student_number OR lower(s->>'Email')=person.email) THEN RETURN result||jsonb_build_object('status','member');END IF;
 SELECT r->>'blockSection' INTO other FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'registrations','[]')) r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r->'students','[]')) s
  WHERE r->>'courseCode'=found.course_code AND r->>'status'='active' AND r->>'blockSection'<>found.block
   AND coalesce(r->>'academicYear','2026-2027')=found.academic_year AND edupulse_private.canonical_semester(coalesce(r->>'semester','1st Semester'))=found.semester
   AND (s->>'StudentID'=person.student_number OR lower(s->>'Email')=person.email) LIMIT 1;
 IF other IS NOT NULL THEN
  IF op='lookup' THEN RETURN result||jsonb_build_object('status','other_block','other_block',other);END IF;
  RAISE EXCEPTION 'You are already in % block % this semester. Ask your instructor to move you instead of joining another block.',found.course_code,other USING ERRCODE='22023';
 END IF;
 IF members>=35 THEN
  IF op='lookup' THEN RETURN result||jsonb_build_object('status','full');END IF;
  RAISE EXCEPTION 'This class already has 35 students. Ask your instructor.' USING ERRCODE='22023';
 END IF;
 IF op='lookup' THEN RETURN result||jsonb_build_object('status','joinable');END IF;
 -- Register exactly as the assigned instructor confirms a class list; the student's identity is restored after.
 SELECT w.revision INTO saved_revision FROM public.edupulse_workspaces w WHERE w.owner_id=found.instructor_id FOR UPDATE;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',found.instructor_id,'email',teacher_email,'role','authenticated','app_metadata',jsonb_build_object('role','instructor'))::text,true);
 PERFORM set_config('request.jwt.claim.sub',found.instructor_id::text,true);
 PERFORM set_config('request.jwt.claim.email',teacher_email,true);
 receipt:=edupulse_private.register_instructor_class(jsonb_build_object('assignment',found.parent_key,'block',found.block,'mode','append','students',jsonb_build_array(jsonb_build_object('StudentID',person.student_number)),'revision',coalesce(saved_revision,0),'filename','Joined with class code'));
 PERFORM set_config('request.jwt.claims',coalesce(claims,'{}'),true);
 PERFORM set_config('request.jwt.claim.sub',coalesce(sub,''),true);
 PERFORM set_config('request.jwt.claim.email',coalesce(mail,''),true);
 -- The registration logged a confirmation under the instructor; the event names the student who joined instead.
 DELETE FROM public.edupulse_academic_events WHERE actor_id=found.instructor_id AND title='Class list confirmed' AND created_at=now() AND detail=concat_ws(' · ',found.course_code,found.block,found.semester,found.academic_year);
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(actor,'enrollments','Joined a class with its code',concat_ws(' · ',found.course_code,found.block,found.semester,found.academic_year));
 INSERT INTO edupulse_private.class_joins(load_key,student_id,code_id,instructor_id,student_email,student_number) VALUES(found.load_key,actor,found.id,found.instructor_id,person.email,person.student_number)
  ON CONFLICT(load_key,student_id) DO UPDATE SET code_id=excluded.code_id,joined_at=now();
 SELECT c.id INTO course FROM public.edupulse_enrollments e JOIN public.edupulse_courses c ON c.id=e.course_id
  WHERE e.student_email=person.email AND e.block_section=found.block AND c.instructor_id=found.instructor_id AND c.course_code=found.course_code AND c.active LIMIT 1;
 RETURN result||jsonb_build_object('status','joined','students',coalesce((receipt->>'students')::integer,members+1),'course_open',course IS NOT NULL,'course_id',course);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.class_join(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.class_join(jsonb) TO authenticated;

-- The instructor reads the active codes of their blocks and who joined with them. A student reads the classes
-- they joined that still list them, so a class waiting for its syllabus is visible on their Home.
CREATE FUNCTION edupulse_private.class_codes_read() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE role text:=edupulse_private.academic_role(); result jsonb:=jsonb_build_object('codes','[]'::jsonb,'joins','[]'::jsonb);
BEGIN
 IF auth.uid() IS NULL THEN RETURN result;END IF;
 IF role='instructor' THEN
  SELECT jsonb_build_object(
   'codes',(SELECT coalesce(jsonb_agg(jsonb_build_object('code',c.code,'load_key',c.load_key,'parent_key',c.parent_key,'course_code',c.course_code,'block',c.block,'academic_year',c.academic_year,'semester',c.semester,'created_at',c.created_at) ORDER BY c.course_code,c.block),'[]')
    FROM edupulse_private.class_codes c JOIN public.edupulse_institutional_records r ON r.kind='loads' AND r.record_key=c.load_key AND r.data->>'InstructorID'=auth.uid()::text
    WHERE c.instructor_id=auth.uid() AND c.disabled_at IS NULL),
   'joins',(SELECT coalesce(jsonb_agg(jsonb_build_object('load_key',j.load_key,'student_email',j.student_email,'student_number',j.student_number,'joined_at',j.joined_at) ORDER BY j.joined_at DESC),'[]')
    FROM edupulse_private.class_joins j WHERE j.instructor_id=auth.uid())) INTO result;
 ELSIF role='student' THEN
  SELECT jsonb_build_object('codes','[]'::jsonb,'joins',coalesce(jsonb_agg(jsonb_build_object('load_key',j.load_key,'course_code',c.course_code,'course_title',coalesce(nullif(r.data->>'CourseTitle',''),c.course_code),
    'block',c.block,'academic_year',c.academic_year,'semester',c.semester,'instructor_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email),'joined_at',j.joined_at) ORDER BY j.joined_at DESC),'[]')) INTO result
  FROM edupulse_private.class_joins j JOIN edupulse_private.class_codes c ON c.id=j.code_id
  JOIN public.edupulse_institutional_records r ON r.kind='loads' AND r.record_key=j.load_key AND r.data->>'InstructorID'=j.instructor_id::text
  LEFT JOIN auth.users u ON u.id=j.instructor_id
  WHERE j.student_id=auth.uid() AND EXISTS(SELECT 1 FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'registrations','[]')) g CROSS JOIN LATERAL jsonb_array_elements(coalesce(g->'students','[]')) s
   WHERE w.owner_id=j.instructor_id AND g->>'courseCode'=c.course_code AND g->>'blockSection'=c.block AND g->>'status'='active'
    AND coalesce(g->>'academicYear','2026-2027')=c.academic_year AND edupulse_private.canonical_semester(coalesce(g->>'semester','1st Semester'))=c.semester
    AND (s->>'StudentID'=j.student_number OR lower(s->>'Email')=j.student_email));
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.class_codes_read() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.class_codes_read() TO authenticated;

CREATE FUNCTION edupulse_private.announcement_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op text:=coalesce(command->>'action',''); code text; y text; sem text; wanted text; heading text; message text; week_no integer; link jsonb; links jsonb:='[]'; saved edupulse_private.class_announcements;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.academic_role() IS DISTINCT FROM 'instructor' THEN RAISE EXCEPTION 'Only the assigned instructor posts class announcements.' USING ERRCODE='42501';END IF;
 IF op NOT IN ('save','delete') THEN RAISE EXCEPTION 'Choose save or delete.' USING ERRCODE='22023';END IF;
 IF nullif(command->>'id','') IS NOT NULL AND command->>'id' !~ '^[0-9a-fA-F-]{36}$' THEN RAISE EXCEPTION 'Reopen the class and choose the announcement again.' USING ERRCODE='22023';END IF;
 IF op='delete' THEN
  DELETE FROM edupulse_private.class_announcements WHERE id=(command->>'id')::uuid AND instructor_id=auth.uid() RETURNING * INTO saved;
  IF saved.id IS NULL THEN RAISE EXCEPTION 'This announcement was already removed.' USING ERRCODE='22023';END IF;
  RETURN jsonb_build_object('id',saved.id,'deleted',true);
 END IF;
 code:=btrim(coalesce(command->>'course_code',''));y:=btrim(coalesce(command->>'academic_year',''));sem:=edupulse_private.canonical_semester(command->>'semester');
 IF NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.data->>'InstructorID'=auth.uid()::text AND r.data->>'CourseCode'=code AND r.data->>'AcademicYear'=y AND edupulse_private.canonical_semester(r.data->>'Semester')=sem) THEN
  RAISE EXCEPTION 'Post announcements only in a course assigned to you.' USING ERRCODE='42501';
 END IF;
 IF NOT edupulse_private.editable_course_term(y,sem) THEN RAISE EXCEPTION 'Completed semesters are view-only.' USING ERRCODE='42501';END IF;
 wanted:=nullif(edupulse_private.dean_block(nullif(btrim(coalesce(command->>'block','')),'')),'');
 IF wanted IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key=concat_ws('|',code,wanted,sem,y) AND r.data->>'InstructorID'=auth.uid()::text) THEN
  RAISE EXCEPTION 'Choose one of your block sections of this course.' USING ERRCODE='22023';
 END IF;
 heading:=btrim(coalesce(command->>'title',''));message:=btrim(coalesce(command->>'body',''));
 IF length(heading) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Give the announcement a title of up to 200 characters.' USING ERRCODE='22023';END IF;
 IF length(message)>5000 THEN RAISE EXCEPTION 'Keep the announcement under 5,000 characters.' USING ERRCODE='22023';END IF;
 IF nullif(command->>'week','') IS NOT NULL THEN
  IF command->>'week' !~ '^[0-9]{1,2}$' OR (command->>'week')::integer NOT BETWEEN 1 AND 52 THEN RAISE EXCEPTION 'Choose a week between 1 and 52.' USING ERRCODE='22023';END IF;
  week_no:=(command->>'week')::integer;
 END IF;
 IF jsonb_typeof(coalesce(command->'attachments','[]'))<>'array' OR jsonb_array_length(coalesce(command->'attachments','[]'))>10 THEN RAISE EXCEPTION 'Attach up to 10 links.' USING ERRCODE='22023';END IF;
 FOR link IN SELECT value FROM jsonb_array_elements(coalesce(command->'attachments','[]')) LOOP
  IF coalesce(link->>'url','') !~* '^https?://[^[:space:]]{3,}$' OR length(link->>'url')>2000 THEN RAISE EXCEPTION 'Each attachment needs a complete http or https link.' USING ERRCODE='22023';END IF;
  links:=links||jsonb_build_array(jsonb_build_object('kind','link','url',link->>'url','title',left(coalesce(nullif(btrim(link->>'title'),''),link->>'url'),200),'provider',left(coalesce(nullif(link->>'provider',''),'link'),40)));
 END LOOP;
 IF nullif(command->>'id','') IS NULL THEN
  INSERT INTO edupulse_private.class_announcements(instructor_id,course_code,academic_year,semester,block,week,title,body,attachments)
   VALUES(auth.uid(),code,y,sem,wanted,week_no,heading,message,links) RETURNING * INTO saved;
 ELSE
  UPDATE edupulse_private.class_announcements SET block=wanted,week=week_no,title=heading,body=message,attachments=links,updated_at=clock_timestamp()
   WHERE id=(command->>'id')::uuid AND instructor_id=auth.uid() AND course_code=code AND academic_year=y AND semester=sem RETURNING * INTO saved;
  IF saved.id IS NULL THEN RAISE EXCEPTION 'This announcement changed or was removed. Reopen the class.' USING ERRCODE='40001';END IF;
 END IF;
 RETURN to_jsonb(saved)-'instructor_id';
END $$;
REVOKE ALL ON FUNCTION edupulse_private.announcement_command(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.announcement_command(jsonb) TO authenticated;

-- The instructor reads their own announcements; a student reads those of the classes they are enrolled in
-- (all blocks, or their own block), never while their membership is suspended.
CREATE FUNCTION edupulse_private.class_announcements_read() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; role text:=edupulse_private.academic_role();
BEGIN
 IF auth.uid() IS NULL THEN RETURN '[]'::jsonb;END IF;
 IF role='instructor' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(a)-'instructor_id' ORDER BY a.created_at DESC),'[]') INTO result FROM edupulse_private.class_announcements a WHERE a.instructor_id=auth.uid();
 ELSIF role='student' THEN
  SELECT coalesce(jsonb_agg(item ORDER BY item->>'created_at' DESC),'[]') INTO result FROM (
   SELECT DISTINCT ON (a.id) (to_jsonb(a)-'instructor_id')||jsonb_build_object('course_id',c.id) item
   FROM edupulse_private.class_announcements a
   JOIN public.edupulse_courses c ON c.instructor_id=a.instructor_id AND c.course_code=a.course_code AND c.active
    AND (c.academic_year='' OR c.academic_year=a.academic_year) AND (c.semester='' OR edupulse_private.canonical_semester(c.semester)=a.semester)
   JOIN public.edupulse_enrollments e ON e.course_id=c.id AND NOT e.suspended AND (a.block IS NULL OR e.block_section=a.block)
   JOIN auth.users u ON u.id=auth.uid() AND lower(u.email)=e.student_email
   ORDER BY a.id,c.updated_at DESC) visible;
 ELSE result:='[]'::jsonb;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.class_announcements_read() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.class_announcements_read() TO authenticated;

-- Teaching materials and assessments may now carry provider links ({kind:'link',url,title,provider}) beside
-- private files. A link has no stored file: the instructor handover copies file paths only, and the Dean's
-- course inspection shows the link instead of an empty file entry.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('edupulse_private.continue_load_teaching()'::regprocedure);
 body:=replace(body,$old$FOR path IN SELECT a->>'path' FROM jsonb_array_elements(coalesce(item.value->'content'->'attachments','[]')) a LOOP$old$,
  $new$FOR path IN SELECT a->>'path' FROM jsonb_array_elements(coalesce(item.value->'content'->'attachments','[]')) a WHERE nullif(a->>'path','') IS NOT NULL LOOP$new$);
 IF strpos(body,$s$a WHERE nullif(a->>'path','') IS NOT NULL LOOP$s$)=0 THEN RAISE EXCEPTION 'Link attachment handover patch unavailable';END IF;
 EXECUTE body;
 body:=pg_get_functiondef('edupulse_private.dean_inspect_load(text,text)'::regprocedure);
 body:=replace(body,$old$jsonb_agg(jsonb_build_object('path',a->>'path','name',a->>'name','mime',a->>'mime','size',a->'size'))$old$,
  $new$jsonb_agg(CASE WHEN a->>'kind'='link' THEN jsonb_build_object('kind','link','url',a->>'url','title',a->>'title','provider',a->>'provider') ELSE jsonb_build_object('path',a->>'path','name',a->>'name','mime',a->>'mime','size',a->'size') END)$new$);
 IF strpos(body,$s$WHEN a->>'kind'='link'$s$)=0 THEN RAISE EXCEPTION 'Dean inspection link patch unavailable';END IF;
 EXECUTE body;
END $$;

CREATE FUNCTION public.edupulse_class_code_command(command jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.class_code_command(command) $$;
CREATE FUNCTION public.edupulse_class_join(command jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.class_join(command) $$;
CREATE FUNCTION public.edupulse_class_codes() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.class_codes_read() $$;
CREATE FUNCTION public.edupulse_announcement_command(command jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.announcement_command(command) $$;
CREATE FUNCTION public.edupulse_class_announcements() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.class_announcements_read() $$;
REVOKE ALL ON FUNCTION public.edupulse_class_code_command(jsonb),public.edupulse_class_join(jsonb),public.edupulse_class_codes(),public.edupulse_announcement_command(jsonb),public.edupulse_class_announcements() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_class_code_command(jsonb),public.edupulse_class_join(jsonb),public.edupulse_class_codes(),public.edupulse_announcement_command(jsonb),public.edupulse_class_announcements() TO authenticated;
