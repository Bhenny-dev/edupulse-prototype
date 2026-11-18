-- A course's catalog metadata belongs to a semester; its class year belongs to learners.
CREATE FUNCTION edupulse_private.canonical_semester(value text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN btrim(coalesce(value,''))~*'^(1|first)' THEN '1st Semester' WHEN btrim(coalesce(value,''))~*'^(2|second)' THEN '2nd Semester' WHEN value~*'summer' THEN 'Summer' ELSE btrim(coalesce(value,'')) END
$$;
CREATE FUNCTION edupulse_private.editable_course_term(year text,semester text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(year='2026-2027' AND edupulse_private.canonical_semester(semester) IN ('1st Semester','2nd Semester'),false)
$$;
REVOKE ALL ON FUNCTION edupulse_private.canonical_semester(text),edupulse_private.editable_course_term(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.canonical_semester(text),edupulse_private.editable_course_term(text,text) TO authenticated;

ALTER TABLE public.edupulse_institutional_records DROP CONSTRAINT edupulse_institutional_records_kind_check;
ALTER TABLE public.edupulse_institutional_records ADD CONSTRAINT edupulse_institutional_records_kind_check CHECK(kind IN ('courses','course_terms','loads','rosters','irregular'));

-- Copy only existing curriculum metadata into its recorded semester. No loads or learners are created.
INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at)
 SELECT 'course_terms',concat_ws('|',record_key,edupulse_private.canonical_semester(data->>'Semester'),coalesce(nullif(data->>'AcademicYear',''),'2026-2027')),
 jsonb_build_object('CourseCode',data->>'CourseCode','CourseTitle',data->>'CourseTitle','Units',coalesce(data->>'Units',''),'AcademicYear',coalesce(nullif(data->>'AcademicYear',''),'2026-2027'),'Semester',edupulse_private.canonical_semester(data->>'Semester'),'Status',coalesce(data->>'Status','active')),
 updated_by,updated_at FROM public.edupulse_institutional_records WHERE kind='courses' AND edupulse_private.canonical_semester(data->>'Semester') IN ('1st Semester','2nd Semester','Summer') ON CONFLICT DO NOTHING;

-- Existing historical loads remain visible with a frozen copy of their recorded labels.
INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at)
 SELECT DISTINCT ON(l.data->>'CourseCode',l.data->>'AcademicYear',edupulse_private.canonical_semester(l.data->>'Semester')) 'course_terms',
 concat_ws('|',l.data->>'CourseCode',edupulse_private.canonical_semester(l.data->>'Semester'),l.data->>'AcademicYear'),
 jsonb_build_object('CourseCode',l.data->>'CourseCode','CourseTitle',coalesce(nullif(l.data->>'CourseTitle',''),c.data->>'CourseTitle',l.data->>'CourseCode'),'Units',coalesce(l.data->>'Units',c.data->>'Units',''),'AcademicYear',l.data->>'AcademicYear','Semester',edupulse_private.canonical_semester(l.data->>'Semester'),'Status','active'),l.updated_by,l.updated_at
 FROM public.edupulse_institutional_records l LEFT JOIN public.edupulse_institutional_records c ON c.kind='courses' AND c.record_key=l.data->>'CourseCode'
 WHERE l.kind='loads' AND coalesce(l.data->>'AcademicYear','')~'^20[0-9]{2}-20[0-9]{2}$' AND edupulse_private.canonical_semester(l.data->>'Semester') IN ('1st Semester','2nd Semester','Summer')
 ORDER BY l.data->>'CourseCode',l.data->>'AcademicYear',edupulse_private.canonical_semester(l.data->>'Semester'),l.updated_at DESC ON CONFLICT DO NOTHING;

CREATE FUNCTION edupulse_private.guard_term_records() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 IF TG_OP='DELETE' AND OLD.kind='course_terms' THEN RAISE EXCEPTION 'Suspend and remove the semester course through its actions. History is retained.' USING ERRCODE='22023';END IF;
 IF TG_OP='UPDATE' AND OLD.kind='course_terms' AND (NEW.kind<>OLD.kind OR NEW.record_key<>OLD.record_key OR NEW.data->>'CourseCode' IS DISTINCT FROM OLD.data->>'CourseCode' OR NEW.data->>'AcademicYear' IS DISTINCT FROM OLD.data->>'AcademicYear' OR NEW.data->>'Semester' IS DISTINCT FROM OLD.data->>'Semester') THEN RAISE EXCEPTION 'A semester course identity cannot be changed.' USING ERRCODE='22023';END IF;
 IF TG_OP IN ('UPDATE','DELETE') AND OLD.kind IN ('loads','course_terms') AND NOT edupulse_private.editable_course_term(coalesce(nullif(OLD.data->>'AcademicYear',''),'2026-2027'),OLD.data->>'Semester') THEN
  RAISE EXCEPTION 'Completed or unassigned semesters are view-only. Choose the current or next semester.' USING ERRCODE='42501';
 END IF;
 IF TG_OP<>'DELETE' AND NEW.kind IN ('loads','course_terms') AND NOT edupulse_private.editable_course_term(coalesce(nullif(NEW.data->>'AcademicYear',''),'2026-2027'),NEW.data->>'Semester') THEN
  RAISE EXCEPTION 'Only the current or next semester can receive changes.' USING ERRCODE='42501';
 END IF;
 IF TG_OP<>'DELETE' AND NEW.kind='course_terms' THEN
  IF NEW.record_key<>concat_ws('|',NEW.data->>'CourseCode',edupulse_private.canonical_semester(NEW.data->>'Semester'),NEW.data->>'AcademicYear') OR coalesce(NEW.data->>'Status','active') NOT IN ('active','suspended','removed') THEN RAISE EXCEPTION 'Invalid semester course identity or status.' USING ERRCODE='22023';END IF;
  IF NEW.data->>'Status'='removed' AND (TG_OP='INSERT' OR OLD.data->>'Status' NOT IN ('suspended','removed')) THEN RAISE EXCEPTION 'Suspend the course before removing it.' USING ERRCODE='22023';END IF;
  IF TG_OP='UPDATE' AND OLD.data->>'Status'='removed' AND NEW.data IS DISTINCT FROM OLD.data THEN RAISE EXCEPTION 'This semester course was removed. Its history is retained.' USING ERRCODE='22023';END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.guard_term_records() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER aa_edupulse_term_records BEFORE INSERT OR UPDATE OR DELETE ON public.edupulse_institutional_records FOR EACH ROW EXECUTE FUNCTION edupulse_private.guard_term_records();

CREATE OR REPLACE FUNCTION edupulse_private.dean_catalog_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<catalog>>
DECLARE fields jsonb:=command->'course'; op text:=command->>'action'; code text; title text; units numeric; y text:=command->>'academic_year'; sem text:=edupulse_private.canonical_semester(command->>'semester');
 master public.edupulse_institutional_records; target public.edupulse_institutional_records; expected timestamptz; saved timestamptz; k text;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501';END IF;
 IF NOT edupulse_private.editable_course_term(y,sem) THEN RAISE EXCEPTION 'Choose the current or next semester. Previous semesters are view-only.' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 IF op IN ('course.create','course.update') THEN
  title:=edupulse_private.dean_clean(fields->>'title',300);
  IF title='' OR coalesce(fields->>'units','')!~'^[0-9]{1,2}(\.[05])?$' THEN RAISE EXCEPTION 'Enter the course code, title and 0-30 units.' USING ERRCODE='22023';END IF;
  units:=(fields->>'units')::numeric;IF units>30 OR mod(units,0.5)<>0 THEN RAISE EXCEPTION 'Course units must be 0-30 in half-unit increments.' USING ERRCODE='22023';END IF;
 END IF;
 code:=upper(edupulse_private.dean_clean(CASE WHEN op='course.create' THEN fields->>'code' ELSE command->>'code' END,40));
 IF code!~'^[A-Z0-9][A-Z0-9 .&()/_-]{0,39}$' THEN RAISE EXCEPTION 'Enter a valid course code (up to 40 characters).' USING ERRCODE='22023';END IF;
 SELECT * INTO master FROM public.edupulse_institutional_records r WHERE r.kind='courses' AND edupulse_private.dean_code_key(r.record_key)=edupulse_private.dean_code_key(code);
 IF master.record_key IS NOT NULL AND master.record_key<>code THEN RAISE EXCEPTION 'Use the recorded course code: %',master.record_key USING ERRCODE='22023';END IF;
 k:=concat_ws('|',code,sem,y);
 SELECT * INTO target FROM public.edupulse_institutional_records r WHERE r.kind='course_terms' AND r.record_key=k FOR UPDATE;
 IF op='course.create' THEN
  IF target.record_key IS NOT NULL THEN RAISE EXCEPTION 'This course already exists in the selected semester.' USING ERRCODE='22023';END IF;
  IF master.record_key IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.edupulse_courses c WHERE edupulse_private.dean_code_key(c.course_code)=edupulse_private.dean_code_key(code)) THEN RAISE EXCEPTION 'A retained teaching record already uses this code. Restore its catalog identity before adding it.' USING ERRCODE='22023';END IF;
   INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('courses',code,jsonb_build_object('CourseCode',code,'CourseTitle',title,'Units',units::text,'Status','active'),auth.uid());
  END IF;
  INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at) VALUES('course_terms',k,jsonb_build_object('CourseCode',code,'CourseTitle',title,'Units',units::text,'AcademicYear',y,'Semester',sem,'Status','active'),auth.uid(),clock_timestamp()) RETURNING updated_at INTO saved;
 ELSE
  IF target.record_key IS NULL THEN RAISE EXCEPTION 'This course is not available in the selected semester.' USING ERRCODE='22023';END IF;
  BEGIN expected:=(command->>'expected_updated_at')::timestamptz;EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RAISE EXCEPTION 'A current course version is required.' USING ERRCODE='22023';END;
  IF expected IS NULL OR expected IS DISTINCT FROM target.updated_at THEN RAISE EXCEPTION 'This semester course changed. Close the dialog and reload it.' USING ERRCODE='40001';END IF;
  IF target.data->>'Status'='removed' THEN RAISE EXCEPTION 'This semester course was removed. Its history is retained.' USING ERRCODE='22023';END IF;
  IF op='course.update' THEN
   UPDATE public.edupulse_institutional_records r SET data=r.data||jsonb_build_object('CourseTitle',title,'Units',units::text),updated_by=auth.uid(),updated_at=greatest(clock_timestamp(),target.updated_at+interval '1 microsecond') WHERE r.kind='course_terms' AND r.record_key=k RETURNING updated_at INTO saved;
   UPDATE public.edupulse_courses c SET course_title=title WHERE edupulse_private.dean_code_key(c.course_code)=edupulse_private.dean_code_key(code) AND c.academic_year=y AND edupulse_private.canonical_semester(c.semester)=sem;
  ELSIF op='course.status' THEN
   IF coalesce(command->>'status','') NOT IN ('active','suspended','removed') OR command->>'status'='removed' AND target.data->>'Status'<>'suspended' THEN RAISE EXCEPTION 'Suspend the course before removing it.' USING ERRCODE='22023';END IF;
   UPDATE public.edupulse_institutional_records r SET data=r.data||jsonb_build_object('Status',command->>'status'),updated_by=auth.uid(),updated_at=greatest(clock_timestamp(),target.updated_at+interval '1 microsecond') WHERE r.kind='course_terms' AND r.record_key=k RETURNING updated_at INTO saved;
  ELSE RAISE EXCEPTION 'Unsupported course action' USING ERRCODE='22023';END IF;
 END IF;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'courses',CASE op WHEN 'course.create' THEN 'Course added' WHEN 'course.update' THEN 'Course edited' ELSE 'Course status changed' END,concat_ws(' · ',code,sem,y));
 RETURN jsonb_build_object('code',code,'updated_at',saved,'academic_year',y,'semester',sem);
