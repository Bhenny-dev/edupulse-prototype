CREATE TABLE public.edupulse_practice_sets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES auth.users(id),
 instructor_id uuid NOT NULL REFERENCES auth.users(id),course_id text NOT NULL REFERENCES public.edupulse_courses(id),
 publication_id text NOT NULL REFERENCES public.edupulse_publications(id),source_version text NOT NULL,
 title text NOT NULL,questions jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),is_test boolean NOT NULL DEFAULT false
);
CREATE TABLE edupulse_private.practice_keys(set_id uuid PRIMARY KEY REFERENCES public.edupulse_practice_sets(id) ON DELETE CASCADE,answers jsonb NOT NULL);
CREATE TABLE public.edupulse_practice_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),set_id uuid NOT NULL REFERENCES public.edupulse_practice_sets(id),
 student_id uuid NOT NULL REFERENCES auth.users(id),instructor_id uuid NOT NULL REFERENCES auth.users(id),
 answers jsonb NOT NULL,score integer NOT NULL,max_score integer NOT NULL,submitted_at timestamptz NOT NULL DEFAULT now(),
 is_test boolean NOT NULL DEFAULT false,admin_actor_id uuid REFERENCES auth.users(id),submission_id uuid NOT NULL,
 UNIQUE(student_id,submission_id),CHECK(score BETWEEN 0 AND max_score)
);
CREATE INDEX practice_sets_student_idx ON public.edupulse_practice_sets(student_id,created_at);
CREATE INDEX practice_sets_instructor_idx ON public.edupulse_practice_sets(instructor_id);
CREATE INDEX practice_attempts_student_idx ON public.edupulse_practice_attempts(student_id,submitted_at);
CREATE INDEX practice_attempts_instructor_idx ON public.edupulse_practice_attempts(instructor_id);
ALTER TABLE public.edupulse_practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE edupulse_private.practice_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_practice_sets,public.edupulse_practice_attempts,edupulse_private.practice_keys FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.edupulse_practice_sets,public.edupulse_practice_attempts TO authenticated;
CREATE POLICY practice_sets_read ON public.edupulse_practice_sets FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role())='dean' OR
 ((SELECT edupulse_private.academic_role())='student' AND student_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())));
CREATE POLICY practice_attempts_read ON public.edupulse_practice_attempts FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role())='dean' OR
 ((SELECT edupulse_private.academic_role())='student' AND student_id=(SELECT auth.uid())) OR
 ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND instructor_id=(SELECT auth.uid())));

