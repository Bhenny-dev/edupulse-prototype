-- The Schedule page (owner request, 25 November 2026). An instructor already reads the class meetings of the
-- courses assigned to them from their own load records. A student cannot read load records, so this returns
-- only the meeting days, times and room of the classes the student is in: enrolled classes, and classes joined
-- with a code that are still on the instructor's class list. Nothing else of the load record is exposed.
CREATE FUNCTION edupulse_private.student_class_schedule() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.academic_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Student account required' USING ERRCODE='42501';END IF;
 WITH mine AS (
  SELECT c.course_code, e.block_section AS block, c.academic_year, edupulse_private.canonical_semester(c.semester) AS semester
  FROM public.edupulse_enrollments e JOIN auth.users u ON u.id=auth.uid() AND lower(u.email)=e.student_email
  JOIN public.edupulse_courses c ON c.id=e.course_id
  WHERE NOT e.suspended AND coalesce(e.block_section,'')<>''
  UNION
  SELECT cc.course_code, cc.block, cc.academic_year, cc.semester
  FROM edupulse_private.class_joins j JOIN edupulse_private.class_codes cc ON cc.id=j.code_id
  WHERE j.student_id=auth.uid() AND EXISTS(SELECT 1 FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(coalesce(w.data->'registrations','[]')) g CROSS JOIN LATERAL jsonb_array_elements(coalesce(g->'students','[]')) s
   WHERE w.owner_id=j.instructor_id AND g->>'courseCode'=cc.course_code AND g->>'blockSection'=cc.block AND g->>'status'='active'
    AND coalesce(g->>'academicYear','2026-2027')=cc.academic_year AND edupulse_private.canonical_semester(coalesce(g->>'semester','1st Semester'))=cc.semester
    AND (s->>'StudentID'=j.student_number OR lower(s->>'Email')=j.student_email))
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('load_key',r.record_key,'course_code',m.course_code,'course_title',coalesce(nullif(r.data->>'CourseTitle',''),m.course_code),'block',m.block,
   'academic_year',m.academic_year,'semester',m.semester,'instructor_name',coalesce(r.data->>'InstructorName',''),
   'slots',CASE WHEN jsonb_typeof(r.data->'Schedules')='array' AND jsonb_array_length(r.data->'Schedules')>0 THEN r.data->'Schedules'
     WHEN coalesce(r.data->>'ScheduleDays','')<>'' OR coalesce(r.data->>'ScheduleTime','')<>'' THEN jsonb_build_array(jsonb_build_object('days',r.data->>'ScheduleDays','time',r.data->>'ScheduleTime','room',r.data->>'Room'))
     ELSE '[]'::jsonb END) ORDER BY m.course_code,m.block),'[]') INTO result
 FROM mine m JOIN public.edupulse_institutional_records r ON r.kind='loads' AND r.record_key=concat_ws('|',m.course_code,m.block,m.semester,m.academic_year);
 IF jsonb_array_length(result)>200 THEN RAISE EXCEPTION 'Class schedule exceeds supported capacity' USING ERRCODE='54000';END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.student_class_schedule() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.student_class_schedule() TO authenticated;
CREATE FUNCTION public.edupulse_student_class_schedule() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.student_class_schedule() $$;
REVOKE ALL ON FUNCTION public.edupulse_student_class_schedule() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_student_class_schedule() TO authenticated;
