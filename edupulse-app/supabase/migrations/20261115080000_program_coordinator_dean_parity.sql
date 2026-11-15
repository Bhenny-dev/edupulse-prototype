-- The Program Coordinator uses the same Course, Instructors and Students pages and actions as the Dean.
-- Dean, Program Coordinator and System Admin accounts remain outside these actions' targets.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 definition:=replace(definition,'NOT IN (''dean'',''admin'')','NOT IN (''dean'',''associate_dean'',''admin'')');
 IF strpos(definition,'''associate_dean'',''admin''')=0 THEN RAISE EXCEPTION 'Dean command patch unavailable'; END IF;
 EXECUTE definition;
 definition:=pg_get_functiondef('edupulse_private.dean_directory()'::regprocedure);
 definition:=replace(definition,'NOT IN (''dean'',''admin'')','NOT IN (''dean'',''associate_dean'',''admin'')');
 IF strpos(definition,'''associate_dean'',''admin''')=0 THEN RAISE EXCEPTION 'Dean directory patch unavailable'; END IF;
 EXECUTE definition;
END $$;

-- Admin "view as" support mode: allow the same commands and directory for a Program Coordinator subject.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'IF subject_role<>''dean'' THEN RAISE EXCEPTION ''Dean account required''','IF subject_role NOT IN (''dean'',''associate_dean'') THEN RAISE EXCEPTION ''Dean account required''');
 definition:=replace(definition,'CASE WHEN subject_role=''dean'' THEN public.edupulse_dean_command(','CASE WHEN subject_role IN (''dean'',''associate_dean'') THEN public.edupulse_dean_command(');
 IF strpos(definition,'subject_role NOT IN (''dean'',''associate_dean'')')=0 OR strpos(definition,'subject_role IN (''dean'',''associate_dean'') THEN public.edupulse_dean_command(')=0 THEN RAISE EXCEPTION 'Support patch unavailable'; END IF;
 EXECUTE definition;
END $$;
