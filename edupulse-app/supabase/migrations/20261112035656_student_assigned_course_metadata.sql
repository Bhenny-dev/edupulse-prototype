-- Assignment labels precede approval; never expose draft outlines, files or content.
CREATE FUNCTION edupulse_private.student_course_loads() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF edupulse_private.academic_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Student account required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'course_code',c.course_code,'course_title',c.course_title,'active',c.active,'block_section',e.block_section,'suspended',e.suspended,'units',r.data->>'Units','year_level',r.data->>'YearLevel','semester',r.data->>'Semester') ORDER BY c.course_code),'[]') INTO result
 FROM public.edupulse_enrollments e JOIN auth.users u ON u.id=auth.uid() AND lower(u.email)=e.student_email
 JOIN public.edupulse_courses c ON c.id=e.course_id
 LEFT JOIN public.edupulse_institutional_records r ON r.kind='courses' AND r.record_key=c.course_code;
 IF jsonb_array_length(result)>200 THEN RAISE EXCEPTION 'Assigned course list exceeds supported capacity' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.student_course_loads() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.student_course_loads() TO authenticated;
CREATE FUNCTION public.edupulse_student_course_loads() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.student_course_loads() $$;
REVOKE ALL ON FUNCTION public.edupulse_student_course_loads() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_student_course_loads() TO authenticated;
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,$find$'courses',(SELECT$find$,$add$'assignedCourses',CASE WHEN subject_role='student' THEN public.edupulse_student_course_loads() ELSE '[]'::jsonb END,
 'courses',(SELECT$add$);
 IF strpos(definition,'edupulse_student_course_loads()')=0 THEN RAISE EXCEPTION 'Support assigned-course patch unavailable'; END IF;
 EXECUTE definition;
END $$;
