-- PostgREST preloads safeupdate. The former unqualified block_info UPDATE
-- aborted every workspace save/import, including saves with no courses.
-- Keep the existing shared-load projection and its private execution boundary.
CREATE OR REPLACE FUNCTION edupulse_private.refresh_imported_enrollments() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 DELETE FROM public.edupulse_enrollments WHERE source='institutional';
 DELETE FROM public.edupulse_enrollments e USING public.edupulse_courses c,public.edupulse_institutional_records l WHERE e.course_id=c.id AND l.kind='loads' AND l.data->>'CourseCode'=c.course_code AND l.data->>'Block'=e.block_section AND l.data->>'InstructorID'<>e.instructor_id::text;
 INSERT INTO public.edupulse_enrollments(course_id,instructor_id,student_email,student_ref,display_name,block_section,source)
 SELECT c.id,c.instructor_id,lower(r.data->>'Email'),r.data->>'StudentID',r.data->>'Name',r.data->>'Block','institutional'
 FROM public.edupulse_courses c JOIN public.edupulse_institutional_records l ON l.kind='loads' AND l.data->>'CourseCode'=c.course_code AND l.data->>'InstructorID'=c.instructor_id::text
 JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND r.data->>'Block'=l.data->>'Block'
 WHERE lower(coalesce(r.data->>'Status','active')) NOT IN ('inactive','withdrawn') ON CONFLICT DO NOTHING;

 WITH summaries AS (
  SELECT c.id,(SELECT coalesce(jsonb_agg(jsonb_build_object('block',block_section,'students',students,'schedule',schedule,'yearLevel',year_level,'adviser',adviser) ORDER BY block_section),'[]')
   FROM (SELECT e.block_section,count(DISTINCT e.student_email) students,max(r.data->>'Schedule') schedule,max(r.data->>'YearLevel') year_level,max(r.data->>'Adviser') adviser
    FROM public.edupulse_enrollments e LEFT JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND lower(r.data->>'Email')=e.student_email AND r.data->>'Block'=e.block_section
    WHERE e.course_id=c.id GROUP BY e.block_section) blocks) AS info
  FROM public.edupulse_courses c
 )
 UPDATE public.edupulse_courses c SET block_info=s.info FROM summaries s
 WHERE c.id=s.id AND c.block_info IS DISTINCT FROM s.info;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.refresh_imported_enrollments() FROM PUBLIC,anon,authenticated;
