-- Self-practice from a quiz the student already submitted (R-S3, G6 T6.1).
-- The practice set records the quiz as its source. The API writes the questions from the
-- teaching the quiz covers; official items and keys never reach the set.
ALTER TABLE public.edupulse_practice_sets ADD COLUMN source_kind text NOT NULL DEFAULT 'reading'
 CHECK (source_kind IN ('reading','assessment'));

DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.practice_action(jsonb)'::regprocedure);
 -- A finished quiz may be past its block window; the submitted attempt proves access.
 definition:=replace(definition,$f$IF input->>'operation'='create' AND NOT edupulse_private.publication_window_open(input->>'publication')$f$,
  $r$IF input->>'operation'='create' AND input->>'sourceKind' IS DISTINCT FROM 'assessment' AND NOT edupulse_private.publication_window_open(input->>'publication')$r$);
 definition:=replace(definition,$f$AND active AND type<>'assessment' AND source_version=input->>'version'$f$,
  $r$AND active AND CASE WHEN input->>'sourceKind'='assessment' THEN type='assessment' AND EXISTS(SELECT 1 FROM public.edupulse_attempts a WHERE a.publication_id=public.edupulse_publications.id AND a.student_id=auth.uid()) ELSE type<>'assessment' END AND source_version=input->>'version'$r$);
 definition:=replace(definition,'title,questions,is_test)','title,questions,is_test,source_kind)');
 definition:=replace(definition,'clean,actor IS NOT NULL)',$r$clean,actor IS NOT NULL,CASE WHEN p.type='assessment' THEN 'assessment' ELSE 'reading' END)$r$);
 IF (strpos(definition,'publication_window_open')>0 AND strpos(definition,'sourceKind'' IS DISTINCT FROM')=0) OR strpos(definition,'a.student_id=auth.uid()')=0 OR strpos(definition,'is_test,source_kind)')=0 OR strpos(definition,'ELSE ''reading'' END)')=0 THEN
  RAISE EXCEPTION 'Finished-quiz practice patch unavailable';
 END IF;
 EXECUTE definition;
END $$;
