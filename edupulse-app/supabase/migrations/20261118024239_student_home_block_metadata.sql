-- Home placement is visible before any teaching load or approved syllabus exists.
CREATE FUNCTION edupulse_private.student_home_block() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.academic_role() IS DISTINCT FROM 'student' THEN RAISE EXCEPTION 'Student account required' USING ERRCODE='42501';END IF;
 SELECT jsonb_build_object('code',r.data->>'Block','year_level',s.year_level,'department',s.department,'program',s.program,'students',(SELECT count(*) FROM public.edupulse_students peer JOIN public.edupulse_institutional_records placement ON placement.kind='rosters' AND placement.record_key=peer.student_number WHERE peer.active AND placement.data->>'Block'=r.data->>'Block' AND coalesce(placement.data->>'Status','active') NOT IN ('inactive','withdrawn'))) INTO result
 FROM public.edupulse_students s JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND r.record_key=s.student_number
 WHERE s.user_id=auth.uid() AND s.active AND nullif(r.data->>'Block','') IS NOT NULL AND r.data->>'Block'<>'IRREGULAR';
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.student_home_block() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.student_home_block() TO authenticated;
CREATE FUNCTION public.edupulse_student_home_block() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.student_home_block() $$;
REVOKE ALL ON FUNCTION public.edupulse_student_home_block() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_student_home_block() TO authenticated;
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 body:=replace(body,$old$'assignedCourses',CASE WHEN subject_role='student'$old$,$new$'homeBlock',CASE WHEN subject_role='student' THEN public.edupulse_student_home_block() ELSE NULL END,'assignedCourses',CASE WHEN subject_role='student'$new$);
 IF strpos(body,'edupulse_student_home_block()')=0 THEN RAISE EXCEPTION 'Student support home-block patch unavailable';END IF;EXECUTE body;
END $$;
