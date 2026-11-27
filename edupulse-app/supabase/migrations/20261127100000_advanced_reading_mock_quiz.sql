-- Mock quizzes from instructor-marked advanced reading (R-S3, G6 T6.2).
-- A material is advanced reading when its delivered content carries advancedReading=true.
ALTER TABLE public.edupulse_practice_sets DROP CONSTRAINT IF EXISTS edupulse_practice_sets_source_kind_check;
ALTER TABLE public.edupulse_practice_sets ADD CONSTRAINT edupulse_practice_sets_source_kind_check
 CHECK (source_kind IN ('reading','assessment','advanced'));

DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.practice_action(jsonb)'::regprocedure);
 definition:=replace(definition,$f$ELSE type<>'assessment' END AND source_version=input->>'version'$f$,
  $r$WHEN input->>'sourceKind'='advanced' THEN type<>'assessment' AND content->>'advancedReading'='true' ELSE type<>'assessment' END AND source_version=input->>'version'$r$);
 definition:=replace(definition,$f$CASE WHEN p.type='assessment' THEN 'assessment' ELSE 'reading' END$f$,
  $r$CASE WHEN p.type='assessment' THEN 'assessment' WHEN input->>'sourceKind'='advanced' THEN 'advanced' ELSE 'reading' END$r$);
 IF strpos(definition,'content->>''advancedReading''=''true''')=0 OR strpos(definition,'THEN ''advanced'' ELSE ''reading'' END')=0 THEN
  RAISE EXCEPTION 'Advanced reading practice patch unavailable';
 END IF;
 EXECUTE definition;
END $$;