END $$;

-- Semester titles override only matching term projections, preserving completed labels.
CREATE OR REPLACE FUNCTION edupulse_private.catalog_course_title() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE title text;BEGIN
 SELECT r.data->>'CourseTitle' INTO title FROM public.edupulse_institutional_records r WHERE r.kind='course_terms' AND r.data->>'CourseCode'=NEW.course_code AND r.data->>'AcademicYear'=NEW.academic_year AND r.data->>'Semester'=edupulse_private.canonical_semester(NEW.semester);
 IF coalesce(title,'')<>'' THEN NEW.course_title:=title;END IF;RETURN NEW;
END $$;

-- The same lifecycle rules cover normal commands, PDF/grid imports and direct load writes.
DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('edupulse_private.guard_course_catalog()'::regprocedure);
 body:=replace(body,$old$WHERE kind='courses' AND edupulse_private.dean_code_key(data->>'CourseCode')=edupulse_private.dean_code_key(NEW.data->>'CourseCode') LIMIT 1;$old$,$new$WHERE kind='course_terms' AND edupulse_private.dean_code_key(data->>'CourseCode')=edupulse_private.dean_code_key(NEW.data->>'CourseCode') AND data->>'AcademicYear'=coalesce(nullif(NEW.data->>'AcademicYear',''),'2026-2027') AND data->>'Semester'=edupulse_private.canonical_semester(NEW.data->>'Semester') LIMIT 1;$new$);
 IF strpos(body,$find$kind='course_terms'$find$)=0 THEN RAISE EXCEPTION 'Semester lifecycle guard patch unavailable';END IF;EXECUTE body;
END $$;
