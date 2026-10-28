ALTER TABLE public.edupulse_attempts DROP CONSTRAINT edupulse_attempts_publication_id_student_id_source_version_key;
ALTER TABLE public.edupulse_attempts ADD COLUMN attempt_no integer NOT NULL DEFAULT 1 CHECK(attempt_no BETWEEN 1 AND 3), ADD COLUMN appeal text NOT NULL DEFAULT '', ADD CONSTRAINT edupulse_attempt_version_no UNIQUE(publication_id,student_id,source_version,attempt_no);
CREATE TABLE public.edupulse_assessment_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), publication_id text NOT NULL REFERENCES public.edupulse_publications(id), student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 source_version text NOT NULL, attempt_no integer NOT NULL CHECK(attempt_no BETWEEN 1 AND 3), started_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(publication_id,student_id,source_version,attempt_no)
);
ALTER TABLE public.edupulse_assessment_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_assessment_sessions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.edupulse_assessment_sessions TO authenticated;
CREATE POLICY assessment_session_read ON public.edupulse_assessment_sessions FOR SELECT TO authenticated USING (student_id=(SELECT auth.uid()));
CREATE INDEX edupulse_session_student_idx ON public.edupulse_assessment_sessions(student_id);

CREATE FUNCTION edupulse_private.topic_results(content jsonb, points jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('topic',topic,'score',score,'max_score',max_score)),'[]') FROM (
 SELECT q->>'topic' topic,sum(coalesce((points->>(n-1)::int)::int,0)) score,count(*) max_score
 FROM jsonb_array_elements(content->'questions') WITH ORDINALITY AS x(q,n)
 WHERE length(coalesce(q->>'topic',''))>0 GROUP BY q->>'topic' ORDER BY q->>'topic') grouped
