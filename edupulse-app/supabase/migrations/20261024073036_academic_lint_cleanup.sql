-- Remove the redundant outer loop variable flagged by the hosted SQL linter.
CREATE OR REPLACE FUNCTION edupulse_private.academic_action(publication text, version text, responses jsonb, operation text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; result public.edupulse_attempts; keys jsonb; points integer:=0;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'')<>'student' THEN RAISE EXCEPTION 'Student required' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication FOR SHARE;
 IF p.id IS NULL OR NOT p.active OR p.source_version<>version OR NOT EXISTS(SELECT 1 FROM public.edupulse_courses c JOIN public.edupulse_enrollments e ON e.course_id=c.id WHERE c.id=p.course_id AND c.active AND e.student_email=lower(auth.jwt()->>'email')) THEN RAISE EXCEPTION 'Published enrolled material required' USING ERRCODE='42501'; END IF;
 IF operation='open' AND p.type<>'assessment' THEN
  INSERT INTO public.edupulse_material_access(publication_id,instructor_id,student_id,student_email) VALUES(p.id,p.instructor_id,auth.uid(),lower(auth.jwt()->>'email')) ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('opened',true);
 END IF;
 IF operation<>'submit' OR p.type<>'assessment' THEN RAISE EXCEPTION 'Invalid academic operation' USING ERRCODE='22023'; END IF;
 SELECT answers INTO keys FROM edupulse_private.assessment_keys WHERE publication_id=p.id AND source_version=version;
 IF keys IS NULL OR jsonb_typeof(responses) IS DISTINCT FROM 'array' OR jsonb_array_length(responses)<>jsonb_array_length(keys) THEN RAISE EXCEPTION 'Answer every assessment item' USING ERRCODE='22023'; END IF;
 FOR i IN 0..jsonb_array_length(keys)-1 LOOP
  IF jsonb_typeof(responses->i)<>'number' OR (responses->>i)::int NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Invalid response' USING ERRCODE='22023'; END IF;
  IF responses->i=keys->i THEN points:=points+1; END IF;
 END LOOP;
 INSERT INTO public.edupulse_attempts(publication_id,instructor_id,student_id,source_version,answers,score,max_score,student_email)
  VALUES(p.id,p.instructor_id,auth.uid(),version,responses,points,jsonb_array_length(keys),lower(auth.jwt()->>'email')) ON CONFLICT(publication_id,student_id,source_version) DO NOTHING;
 SELECT * INTO result FROM public.edupulse_attempts WHERE publication_id=p.id AND student_id=auth.uid() AND source_version=version;
 RETURN jsonb_build_object('id',result.id,'score',result.score,'max_score',result.max_score,'submitted_at',result.submitted_at);
END $$;
