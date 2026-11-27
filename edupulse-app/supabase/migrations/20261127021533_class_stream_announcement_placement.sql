-- Existing posts remain class-wide or inside their saved calendar week.
ALTER TABLE edupulse_private.class_announcements
 ADD COLUMN topic_id text CHECK (topic_id IS NULL OR (week IS NOT NULL AND length(topic_id) BETWEEN 1 AND 120)),
 ADD COLUMN placement text NOT NULL DEFAULT 'within' CHECK (placement IN ('within','before') AND (placement <> 'before' OR week IS NOT NULL));

-- Reuse the existing authorized RPC and projection. Both account and support paths receive the new fields.
CREATE OR REPLACE FUNCTION edupulse_private.announcement_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op text:=coalesce(command->>'action',''); code text; y text; sem text; wanted text; heading text; message text; week_no integer; topic text; post_position text; link jsonb; links jsonb:='[]'; saved edupulse_private.class_announcements;
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
 topic:=nullif(btrim(command->>'topic_id'),'');
 post_position:=coalesce(command->>'placement','within');
 IF post_position NOT IN ('within','before') OR (week_no IS NULL AND (topic IS NOT NULL OR post_position='before')) THEN
  RAISE EXCEPTION 'Choose a week for this announcement placement.' USING ERRCODE='22023';
 END IF;
 IF topic IS NOT NULL AND (length(topic)>120 OR NOT EXISTS(
  SELECT 1 FROM public.edupulse_courses c
  CROSS JOIN LATERAL jsonb_array_elements(c.outline) AS w(row)
  WHERE c.instructor_id=auth.uid() AND c.course_code=code AND c.active AND c.academic_year=y
   AND edupulse_private.canonical_semester(c.semester)=sem AND w.row->>'week'=week_no::text
   AND (wanted IS NULL OR EXISTS (
    SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind='loads'
     AND r.record_key=concat_ws('|',code,wanted,sem,y)
     AND coalesce(nullif(r.data->>'TeachingSyllabusID',''),c.syllabus_id)=c.syllabus_id
   ))
   AND CASE WHEN jsonb_typeof(w.row->'sections')='array' AND jsonb_array_length(w.row->'sections')>0
     THEN EXISTS(SELECT 1 FROM jsonb_array_elements(w.row->'sections') AS s(section) WHERE s.section->>'id'=topic)
     ELSE topic='week-'||week_no::text AND (btrim(coalesce(w.row->>'ilos',''))<>'' OR coalesce(w.row->>'assessments','') !~* 'examination')
   END
 )) THEN RAISE EXCEPTION 'Choose a topic from this class and week.' USING ERRCODE='22023';END IF;
 IF jsonb_typeof(coalesce(command->'attachments','[]'))<>'array' OR jsonb_array_length(coalesce(command->'attachments','[]'))>10 THEN RAISE EXCEPTION 'Attach up to 10 links.' USING ERRCODE='22023';END IF;
 FOR link IN SELECT value FROM jsonb_array_elements(coalesce(command->'attachments','[]')) LOOP
  IF coalesce(link->>'url','') !~* '^https?://[^[:space:]]{3,}$' OR length(link->>'url')>2000 THEN RAISE EXCEPTION 'Each attachment needs a complete http or https link.' USING ERRCODE='22023';END IF;
  links:=links||jsonb_build_array(jsonb_build_object('kind','link','url',link->>'url','title',left(coalesce(nullif(btrim(link->>'title'),''),link->>'url'),200),'provider',left(coalesce(nullif(link->>'provider',''),'link'),40)));
 END LOOP;
 IF nullif(command->>'id','') IS NULL THEN
  INSERT INTO edupulse_private.class_announcements(instructor_id,course_code,academic_year,semester,block,week,topic_id,placement,title,body,attachments)
   VALUES(auth.uid(),code,y,sem,wanted,week_no,topic,post_position,heading,message,links) RETURNING * INTO saved;
 ELSE
  UPDATE edupulse_private.class_announcements SET block=wanted,week=week_no,topic_id=topic,placement=post_position,title=heading,body=message,attachments=links,updated_at=clock_timestamp()
   WHERE id=(command->>'id')::uuid AND instructor_id=auth.uid() AND course_code=code AND academic_year=y AND semester=sem RETURNING * INTO saved;
  IF saved.id IS NULL THEN RAISE EXCEPTION 'This announcement changed or was removed. Reopen the class.' USING ERRCODE='40001';END IF;
 END IF;
 RETURN to_jsonb(saved)-'instructor_id';
END $$;
