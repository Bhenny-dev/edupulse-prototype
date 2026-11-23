-- Topic discussion and file submissions are scoped to published courseware.
CREATE TABLE edupulse_private.topic_comments (
 id uuid PRIMARY KEY,
 publication_id text NOT NULL REFERENCES public.edupulse_publications(id) ON DELETE CASCADE,
 author_id uuid NOT NULL,
 author_name text NOT NULL,
 block_section text NOT NULL,
 private_student uuid,
 reply_to uuid REFERENCES edupulse_private.topic_comments(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 4000),
 posted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX topic_comments_publication_idx ON edupulse_private.topic_comments(publication_id, posted_at, id);

CREATE TABLE edupulse_private.topic_submissions (
 publication_id text NOT NULL REFERENCES public.edupulse_publications(id) ON DELETE CASCADE,
 student_id uuid NOT NULL,
 student_name text NOT NULL,
 block_section text NOT NULL,
 source_version text NOT NULL,
 body text NOT NULL CHECK(char_length(body)<=12000),
 link text,
 files jsonb NOT NULL CHECK(jsonb_typeof(files)='array' AND jsonb_array_length(files)<=30),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(publication_id, student_id)
);
ALTER TABLE edupulse_private.topic_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE edupulse_private.topic_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.topic_comments, edupulse_private.topic_submissions FROM PUBLIC,anon,authenticated;

CREATE FUNCTION edupulse_private.topic_work_access(item_id text)
RETURNS TABLE(teacher boolean, block_section text, person text, writable boolean, accepting boolean, version text, bin boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; delivery_window jsonb; member public.edupulse_enrollments; editable boolean; role_name text:=(SELECT edupulse_private.academic_role());
BEGIN
 SELECT q.* INTO p FROM public.edupulse_publications q JOIN public.edupulse_courses c ON c.id=q.course_id
 WHERE q.id=item_id AND q.active AND c.active AND q.instructor_id=c.instructor_id;
 IF p.id IS NULL OR auth.uid() IS NULL THEN RETURN; END IF;
 SELECT NOT edupulse_private.completed_term(c.academic_year,c.semester)
 INTO editable FROM public.edupulse_courses c WHERE c.id=p.course_id;
 IF role_name='instructor' AND p.instructor_id=auth.uid() THEN
  RETURN QUERY SELECT true, NULL::text, coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Instructor'), editable, false, p.source_version, p.content->'submissionBin'='true'::jsonb
    FROM auth.users u WHERE u.id=auth.uid();
 ELSIF role_name='student' AND (p.release_at IS NULL OR p.release_at<=now()) THEN
  SELECT e.* INTO member FROM public.edupulse_enrollments e JOIN auth.users u ON u.id=auth.uid()
   WHERE e.course_id=p.course_id AND e.instructor_id=p.instructor_id AND e.student_email=lower(u.email) AND NOT e.suspended
   ORDER BY e.block_section LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  IF p.delivery_mode='block_schedule' THEN
   delivery_window:=edupulse_private.student_delivery_window(p.course_id,p.week);
   IF delivery_window IS NULL OR (delivery_window->>'opens_at')::timestamptz>now() THEN RETURN; END IF;
  END IF;
  RETURN QUERY SELECT false, member.block_section, member.display_name,
    editable AND edupulse_private.publication_window_open(p.id),
    p.content->'submissionBin'='true'::jsonb AND editable AND edupulse_private.publication_window_open(p.id) AND (p.due_at IS NULL OR p.due_at>now()),
    p.source_version, p.content->'submissionBin'='true'::jsonb;
 END IF;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.topic_work_access(text) FROM PUBLIC,anon,authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES('edupulse-student-work','edupulse-student-work',false,4000000);

CREATE FUNCTION edupulse_private.student_work_file_allowed(object_name text, uploading boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE parts text[]:=string_to_array(object_name,'/'); access record;
BEGIN
 IF object_name !~ '^[a-f0-9-]{36}/[a-f0-9]{32}/[a-f0-9-]{36}/[^/]{1,200}$' THEN RETURN false; END IF;
 SELECT * INTO access FROM edupulse_private.topic_work_access(parts[2]);
 IF NOT FOUND THEN RETURN false; END IF;
 IF uploading THEN
  RETURN access.accepting IS TRUE AND parts[1]=auth.uid()::text
   AND NOT EXISTS(SELECT 1 FROM edupulse_private.topic_submissions s WHERE s.publication_id=parts[2] AND s.student_id=auth.uid());
 END IF;
 RETURN (access.teacher OR parts[1]=auth.uid()::text)
   AND EXISTS(SELECT 1 FROM edupulse_private.topic_submissions s WHERE s.publication_id=parts[2]
      AND s.student_id::text=parts[1] AND s.files @> jsonb_build_array(jsonb_build_object('path',object_name)));
END $$;
REVOKE ALL ON FUNCTION edupulse_private.student_work_file_allowed(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.student_work_file_allowed(text,boolean) TO authenticated;
CREATE POLICY edupulse_student_work_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='edupulse-student-work' AND edupulse_private.student_work_file_allowed(name,true));
CREATE POLICY edupulse_student_work_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='edupulse-student-work' AND edupulse_private.student_work_file_allowed(name,false));

CREATE FUNCTION edupulse_private.topic_work(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item_id text:=command->>'publication'; op text:=command->>'operation'; access record;
 actor uuid:=auth.uid(); entry_id uuid; parent edupulse_private.topic_comments; thread_owner uuid; thread_block text;
 message text:=trim(coalesce(command->>'body','')); file jsonb; object_name text;
 submitted_files jsonb:=coalesce(command->'files','[]'); link_url text:=nullif(trim(command->>'link'),'');
BEGIN
 IF op IN ('comment','submit') THEN
  -- Serialize writes with changes to the published version.
  PERFORM 1 FROM public.edupulse_publications p WHERE p.id=item_id FOR SHARE;
 END IF;
 SELECT * INTO access FROM edupulse_private.topic_work_access(item_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'This item is unavailable for your current class access.' USING ERRCODE='42501'; END IF;
 IF op='read' THEN
  RETURN jsonb_build_object(
   'bin',coalesce(access.bin,false),'canComment',access.writable,'canSubmit',coalesce(access.accepting,false),
   'comments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',n.id,'author',n.author_name,'body',n.body,
     'block',CASE WHEN access.teacher THEN n.block_section END,'private',n.private_student IS NOT NULL,
     'replyTo',n.reply_to,'postedAt',n.posted_at) ORDER BY n.posted_at,n.id)
    FROM edupulse_private.topic_comments n WHERE n.publication_id=item_id AND
      (access.teacher OR n.private_student=actor OR (n.private_student IS NULL AND n.block_section=access.block_section))), '[]'::jsonb),
   'submissions',coalesce((SELECT jsonb_agg(jsonb_build_object('student',s.student_name,'block',s.block_section,
     'body',s.body,'link',s.link,'files',s.files,'submittedAt',s.submitted_at) ORDER BY s.submitted_at,s.student_id)
    FROM edupulse_private.topic_submissions s WHERE s.publication_id=item_id AND (access.teacher OR s.student_id=actor)), '[]'::jsonb));
 END IF;
 IF access.version IS DISTINCT FROM command->>'version' THEN RAISE EXCEPTION 'This item changed. Reopen the current version.' USING ERRCODE='40001'; END IF;
 IF op='comment' THEN
  IF access.writable IS NOT TRUE THEN RAISE EXCEPTION 'The class discussion is closed.' USING ERRCODE='42501'; END IF;
  IF char_length(message) NOT BETWEEN 1 AND 4000 OR command->>'id' IS NULL THEN RAISE EXCEPTION 'Enter a comment up to 4,000 characters.' USING ERRCODE='22023'; END IF;
  entry_id:=(command->>'id')::uuid;
  IF command->>'replyTo' IS NOT NULL THEN
   SELECT * INTO parent FROM edupulse_private.topic_comments n WHERE n.id=(command->>'replyTo')::uuid AND n.publication_id=item_id AND n.reply_to IS NULL;
   IF NOT FOUND OR NOT coalesce(access.teacher OR parent.private_student=actor OR
     (parent.private_student IS NULL AND parent.block_section=access.block_section),false)
     THEN RAISE EXCEPTION 'This comment is unavailable.' USING ERRCODE='42501'; END IF;
   thread_owner:=parent.private_student;
   thread_block:=parent.block_section;
  ELSE
   IF access.teacher THEN RAISE EXCEPTION 'Open a class or private thread to reply.' USING ERRCODE='22023'; END IF;
   thread_owner:=CASE WHEN command->'private'='true'::jsonb THEN actor END;
   thread_block:=access.block_section;
  END IF;
  INSERT INTO edupulse_private.topic_comments(id,publication_id,author_id,author_name,block_section,private_student,reply_to,body)
  VALUES(entry_id,item_id,actor,access.person,thread_block,thread_owner,parent.id,message) ON CONFLICT(id) DO NOTHING;
  RETURN jsonb_build_object('saved',true);
 END IF;
 IF access.teacher OR op IS NULL OR op NOT IN ('upload','submit') THEN RAISE EXCEPTION 'Student submission required.' USING ERRCODE='42501'; END IF;
 -- A retry after a lost receipt returns the existing submission without replacing it.
 IF EXISTS(SELECT 1 FROM edupulse_private.topic_submissions s WHERE s.publication_id=item_id AND s.student_id=actor) THEN
  IF op='submit' THEN RETURN jsonb_build_object('saved',true); END IF;
  RAISE EXCEPTION 'You already submitted work here.' USING ERRCODE='22023';
 END IF;
 IF access.accepting IS NOT TRUE THEN RAISE EXCEPTION 'This submission bin is closed.' USING ERRCODE='42501'; END IF;
 IF op='upload' THEN RETURN jsonb_build_object('allowed',true); END IF;

 IF jsonb_typeof(submitted_files)<>'array' OR jsonb_array_length(submitted_files)>30 OR char_length(message)>12000
  OR (link_url IS NOT NULL AND (length(link_url)>2000 OR link_url !~* '^https?://[^[:space:]]+$'))
  OR (message='' AND jsonb_array_length(submitted_files)=0 AND link_url IS NULL)
  THEN RAISE EXCEPTION 'Add written work, a valid link or up to 30 files.' USING ERRCODE='22023'; END IF;
 FOR file IN SELECT value FROM jsonb_array_elements(submitted_files) LOOP
  object_name:=file->>'path';
  IF object_name IS NULL OR split_part(object_name,'/',2)<>item_id
   OR edupulse_private.student_work_file_allowed(object_name,true) IS NOT TRUE
   OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='edupulse-student-work' AND o.name=object_name)
   THEN RAISE EXCEPTION 'One of your files is missing or unavailable. Upload it again.' USING ERRCODE='22023'; END IF;
 END LOOP;
 INSERT INTO edupulse_private.topic_submissions(publication_id,student_id,student_name,block_section,source_version,body,link,files)
 VALUES(item_id,actor,access.person,access.block_section,access.version,message,link_url,
   (SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object('path',a->>'path','name',split_part(a->>'path','/',4))),'[]'::jsonb)
    FROM jsonb_array_elements(submitted_files) a))
 ON CONFLICT(publication_id,student_id) DO NOTHING;
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.topic_work(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.topic_work(jsonb) TO authenticated;
CREATE FUNCTION public.edupulse_topic_work(command jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.topic_work(command) $$;
REVOKE ALL ON FUNCTION public.edupulse_topic_work(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_topic_work(jsonb) TO authenticated;
