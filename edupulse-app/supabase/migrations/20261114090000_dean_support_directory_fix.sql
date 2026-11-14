-- The admin "view as Dean" support function is SECURITY INVOKER, so it must reach the Dean
-- directory through the granted public entry point, not the private function.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'edupulse_private.dean_directory()','public.edupulse_dean_command(''{"action":"directory"}''::jsonb)');
 IF strpos(definition,'edupulse_private.dean_directory')>0 OR strpos(definition,'"action":"directory"')=0 THEN RAISE EXCEPTION 'Dean support directory patch unavailable'; END IF;
 EXECUTE definition;
END $$;

-- The System Admin may use every Dean action directly (role bypass); suspended or other roles may not.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 definition:=replace(definition,'coalesce(edupulse_private.academic_role(),'''')<>''dean''','coalesce(edupulse_private.academic_role(),'''') NOT IN (''dean'',''admin'')');
 IF strpos(definition,'NOT IN (''dean'',''admin'')')=0 THEN RAISE EXCEPTION 'Dean command patch unavailable'; END IF;
 EXECUTE definition;
 definition:=pg_get_functiondef('edupulse_private.dean_directory()'::regprocedure);
 definition:=replace(definition,'coalesce(edupulse_private.academic_role(),'''')<>''dean''','coalesce(edupulse_private.academic_role(),'''') NOT IN (''dean'',''admin'')');
 IF strpos(definition,'NOT IN (''dean'',''admin'')')=0 THEN RAISE EXCEPTION 'Dean directory patch unavailable'; END IF;
 EXECUTE definition;
END $$;
