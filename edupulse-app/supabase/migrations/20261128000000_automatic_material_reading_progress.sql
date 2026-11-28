ALTER TABLE public.edupulse_material_progress
 ADD COLUMN scroll_percent integer CHECK (scroll_percent BETWEEN 1 AND 100);

CREATE FUNCTION edupulse_private.save_material_scroll(publication text,version text,progress integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 p public.edupulse_publications;
 opened public.edupulse_material_access;
 saved public.edupulse_material_progress;
 learner uuid:=auth.uid();
 section_count integer;
BEGIN
 IF (SELECT edupulse_private.academic_role()) IS DISTINCT FROM 'student' THEN
  RAISE EXCEPTION 'Student sign-in required' USING ERRCODE='42501';
 END IF;
 IF progress IS NULL OR progress NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION 'Invalid reading percentage' USING ERRCODE='22023';
 END IF;

 SELECT * INTO p FROM public.edupulse_publications
 WHERE id=publication AND active AND source_version=version AND type<>'assessment'
 AND (release_at IS NULL OR release_at<=now()) FOR SHARE;
 IF p.id IS NULL OR NOT edupulse_private.has_active_enrollment(p.course_id)
 OR NOT EXISTS(SELECT 1 FROM public.edupulse_courses c WHERE c.id=p.course_id AND c.active)
 OR NOT edupulse_private.publication_window_open(publication) THEN
  RAISE EXCEPTION 'Released enrolled material required' USING ERRCODE='42501';
 END IF;
 IF p.content->>'submissionOnly'='true' THEN
  RAISE EXCEPTION 'This item has no reading progress' USING ERRCODE='22023';
 END IF;
 SELECT * INTO opened FROM public.edupulse_material_access a
 WHERE a.publication_id=p.id AND a.student_id=learner;
 IF opened.student_id IS NULL OR
 (nullif(current_setting('edupulse.admin_actor',true),'') IS NOT NULL AND NOT opened.is_test) THEN
  RAISE EXCEPTION 'Open the material first' USING ERRCODE='42501';
 END IF;

 section_count:=CASE WHEN jsonb_typeof(p.content->'sections')='array'
  THEN greatest(1,least(1000,jsonb_array_length(p.content->'sections'))) ELSE 1 END;
 INSERT INTO public.edupulse_material_progress (
  publication_id,instructor_id,student_id,student_email,source_version,sections_read,total_sections,is_test,admin_actor_id
 ) VALUES(p.id,p.instructor_id,learner,opened.student_email,version,0,section_count,opened.is_test,opened.admin_actor_id)
 ON CONFLICT DO NOTHING;

 SELECT * INTO saved FROM public.edupulse_material_progress r
 WHERE r.publication_id=p.id AND r.student_id=learner AND r.source_version=version FOR UPDATE;
 IF saved.is_test IS DISTINCT FROM opened.is_test THEN
  RAISE EXCEPTION 'Reading progress belongs to a different activity scope' USING ERRCODE='42501';
 END IF;
 IF progress>greatest(coalesce(saved.scroll_percent,0),
   CASE WHEN saved.sections_read=saved.total_sections THEN 100 ELSE least(99,round(100.0*saved.sections_read/saved.total_sections)::integer) END) THEN
  UPDATE public.edupulse_material_progress r
  SET scroll_percent=progress,sections_read=greatest(r.sections_read,progress*r.total_sections/100),
   updated_at=now(),completed_at=CASE WHEN progress=100 THEN now() ELSE NULL END
  WHERE r.publication_id=p.id AND r.student_id=learner AND r.source_version=version RETURNING * INTO saved;
 END IF;
 RETURN to_jsonb(saved);
END $$;

REVOKE ALL ON FUNCTION edupulse_private.save_material_scroll(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.save_material_scroll(text,text,integer) TO authenticated;

CREATE FUNCTION public.edupulse_save_material_scroll(publication text,version text,progress integer) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT edupulse_private.save_material_scroll(publication,version,progress)
$$;
REVOKE ALL ON FUNCTION public.edupulse_save_material_scroll(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_save_material_scroll(text,text,integer) TO authenticated;

-- Retain the existing, audited demonstration path and old clients' section command.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.support_student_demonstration(uuid,jsonb)'::regprocedure);
 definition:=replace(definition,$old$'respond','read-section')$old$,$new$'respond','read-section','reading-progress')$new$);
 definition:=replace(definition,$old$WHEN 'read-section' THEN$old$,$new$WHEN 'reading-progress' THEN result:=public.edupulse_save_material_scroll(input->>'publication',input->>'version',(input->>'percent')::integer);
 WHEN 'read-section' THEN$new$);
 IF strpos(definition,$check$'read-section','reading-progress')$check$)=0 OR strpos(definition,'public.edupulse_save_material_scroll')=0 THEN
  RAISE EXCEPTION 'Student demonstration scroll patch unavailable';
 END IF;
 EXECUTE definition;
END $$;
