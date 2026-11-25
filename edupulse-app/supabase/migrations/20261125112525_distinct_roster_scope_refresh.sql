-- Resolve each distinct current course/block once during a shared refresh.
-- Materialization prevents the planner from expanding this back to one large
-- workspace/basis lookup per student. The authorization predicate is unchanged.
CREATE INDEX IF NOT EXISTS edupulse_load_owner_course_block
ON public.edupulse_institutional_records((data->>'InstructorID'),edupulse_private.dean_code_key(data->>'CourseCode'),(data->>'Block'))
WHERE kind='loads';

DO $patch$
DECLARE body text; original text:=$original$ DELETE FROM public.edupulse_enrollments e WHERE NOT edupulse_private.completed_course(e.course_id) AND NOT edupulse_private.course_has_current_load(e.course_id,e.block_section);$original$;
BEGIN
 SELECT pg_get_functiondef('edupulse_private.refresh_imported_enrollments()'::regprocedure) INTO body;
 IF strpos(body,'current_roster_scopes')=0 THEN
  IF strpos(body,original)=0 THEN RAISE EXCEPTION 'Review the changed enrollment refresh before adding distinct scope evaluation';END IF;
  body:=replace(body,original,$replacement$ WITH current_roster_scopes AS MATERIALIZED (
  SELECT DISTINCT e.course_id,e.block_section FROM public.edupulse_enrollments e WHERE NOT edupulse_private.completed_course(e.course_id)
 ), verified_roster_scopes AS MATERIALIZED (
  SELECT s.course_id,s.block_section,edupulse_private.course_has_current_load(s.course_id,s.block_section) allowed FROM current_roster_scopes s
 ) DELETE FROM public.edupulse_enrollments e USING verified_roster_scopes s
 WHERE e.course_id=s.course_id AND e.block_section=s.block_section AND NOT s.allowed;$replacement$);
  EXECUTE body;
 END IF;
END $patch$;