$$;
REVOKE ALL ON FUNCTION edupulse_private.topic_results(jsonb,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.edupulse_assessment_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; a public.edupulse_attempts; session public.edupulse_assessment_sessions; keys jsonb; responses jsonb; points jsonb:='[]'; q jsonb; policy jsonb; i integer; n integer; mark integer; total integer:=0; pending boolean:=false; role text:=coalesce(edupulse_private.academic_role(),''); op text:=command->>'operation'; reason text:=trim(coalesce(command->>'reason','')); allowed integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 IF op IN ('grade','appeal') THEN
  SELECT * INTO a FROM public.edupulse_attempts WHERE id=(command->>'attempt')::uuid FOR UPDATE;
  SELECT * INTO p FROM public.edupulse_publications WHERE id=a.publication_id;
  IF op='appeal' THEN
   IF role<>'student' OR a.student_id IS DISTINCT FROM auth.uid() OR length(reason) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Own attempt and appeal reason required' USING ERRCODE='42501'; END IF;
   UPDATE public.edupulse_attempts SET appeal=reason WHERE id=a.id;
   INSERT INTO public.edupulse_notices(recipient_id,actor_id,publication_id,title,detail,path) VALUES(a.instructor_id,auth.uid(),p.id,'Assessment appeal: '||p.title,reason,'/student-monitoring');
   RETURN jsonb_build_object('saved',true);
  END IF;
  IF role NOT IN ('instructor','admin') OR a.instructor_id IS DISTINCT FROM auth.uid() OR p.source_version<>a.source_version OR length(reason) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Owned current attempt and review reason required' USING ERRCODE='42501'; END IF;
  points:=command->'points';
  IF jsonb_typeof(points) IS DISTINCT FROM 'array' OR jsonb_array_length(points)<>a.max_score THEN RAISE EXCEPTION 'Review each question' USING ERRCODE='22023'; END IF;
  FOR i IN 0..a.max_score-1 LOOP IF jsonb_typeof(points->i)<>'number' OR (points->>i)::numeric NOT IN (0,1) THEN RAISE EXCEPTION 'Each question is worth zero or one point' USING ERRCODE='22023'; END IF; total:=total+(points->>i)::int; END LOOP;
  UPDATE public.edupulse_attempts SET score=total,question_scores=points,topic_scores=edupulse_private.topic_results(p.content,points),grading_status='graded',reviewed_at=now() WHERE id=a.id RETURNING * INTO a;
  INSERT INTO public.edupulse_notices(recipient_id,actor_id,publication_id,title,detail,path) VALUES(a.student_id,auth.uid(),p.id,'Assessment reviewed: '||p.title,reason,'/performance');
  INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'assessment_review',p.title,reason);
  RETURN to_jsonb(a);
 END IF;
 IF role<>'student' THEN RAISE EXCEPTION 'Student required' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=command->>'publication' FOR SHARE;
 IF p.id IS NULL OR p.type<>'assessment' OR NOT p.active OR p.source_version<>command->>'version' OR p.release_at>now() OR NOT EXISTS(SELECT 1 FROM public.edupulse_courses c JOIN public.edupulse_enrollments e ON e.course_id=c.id WHERE c.id=p.course_id AND c.active AND e.student_email=lower(auth.jwt()->>'email')) THEN RAISE EXCEPTION 'Released enrolled assessment required' USING ERRCODE='42501'; END IF;
 policy:=coalesce(p.content->'assessmentPolicy','{}');allowed:=least(3,greatest(1,coalesce((policy->>'maxAttempts')::int,1)));
 PERFORM pg_advisory_xact_lock(hashtext(p.id||auth.uid()::text));
 SELECT * INTO a FROM public.edupulse_attempts WHERE publication_id=p.id AND student_id=auth.uid() AND source_version=p.source_version ORDER BY attempt_no DESC LIMIT 1;
 n:=CASE WHEN coalesce((command->>'retake')::boolean,false) THEN coalesce(a.attempt_no,0)+1 ELSE coalesce(a.attempt_no,1) END;
 IF op='start' THEN
  IF n>allowed OR (p.due_at<now() AND (a.id IS NULL OR coalesce((command->>'retake')::boolean,false))) OR (a.grading_status='pending_review' AND coalesce((command->>'retake')::boolean,false)) THEN RAISE EXCEPTION 'Assessment is closed, awaiting marking or attempt limit reached' USING ERRCODE='22023'; END IF;
  INSERT INTO public.edupulse_assessment_sessions(publication_id,student_id,source_version,attempt_no) VALUES(p.id,auth.uid(),p.source_version,n) ON CONFLICT DO NOTHING;
  SELECT * INTO session FROM public.edupulse_assessment_sessions WHERE publication_id=p.id AND student_id=auth.uid() AND source_version=p.source_version AND attempt_no=n;
  RETURN to_jsonb(session)||jsonb_build_object('max_attempts',allowed,'duration_seconds',coalesce((policy->>'durationSeconds')::int,0),'due_at',p.due_at);
 END IF;
 IF op<>'submit' THEN RAISE EXCEPTION 'Invalid operation' USING ERRCODE='22023'; END IF;
 SELECT * INTO session FROM public.edupulse_assessment_sessions WHERE id=(command->>'session')::uuid AND publication_id=p.id AND student_id=auth.uid() AND source_version=p.source_version;
 IF session.id IS NULL THEN RAISE EXCEPTION 'Start this assessment first' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.edupulse_attempts WHERE publication_id=p.id AND student_id=auth.uid() AND source_version=p.source_version AND attempt_no=session.attempt_no;
 IF a.id IS NOT NULL THEN RETURN to_jsonb(a); END IF;
 IF session.attempt_no>allowed OR p.due_at<now() OR (coalesce((policy->>'durationSeconds')::int,0)>0 AND now()>session.started_at+make_interval(secs=>(policy->>'durationSeconds')::int)+interval '5 seconds') THEN RAISE EXCEPTION 'Assessment deadline or time limit reached' USING ERRCODE='22023'; END IF;
 SELECT answers INTO keys FROM edupulse_private.assessment_keys WHERE publication_id=p.id AND source_version=p.source_version;
 responses:=command->'responses';
 IF keys IS NULL OR jsonb_typeof(responses) IS DISTINCT FROM 'array' OR jsonb_array_length(responses)<>jsonb_array_length(keys) THEN RAISE EXCEPTION 'Answer every question' USING ERRCODE='22023'; END IF;
 FOR i IN 0..jsonb_array_length(keys)-1 LOOP
  q:=p.content->'questions'->i;mark:=0;
  IF q->>'type'='short_answer' THEN
   IF jsonb_typeof(responses->i)<>'string' OR length(trim(responses->>i)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Written response required' USING ERRCODE='22023'; END IF;pending:=true;
  ELSE
   IF jsonb_typeof(responses->i)<>'number' OR ((responses->>i)::numeric<0 OR (responses->>i)::numeric>=jsonb_array_length(q->'options') OR (responses->>i)::numeric<>trunc((responses->>i)::numeric)) THEN RAISE EXCEPTION 'Invalid objective response' USING ERRCODE='22023'; END IF;
   IF responses->i=keys->i THEN mark:=1; END IF;
  END IF;
  total:=total+mark;points:=points||jsonb_build_array(mark);
 END LOOP;
 INSERT INTO public.edupulse_attempts(publication_id,instructor_id,student_id,source_version,answers,score,max_score,attempt_no,question_scores,topic_scores,grading_status)
 VALUES(p.id,p.instructor_id,auth.uid(),p.source_version,responses,total,jsonb_array_length(keys),session.attempt_no,points,CASE WHEN pending THEN '[]'::jsonb ELSE edupulse_private.topic_results(p.content,points) END,CASE WHEN pending THEN 'pending_review' ELSE 'graded' END) RETURNING * INTO a;
 RETURN to_jsonb(a);
END $$;
REVOKE ALL ON FUNCTION public.edupulse_assessment_command(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_assessment_command(jsonb) TO authenticated;

-- Legacy clients remain single-attempt, but cannot bypass scheduled/time-limited policies.
CREATE OR REPLACE FUNCTION public.edupulse_academic_action(publication text, version text, responses jsonb DEFAULT '[]', operation text DEFAULT 'open') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; started jsonb;
BEGIN
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication;
 IF p.id IS NULL OR p.release_at>now() OR (operation='submit' AND p.due_at<now()) THEN RAISE EXCEPTION 'Released material required' USING ERRCODE='42501'; END IF;
 IF operation='submit' THEN
  started:=public.edupulse_assessment_command(jsonb_build_object('operation','start','publication',publication,'version',version));
  RETURN public.edupulse_assessment_command(jsonb_build_object('operation','submit','publication',publication,'version',version,'responses',responses,'session',started->>'id'));
 END IF;
 RETURN edupulse_private.academic_action(publication,version,responses,operation);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.academic_action(text,text,jsonb,text) FROM authenticated;
