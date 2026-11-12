-- Keep the same student-self, Dean and owning-instructor read authority in one policy.
DROP POLICY assessment_session_read ON public.edupulse_assessment_sessions;
DROP POLICY instructor_session_read ON public.edupulse_assessment_sessions;
CREATE POLICY assessment_session_read ON public.edupulse_assessment_sessions FOR SELECT TO authenticated USING (
 student_id=(SELECT auth.uid()) OR
 (SELECT edupulse_private.academic_role())='dean' OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND EXISTS(SELECT 1 FROM public.edupulse_publications p WHERE p.id=publication_id AND p.instructor_id=(SELECT auth.uid()))));
