-- Keep the source's descriptive title separately from a reviewed catalog mapping.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.dean_import_load_document(jsonb)'::regprocedure);
 definition:=replace(definition,'''SourceSubjectCode'',entry->>''subject_code'',',
  '''SourceSubjectCode'',entry->>''subject_code'',''SourceCourseTitle'',edupulse_private.dean_clean(coalesce(entry->>''source_title'',entry->>''course_title''),300),');
 IF strpos(definition,'''SourceCourseTitle''')=0 THEN RAISE EXCEPTION 'Source title patch unavailable'; END IF;
 EXECUTE definition;
END $$;
