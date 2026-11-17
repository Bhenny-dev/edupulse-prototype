-- Retired placeholders are not selectable teachers. A current account ban must
-- block every load assignment, including legacy CSV/manual and reviewed PDFs.
DO $$ DECLARE definition text; original text; BEGIN
 original:=pg_get_functiondef('edupulse_private.dean_directory()'::regprocedure);
 definition:=replace(original,
  'WHERE u.raw_app_meta_data->>''role''=''instructor''',
  'WHERE u.raw_app_meta_data->>''role''=''instructor'' AND u.banned_until IS DISTINCT FROM ''infinity''::timestamptz');
 definition:=replace(definition,
  'WHEN u.raw_app_meta_data->>''suspended''=''true'' THEN',
  'WHEN u.raw_app_meta_data->>''suspended''=''true'' OR u.banned_until>now() THEN');
 IF definition=original OR strpos(definition,'u.banned_until IS DISTINCT FROM ''infinity''::timestamptz')=0 OR strpos(definition,'OR u.banned_until>now()')=0 THEN
  RAISE EXCEPTION 'Active teaching directory patch unavailable';
 END IF;
 EXECUTE definition;
 original:=pg_get_functiondef('edupulse_private.dean_assign_loads(jsonb,text)'::regprocedure);
 definition:=replace(original,
  'IF teacher.raw_app_meta_data->>''suspended''=''true'' THEN',
  'IF teacher.raw_app_meta_data->>''suspended''=''true'' OR teacher.banned_until>now() THEN');
 IF definition=original THEN RAISE EXCEPTION 'Active teaching load guard unavailable'; END IF;
 EXECUTE definition;
END $$;
