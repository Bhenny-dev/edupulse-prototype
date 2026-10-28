CREATE FUNCTION public.edupulse_request_revision(course text, comment text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.edupulse_courses;
BEGIN
 IF auth.uid() IS NULL OR edupulse_private.academic_role() IS DISTINCT FROM 'dean' THEN RAISE EXCEPTION 'Dean required' USING ERRCODE='42501'; END IF;
 IF length(trim(comment)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Review comment required' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.edupulse_courses WHERE id=course;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Authorized course required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.edupulse_notices(recipient_id,actor_id,title,detail,path) VALUES(c.instructor_id,auth.uid(),'Syllabus correction requested: '||c.course_code,comment,'/syllabus?tab=mine');
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'revision_request',c.course_code,'Corrections requested for the offline review route');
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.edupulse_request_revision(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_request_revision(text,text) TO authenticated;
