-- Keep malformed direct RPC payloads out of self-practice storage as well as the API.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.practice_action(jsonb)'::regprocedure);
 definition:=replace(definition,'IF edupulse_private.academic_role()<>''student''','IF edupulse_private.academic_role() IS DISTINCT FROM ''student''');
 definition:=replace(definition,'OR length(input->>''title'') NOT BETWEEN','OR jsonb_typeof(input->''title'') IS DISTINCT FROM ''string'' OR length(input->>''title'') NOT BETWEEN');
 definition:=replace(definition,'OR length(q->>''text'') NOT BETWEEN','OR jsonb_typeof(q->''text'') IS DISTINCT FROM ''string'' OR length(q->>''text'') NOT BETWEEN');
 EXECUTE definition;
END $$;
