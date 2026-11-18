-- Course catalog lifecycle does not delete or suspend existing loads, syllabi or learner records.
-- Suspended/removed courses cannot receive new loads, including through imports or direct table writes.
CREATE FUNCTION edupulse_private.guard_course_catalog() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE previous_status text; next_status text; catalog_status text;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.kind='courses' THEN RAISE EXCEPTION 'Remove a suspended course through Course actions. Course history is retained.' USING ERRCODE='22023'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.kind='courses' AND (NEW.kind<>OLD.kind OR NEW.record_key<>OLD.record_key OR NEW.data->>'CourseCode' IS DISTINCT FROM OLD.data->>'CourseCode') THEN
  RAISE EXCEPTION 'A recorded course code cannot be changed. Edit its title instead.' USING ERRCODE='22023';
 END IF;
 IF NEW.kind='courses' THEN
  IF NEW.record_key IS DISTINCT FROM NEW.data->>'CourseCode' THEN RAISE EXCEPTION 'The course code must match its recorded identity.' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.edupulse_institutional_records c WHERE c.kind='courses' AND c.record_key<>NEW.record_key AND edupulse_private.dean_code_key(c.record_key)=edupulse_private.dean_code_key(NEW.record_key)) THEN RAISE EXCEPTION 'A course already uses this code.' USING ERRCODE='22023'; END IF;
  previous_status:=CASE WHEN TG_OP='UPDATE' THEN coalesce(OLD.data->>'Status','active') ELSE 'active' END;
  -- Older imports do not carry lifecycle fields; preserve them rather than implicitly reactivate a course.
  IF TG_OP='UPDATE' THEN NEW.data:=OLD.data||NEW.data; END IF;
  next_status:=coalesce(NEW.data->>'Status','active');
  IF next_status NOT IN ('active','suspended','removed') THEN RAISE EXCEPTION 'Invalid course status' USING ERRCODE='22023'; END IF;
  IF previous_status='removed' AND NEW.data IS DISTINCT FROM OLD.data THEN RAISE EXCEPTION 'This course was removed. Its code is reserved for its history.' USING ERRCODE='22023'; END IF;
  IF next_status='removed' AND (TG_OP='INSERT' OR previous_status NOT IN ('suspended','removed')) THEN RAISE EXCEPTION 'Suspend the course before removing it.' USING ERRCODE='22023'; END IF;
 ELSIF NEW.kind='loads' AND (TG_OP='INSERT' OR NEW.record_key IS DISTINCT FROM OLD.record_key OR NEW.data->>'InstructorID' IS DISTINCT FROM OLD.data->>'InstructorID' OR NEW.data->>'CourseCode' IS DISTINCT FROM OLD.data->>'CourseCode' OR NEW.data->>'Block' IS DISTINCT FROM OLD.data->>'Block' OR NEW.data->>'Semester' IS DISTINCT FROM OLD.data->>'Semester' OR NEW.data->>'AcademicYear' IS DISTINCT FROM OLD.data->>'AcademicYear') THEN
  SELECT data->>'Status' INTO catalog_status FROM public.edupulse_institutional_records
   WHERE kind='courses' AND edupulse_private.dean_code_key(data->>'CourseCode')=edupulse_private.dean_code_key(NEW.data->>'CourseCode') LIMIT 1;
  IF catalog_status IN ('suspended','removed') THEN RAISE EXCEPTION 'This course is %. Reactivate a suspended course before loading it.',catalog_status USING ERRCODE='22023'; END IF;
 END IF;
 RETURN NEW;
END $$;

-- Confirmed curriculum imports may edit metadata, but cannot reset catalog lifecycle state.
DO $$ DECLARE definition text; BEGIN
 IF to_regprocedure('public.edupulse_import_records(text,jsonb,text)') IS NULL THEN RETURN; END IF;
 definition:=pg_get_functiondef('public.edupulse_import_records(text,jsonb,text)'::regprocedure);
 definition:=replace(definition,'FOR r IN SELECT value FROM jsonb_array_elements(rows) LOOP',
  'FOR r IN SELECT value FROM jsonb_array_elements(rows) LOOP IF kind=''courses'' THEN r:=r-''Status''; END IF;');
 IF strpos(definition,'r:=r-''Status''')=0 THEN RAISE EXCEPTION 'Course import lifecycle patch unavailable'; END IF;
 EXECUTE definition;
END $$;

REVOKE ALL ON FUNCTION edupulse_private.guard_course_catalog() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER edupulse_course_catalog_guard BEFORE INSERT OR UPDATE OR DELETE ON public.edupulse_institutional_records
FOR EACH ROW EXECUTE FUNCTION edupulse_private.guard_course_catalog();

-- The catalog title is the display name; original instructor files and content remain untouched.
CREATE FUNCTION edupulse_private.catalog_course_title() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE title text;
BEGIN
 SELECT data->>'CourseTitle' INTO title FROM public.edupulse_institutional_records
 WHERE kind='courses' AND edupulse_private.dean_code_key(data->>'CourseCode')=edupulse_private.dean_code_key(NEW.course_code) LIMIT 1;
 IF coalesce(title,'')<>'' THEN NEW.course_title:=title; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.catalog_course_title() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER edupulse_catalog_course_title BEFORE INSERT OR UPDATE OF course_code,course_title ON public.edupulse_courses
