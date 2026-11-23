-- Immediate answer review after a recorded assessment submission (owner specification I3).
-- A student reads, for their own submitted attempt only: each question's result, the answer key and the
-- instructor's explanation. Keys stay in edupulse_private; nothing is released while the student still has an
-- unsubmitted attempt open, and written responses stay "awaiting review" until the instructor marks them.
-- Explanations come from the instructor's saved item only when it is the exact version the student answered.
CREATE FUNCTION public.edupulse_attempt_feedback(attempt uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.edupulse_attempts; p public.edupulse_publications; k edupulse_private.assessment_keys; source jsonb; duration integer; items jsonb:='[]'; q jsonb; i integer; mark integer; status text; same boolean;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'')<>'student' THEN RAISE EXCEPTION 'Student account required' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.edupulse_attempts WHERE id=attempt;
 IF a.id IS NULL OR a.student_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Your own submitted attempt is required' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=a.publication_id;
 duration:=coalesce((p.content->'assessmentPolicy'->>'durationSeconds')::int,0);
 -- A later attempt that is started, unsubmitted and still submittable keeps the key hidden.
 IF EXISTS(SELECT 1 FROM public.edupulse_assessment_sessions s
  WHERE s.publication_id=a.publication_id AND s.student_id=auth.uid() AND s.source_version=a.source_version AND s.attempt_no>a.attempt_no
   AND NOT EXISTS(SELECT 1 FROM public.edupulse_attempts x WHERE x.publication_id=s.publication_id AND x.student_id=s.student_id AND x.source_version=s.source_version AND x.attempt_no=s.attempt_no)
   AND (p.due_at IS NULL OR p.due_at>=now())
   AND (duration=0 OR now()<=s.started_at+make_interval(secs=>duration)+interval '5 seconds'))
 THEN RAISE EXCEPTION 'Submit your current attempt before reviewing answers' USING ERRCODE='22023'; END IF;
 SELECT * INTO k FROM edupulse_private.assessment_keys WHERE publication_id=a.publication_id;
 IF p.id IS NULL OR k.publication_id IS NULL OR k.source_version<>a.source_version OR p.source_version<>a.source_version THEN
  RETURN jsonb_build_object('attempt',a.id,'available',false,'reason','This assessment was revised after your attempt, so its answer review is no longer available. Your recorded score is unchanged.');
 END IF;
 SELECT w.data->'content'->p.workspace_item_id->'content' INTO source FROM public.edupulse_workspaces w WHERE w.owner_id=p.instructor_id;
 same:=source IS NOT NULL AND md5(source::text)=a.source_version;
 FOR i IN 0..jsonb_array_length(k.answers)-1 LOOP
  q:=p.content->'questions'->i;
  mark:=coalesce((a.question_scores->>i)::int,CASE WHEN a.answers->i=k.answers->i THEN 1 ELSE 0 END);
  status:=CASE WHEN q->>'type'='short_answer' AND a.grading_status='pending_review' THEN 'awaiting_review' WHEN mark=1 THEN 'correct' ELSE 'incorrect' END;
  items:=items||jsonb_build_array(jsonb_build_object('index',i,'type',coalesce(q->>'type','multiple_choice'),'response',a.answers->i,'correctIndex',k.answers->i,'status',status,
   'explanation',CASE WHEN same THEN nullif(trim(coalesce(source->'questions'->i->>'explanation','')),'') END));
 END LOOP;
 RETURN jsonb_build_object('attempt',a.id,'available',true,'explanations',same,'grading_status',a.grading_status,'questions',items);
END $$;
REVOKE ALL ON FUNCTION public.edupulse_attempt_feedback(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_attempt_feedback(uuid) TO authenticated;
