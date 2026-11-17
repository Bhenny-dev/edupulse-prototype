-- Qualify the function argument so the inherited-file relation's path column
-- cannot shadow it when Dean/Coordinator Storage RLS checks an original file.
DO $$ DECLARE original text; definition text; BEGIN
 original:=pg_get_functiondef('edupulse_private.dean_scan_teaching_file(text)'::regprocedure);
 definition:=replace(original,'f.path=path','f.path=dean_scan_teaching_file.path');
 IF definition=original THEN RAISE EXCEPTION 'Inherited file inspection patch unavailable'; END IF;
 EXECUTE definition;
END $$;