FOR EACH ROW EXECUTE FUNCTION edupulse_private.catalog_course_title();

CREATE FUNCTION edupulse_private.dean_catalog_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_action text:=command->>'action'; fields jsonb:=command->'course'; code text; title text; units numeric; year integer; semester text;
 target public.edupulse_institutional_records; expected timestamptz; v_status text; saved timestamptz;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 IF v_action IN ('course.create','course.update') THEN
  title:=edupulse_private.dean_clean(fields->>'title',300); semester:=edupulse_private.dean_clean(fields->>'semester',60);
  IF title='' OR semester='' OR coalesce(fields->>'year','') !~ '^[1-4]$' OR coalesce(fields->>'units','') !~ '^[0-9]{1,2}(\.[05])?$' THEN RAISE EXCEPTION 'Enter a course title, 0-30 units, year level 1-4 and semester.' USING ERRCODE='22023'; END IF;
  units:=(fields->>'units')::numeric; year:=(fields->>'year')::integer;
  IF units>30 OR mod(units,0.5)<>0 THEN RAISE EXCEPTION 'Course units must be 0-30 in half-unit increments.' USING ERRCODE='22023'; END IF;
 END IF;
 IF v_action='course.create' THEN
  code:=upper(edupulse_private.dean_clean(fields->>'code',40));
  IF code !~ '^[A-Z0-9][A-Z0-9 .&()/_-]{0,39}$' THEN RAISE EXCEPTION 'Enter a valid course code (up to 40 characters).' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.edupulse_institutional_records WHERE kind='courses' AND edupulse_private.dean_code_key(record_key)=edupulse_private.dean_code_key(code))
   OR EXISTS(SELECT 1 FROM public.edupulse_courses WHERE edupulse_private.dean_code_key(course_code)=edupulse_private.dean_code_key(code)) THEN RAISE EXCEPTION 'A course already uses this code. Edit or reactivate the existing course.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at)
   VALUES('courses',code,jsonb_build_object('CourseCode',code,'CourseTitle',title,'Units',units::text,'YearLevel',year::text,'Semester',semester,'Status','active'),auth.uid(),clock_timestamp()) RETURNING updated_at INTO saved;
 ELSE
  SELECT * INTO target FROM public.edupulse_institutional_records WHERE kind='courses' AND record_key=command->>'code' FOR UPDATE;
  IF target.record_key IS NULL THEN RAISE EXCEPTION 'This course is no longer available.' USING ERRCODE='22023'; END IF;
  BEGIN expected:=(command->>'expected_updated_at')::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RAISE EXCEPTION 'A current course version is required.' USING ERRCODE='22023'; END;
  IF expected IS NULL OR expected IS DISTINCT FROM target.updated_at THEN RAISE EXCEPTION 'This course changed. Close this dialog and reload the course before trying again.' USING ERRCODE='40001'; END IF;
  code:=target.record_key; v_status:=coalesce(target.data->>'Status','active');
  IF v_status='removed' THEN RAISE EXCEPTION 'This course was removed. Its history is retained.' USING ERRCODE='22023'; END IF;
  IF v_action='course.update' THEN
   UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('CourseTitle',title,'Units',units::text,'YearLevel',year::text,'Semester',semester),updated_by=auth.uid(),updated_at=greatest(clock_timestamp(),target.updated_at+interval '1 microsecond')
    WHERE kind='courses' AND record_key=code RETURNING updated_at INTO saved;
   UPDATE public.edupulse_courses SET course_title=title WHERE edupulse_private.dean_code_key(course_code)=edupulse_private.dean_code_key(code);
  ELSIF v_action='course.status' THEN
   IF coalesce(command->>'status','') NOT IN ('active','suspended','removed') THEN RAISE EXCEPTION 'Choose a valid course status.' USING ERRCODE='22023'; END IF;
   IF command->>'status'='removed' AND v_status<>'suspended' THEN RAISE EXCEPTION 'Suspend the course before removing it.' USING ERRCODE='22023'; END IF;
   UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('Status',command->>'status'),updated_by=auth.uid(),updated_at=greatest(clock_timestamp(),target.updated_at+interval '1 microsecond')
    WHERE kind='courses' AND record_key=code RETURNING updated_at INTO saved;
  ELSE RAISE EXCEPTION 'Unsupported course action' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'courses',CASE v_action WHEN 'course.create' THEN 'Course added' WHEN 'course.update' THEN 'Course edited' ELSE 'Course '||CASE command->>'status' WHEN 'active' THEN 'reactivated' ELSE command->>'status' END END,code);
 RETURN jsonb_build_object('code',code,'updated_at',saved);
END $$;
REVOKE ALL ON FUNCTION edupulse_private.dean_catalog_command(jsonb) FROM PUBLIC,anon,authenticated;

DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 definition:=replace(definition,'CASE v_action',$patch$CASE v_action
 WHEN 'course.create','course.update','course.status' THEN RETURN edupulse_private.dean_catalog_command(command);$patch$);
 IF strpos(definition,'dean_catalog_command(command)')=0 THEN RAISE EXCEPTION 'Course catalog command patch unavailable'; END IF;
 EXECUTE definition;
END $$;