CREATE FUNCTION edupulse_private.practice_action(input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; s public.edupulse_practice_sets; result public.edupulse_practice_attempts;
 keys jsonb; q jsonb; clean jsonb:='[]'; answers jsonb:='[]'; n integer; i integer; points integer:=0;
 actor uuid:=nullif(current_setting('edupulse.admin_actor',true),'')::uuid; op text:=input->>'operation';
BEGIN
 IF edupulse_private.academic_role()<>'student' THEN RAISE EXCEPTION 'Student account required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('practice:'||auth.uid()::text));
 IF op='create' THEN
  SELECT * INTO p FROM public.edupulse_publications WHERE id=input->>'publication' AND active AND type<>'assessment' AND source_version=input->>'version' AND (release_at IS NULL OR release_at<=now());
  IF p.id IS NULL OR NOT edupulse_private.has_active_enrollment(p.course_id) OR NOT EXISTS(SELECT 1 FROM public.edupulse_courses WHERE id=p.course_id AND active) THEN RAISE EXCEPTION 'Released enrolled reading required' USING ERRCODE='42501'; END IF;
  IF (SELECT count(*) FROM public.edupulse_practice_sets WHERE student_id=auth.uid())>=200 THEN RAISE EXCEPTION 'Practice set capacity reached' USING ERRCODE='54000'; END IF;
  IF jsonb_typeof(input->'questions') IS DISTINCT FROM 'array' OR jsonb_array_length(input->'questions') NOT BETWEEN 3 AND 5 OR length(input->>'title') NOT BETWEEN 1 AND 180 THEN RAISE EXCEPTION 'Invalid practice set' USING ERRCODE='22023'; END IF;
  FOR q IN SELECT value FROM jsonb_array_elements(input->'questions') LOOP
   IF jsonb_typeof(q->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(q->'options')<>4 OR jsonb_typeof(q->'correctIndex') IS DISTINCT FROM 'number' OR (q->>'correctIndex') !~ '^[0-3]$' OR length(q->>'text') NOT BETWEEN 10 AND 1000
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE jsonb_typeof(o)<>'string' OR length(o#>>'{}') NOT BETWEEN 1 AND 500) THEN RAISE EXCEPTION 'Invalid practice question' USING ERRCODE='22023'; END IF;
   clean:=clean||jsonb_build_array(jsonb_build_object('text',q->>'text','options',q->'options'));
   answers:=answers||jsonb_build_array(q->'correctIndex');
  END LOOP;
  INSERT INTO public.edupulse_practice_sets(student_id,instructor_id,course_id,publication_id,source_version,title,questions,is_test)
  VALUES(auth.uid(),p.instructor_id,p.course_id,p.id,p.source_version,input->>'title',clean,actor IS NOT NULL) RETURNING * INTO s;
  INSERT INTO edupulse_private.practice_keys VALUES(s.id,answers);
  RETURN to_jsonb(s);
 ELSIF op='submit' THEN
  SELECT * INTO s FROM public.edupulse_practice_sets WHERE id=(input->>'set')::uuid AND student_id=auth.uid();
  IF s.id IS NULL OR NOT edupulse_private.has_active_enrollment(s.course_id) OR NOT EXISTS(SELECT 1 FROM public.edupulse_publications WHERE id=s.publication_id AND active AND source_version=s.source_version AND (release_at IS NULL OR release_at<=now())) THEN RAISE EXCEPTION 'Current owned practice and enrollment required' USING ERRCODE='42501'; END IF;
  SELECT * INTO result FROM public.edupulse_practice_attempts WHERE student_id=auth.uid() AND submission_id=(input->>'submission')::uuid;
  IF result.id IS NOT NULL THEN
   IF result.set_id<>s.id OR result.answers IS DISTINCT FROM input->'responses' THEN RAISE EXCEPTION 'Submission identifier already used' USING ERRCODE='22023'; END IF;
   RETURN to_jsonb(result);
  END IF;
  SELECT k.answers INTO keys FROM edupulse_private.practice_keys k WHERE k.set_id=s.id;
  n:=jsonb_array_length(keys);
  IF jsonb_typeof(input->'responses') IS DISTINCT FROM 'array' OR jsonb_array_length(input->'responses')<>n OR EXISTS(SELECT 1 FROM jsonb_array_elements(input->'responses') r WHERE jsonb_typeof(r)<>'number' OR (r#>>'{}') !~ '^[0-3]$') THEN RAISE EXCEPTION 'Answer every practice question' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM public.edupulse_practice_attempts WHERE set_id=s.id)>=100 THEN RAISE EXCEPTION 'Practice attempt capacity reached' USING ERRCODE='54000'; END IF;
  FOR i IN 0..n-1 LOOP IF input->'responses'->i=keys->i THEN points:=points+1; END IF; END LOOP;
  INSERT INTO public.edupulse_practice_attempts(set_id,student_id,instructor_id,answers,score,max_score,is_test,admin_actor_id,submission_id)
  VALUES(s.id,auth.uid(),s.instructor_id,input->'responses',points,n,actor IS NOT NULL,actor,(input->>'submission')::uuid) RETURNING * INTO result;
  RETURN to_jsonb(result);
 END IF;
 RAISE EXCEPTION 'Unsupported practice action' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION edupulse_private.practice_action(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.practice_action(jsonb) TO authenticated;
CREATE FUNCTION public.edupulse_practice_action(input jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.practice_action(input) $$;
REVOKE ALL ON FUNCTION public.edupulse_practice_action(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_practice_action(jsonb) TO authenticated;
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'IF operation NOT IN (','IF operation NOT IN (''practice.command'',''practice.list'',');
 definition:=replace(definition, $find$WHEN 'students.read' THEN$find$, $patch$WHEN 'practice.list' THEN
  result:=jsonb_build_object('sets',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY created_at),'[]') FROM public.edupulse_practice_sets s),'attempts',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY submitted_at),'[]') FROM public.edupulse_practice_attempts a));
 WHEN 'practice.command' THEN
  IF subject_role<>'student' OR input->>'adminTest' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Explicit Admin demonstration required' USING ERRCODE='42501'; END IF;
  PERFORM set_config('edupulse.admin_actor',actor::text,true);
  result:=public.edupulse_practice_action(input-'adminTest');
  PERFORM set_config('edupulse.admin_actor','',true);
 WHEN 'students.read' THEN$patch$);
 IF strpos(definition,'WHEN ''practice.command''')=0 THEN RAISE EXCEPTION 'Practice support patch unavailable'; END IF;
 EXECUTE definition;
END $$;
