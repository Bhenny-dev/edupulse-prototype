-- Explicit, version-bound authorization for the owner's registered-account pipeline exercise.
-- Existing activity is never relabelled; normal learner RPCs still perform access and scoring.
ALTER TABLE public.edupulse_attempts ADD COLUMN is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.edupulse_material_access ADD COLUMN is_test boolean NOT NULL DEFAULT false;

CREATE TABLE edupulse_private.pipeline_activity_grants (
 publication_id text NOT NULL REFERENCES public.edupulse_publications(id) ON DELETE CASCADE,
 source_version text NOT NULL,
 student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 instructor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(publication_id,source_version,student_id)
);
ALTER TABLE edupulse_private.pipeline_activity_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.pipeline_activity_grants FROM PUBLIC,anon,authenticated;

CREATE FUNCTION edupulse_private.authorize_pipeline_test(publication text, version text, student uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; email text;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN
  RAISE EXCEPTION 'Owned instructor publication required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication FOR SHARE;
 IF p.id IS NULL OR p.instructor_id IS DISTINCT FROM auth.uid() OR p.source_version IS DISTINCT FROM version THEN
  RAISE EXCEPTION 'Owned current publication required' USING ERRCODE='42501';
 END IF;
 SELECT lower(a.email) INTO email FROM auth.users a JOIN public.edupulse_students s ON s.user_id=a.id
 WHERE a.id=student AND s.active AND a.raw_app_meta_data->>'role'='student';
 IF email IS NULL OR NOT EXISTS(SELECT 1 FROM public.edupulse_enrollments e WHERE e.course_id=p.course_id AND e.student_email=email) THEN
  RAISE EXCEPTION 'Registered enrolled learner required' USING ERRCODE='42501';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p.id||student::text));
 IF EXISTS(SELECT 1 FROM public.edupulse_attempts a WHERE a.publication_id=p.id AND a.student_id=student AND a.source_version=version AND NOT a.is_test)
 OR EXISTS(SELECT 1 FROM public.edupulse_material_access a WHERE a.publication_id=p.id AND a.student_id=student AND NOT a.is_test) THEN
  RAISE EXCEPTION 'Existing genuine activity cannot be relabelled' USING ERRCODE='22023';
 END IF;
 INSERT INTO edupulse_private.pipeline_activity_grants(publication_id,source_version,student_id,instructor_id)
 VALUES(p.id,version,student,auth.uid()) ON CONFLICT DO NOTHING;
 RETURN jsonb_build_object('authorized',true,'label','Pipeline test');
END $$;
REVOKE ALL ON FUNCTION edupulse_private.authorize_pipeline_test(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.authorize_pipeline_test(text,text,uuid) TO authenticated;
CREATE FUNCTION public.edupulse_authorize_pipeline_test(publication text, version text, student uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT edupulse_private.authorize_pipeline_test(publication,version,student)
$$;
REVOKE ALL ON FUNCTION public.edupulse_authorize_pipeline_test(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_authorize_pipeline_test(text,text,uuid) TO authenticated;

CREATE FUNCTION edupulse_private.label_pipeline_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE version text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(NEW.publication_id||NEW.student_id::text));
 IF TG_TABLE_NAME='edupulse_attempts' THEN version:=NEW.source_version;
 ELSE SELECT source_version INTO version FROM public.edupulse_publications WHERE id=NEW.publication_id;
 END IF;
 NEW.is_test:=EXISTS(SELECT 1 FROM edupulse_private.pipeline_activity_grants g WHERE g.publication_id=NEW.publication_id
 AND g.source_version=version AND g.student_id=NEW.student_id AND g.instructor_id=NEW.instructor_id);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.label_pipeline_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER label_pipeline_attempt BEFORE INSERT ON public.edupulse_attempts FOR EACH ROW EXECUTE FUNCTION edupulse_private.label_pipeline_activity();
CREATE TRIGGER label_pipeline_open BEFORE INSERT ON public.edupulse_material_access FOR EACH ROW EXECUTE FUNCTION edupulse_private.label_pipeline_activity();
