-- R-I7 (G10): an assessment may hold 3 to 200 questions so generated sets of 50 or more items,
-- and courseware-pack drafts with one question per marking point, can be published. Keys, scoring
-- and attempts already work per question; only the publishing bound changes.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.project_workspace()'::regprocedure);
 IF strpos(definition,'jsonb_array_length(public_content->''questions'') NOT BETWEEN 3 AND 5')=0 THEN
  RAISE EXCEPTION 'Assessment capacity patch unavailable';
 END IF;
 definition:=replace(definition,'jsonb_array_length(public_content->''questions'') NOT BETWEEN 3 AND 5','jsonb_array_length(public_content->''questions'') NOT BETWEEN 3 AND 200');
 EXECUTE definition;
END $$;
