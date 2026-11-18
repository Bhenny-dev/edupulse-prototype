-- Core flow G2: delivery follows each block's class schedule from the first day of classes.
-- The Dean or Program Coordinator records when classes start in a semester and how many teaching weeks it has.
-- A block without a saved delivery schedule then opens each teaching week at its first class meeting of that
-- week (Asia/Manila), read from the meeting days and time on its course load. A schedule the instructor saved
-- for the block still wins.

ALTER TABLE public.edupulse_institutional_records DROP CONSTRAINT edupulse_institutional_records_kind_check;
ALTER TABLE public.edupulse_institutional_records ADD CONSTRAINT edupulse_institutional_records_kind_check
 CHECK(kind IN ('courses','course_terms','loads','rosters','irregular','term_calendar'));

-- Instructors read the term calendar to see their weekly class dates; it holds no personal data.
DROP POLICY institutional_read ON public.edupulse_institutional_records;
CREATE POLICY institutional_read ON public.edupulse_institutional_records FOR SELECT TO authenticated USING (
 (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean','admin') OR
 ((SELECT edupulse_private.academic_role())='instructor' AND (kind IN ('courses','term_calendar') OR (kind='loads' AND data->>'InstructorID'=(SELECT auth.uid())::text)))
);

-- Meeting days as printed on teaching loads (MT, TTH, MWF, SAT) as ISO weekdays, Monday = 1.
CREATE FUNCTION edupulse_private.meeting_weekdays(days text) RETURNS integer[]
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE rest text:=upper(regexp_replace(coalesce(days,''),'[^A-Za-z]','','g')); result integer[]:='{}'; token text; day integer;
BEGIN
 WHILE rest<>'' LOOP
  token:=CASE WHEN rest LIKE 'SUN%' THEN 'SUN' WHEN rest LIKE 'SU%' THEN 'SU' WHEN rest LIKE 'SAT%' THEN 'SAT' WHEN rest LIKE 'TH%' THEN 'TH' ELSE left(rest,1) END;
  day:=CASE token WHEN 'SUN' THEN 7 WHEN 'SU' THEN 7 WHEN 'SAT' THEN 6 WHEN 'TH' THEN 4 WHEN 'M' THEN 1 WHEN 'T' THEN 2 WHEN 'W' THEN 3 WHEN 'F' THEN 5 WHEN 'S' THEN 6 END;
  EXIT WHEN day IS NULL;
  IF NOT day=ANY(result) THEN result:=result||day; END IF;
  rest:=substr(rest,length(token)+1);
 END LOOP;
 RETURN result;
END $$;

-- The class start of a printed time such as "7:30 - 10:00"; the forms print no AM/PM, so 1:00 to 6:59 are afternoon.
CREATE FUNCTION edupulse_private.class_start(slot_time text) RETURNS time
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT make_time(CASE WHEN m[1]::int BETWEEN 1 AND 6 THEN m[1]::int+12 ELSE m[1]::int END,m[2]::int,0)
 FROM (SELECT regexp_match(coalesce(slot_time,''),'(\d{1,2}):(\d{2})') m) parts WHERE m IS NOT NULL AND m[1]::int<24 AND m[2]::int<60
$$;

-- The first class meeting of a teaching week for one block of an instructor's course load, or NULL when the
-- term calendar or the block's meeting days and time are not recorded.
CREATE FUNCTION edupulse_private.default_block_window(teacher uuid, course_code text, semester text, academic_year text, block text, teaching_week integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE sem text:=edupulse_private.canonical_semester(coalesce(nullif(semester,''),'1st Semester')); y text:=coalesce(nullif(academic_year,''),'2026-2027');
 load public.edupulse_institutional_records; calendar public.edupulse_institutional_records; slot jsonb; days integer[]; starts time; week_start date; best timestamptz; candidate timestamptz;
BEGIN
 IF teacher IS NULL OR teaching_week IS NULL OR teaching_week NOT BETWEEN 1 AND 52 OR coalesce(block,'')='' THEN RETURN NULL; END IF;
 SELECT * INTO calendar FROM public.edupulse_institutional_records WHERE kind='term_calendar' AND record_key=sem||'|'||y;
 IF calendar.record_key IS NULL OR coalesce(calendar.data->>'ClassesStart','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN NULL; END IF;
 SELECT * INTO load FROM public.edupulse_institutional_records l WHERE l.kind='loads' AND coalesce(l.data->>'LoadType','')<>'course' AND l.data->>'InstructorID'=teacher::text
  AND upper(regexp_replace(coalesce(l.data->>'CourseCode',''),'[[:space:]]','','g'))=upper(regexp_replace(coalesce(course_code,''),'[[:space:]]','','g'))
  AND upper(coalesce(l.data->>'Block',''))=upper(block) AND edupulse_private.canonical_semester(coalesce(nullif(l.data->>'Semester',''),'1st Semester'))=sem
  AND coalesce(nullif(l.data->>'AcademicYear',''),'2026-2027')=y AND coalesce(l.data->>'Status','') !~* '^(inactive|suspended|withdrawn|deleted)$'
  ORDER BY l.record_key LIMIT 1;
 IF load.record_key IS NULL THEN RETURN NULL; END IF;
 week_start:=(calendar.data->>'ClassesStart')::date+(teaching_week-1)*7;
 FOR slot IN SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(load.data->'Schedules')='array' AND jsonb_array_length(load.data->'Schedules')>0 THEN load.data->'Schedules'
   ELSE jsonb_build_array(jsonb_build_object('days',load.data->>'ScheduleDays','time',load.data->>'ScheduleTime')) END) LOOP
  days:=edupulse_private.meeting_weekdays(slot->>'days');
  starts:=edupulse_private.class_start(slot->>'time');
  IF starts IS NULL OR cardinality(days)=0 THEN CONTINUE; END IF;
  FOR offset_days IN 0..6 LOOP
   IF extract(isodow FROM week_start+offset_days)::int=ANY(days) THEN
    candidate:=((week_start+offset_days)+starts) AT TIME ZONE 'Asia/Manila';
    IF best IS NULL OR candidate<best THEN best:=candidate; END IF;
    EXIT;
   END IF;
  END LOOP;
 END LOOP;
 RETURN CASE WHEN best IS NULL THEN NULL ELSE jsonb_build_object('opens_at',best,'closes_at',NULL) END;
END $$;

CREATE FUNCTION edupulse_private.default_course_block_window(course text, block text, teaching_week integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT edupulse_private.default_block_window(c.instructor_id,c.course_code,c.semester,c.academic_year,block,teaching_week) FROM public.edupulse_courses c WHERE c.id=course
$$;

-- True when a block of this course, with no saved delivery schedule, has a default opening for the week.
CREATE FUNCTION edupulse_private.default_delivery_ready(teacher uuid, syllabus jsonb, teaching_week integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.edupulse_institutional_records l
  WHERE l.kind='loads' AND coalesce(l.data->>'LoadType','')<>'course' AND coalesce(l.data->>'Block','')<>'' AND l.data->>'InstructorID'=teacher::text
  AND upper(regexp_replace(coalesce(l.data->>'CourseCode',''),'[[:space:]]','','g'))=upper(regexp_replace(coalesce(syllabus->>'courseCode',''),'[[:space:]]','','g'))
  AND coalesce(l.data->>'Status','') !~* '^(inactive|suspended|withdrawn|deleted)$'
  AND NOT EXISTS(SELECT 1 FROM public.edupulse_delivery_schedules d WHERE d.course_id=md5(teacher::text||':'||(syllabus->>'id')) AND d.block_section=l.data->>'Block')
  AND edupulse_private.default_block_window(teacher,syllabus->>'courseCode',coalesce(nullif(syllabus->'courseInfo'->>'periodOffered',''),l.data->>'Semester'),
   coalesce(nullif(syllabus->'courseInfo'->>'academicYear',''),l.data->>'AcademicYear'),l.data->>'Block',teaching_week) IS NOT NULL)
$$;

-- A student's window for a teaching week: the saved block schedule, otherwise the block's class schedule.
CREATE OR REPLACE FUNCTION edupulse_private.student_delivery_window(course text, teaching_week integer) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('opens_at',opens_at,'closes_at',closes_at) FROM (
  SELECT w->>'opens_at' opens_at,w->>'closes_at' closes_at
  FROM public.edupulse_delivery_schedules s CROSS JOIN LATERAL jsonb_array_elements(s.windows) w
  WHERE s.course_id=course AND (w->>'week')::int=teaching_week AND edupulse_private.academic_role()='student'
  AND EXISTS(SELECT 1 FROM public.edupulse_enrollments e JOIN auth.users u ON u.id=auth.uid()
   WHERE e.course_id=course AND e.block_section=s.block_section AND e.student_email=lower(u.email) AND NOT e.suspended)
  UNION ALL
  SELECT defaults.d->>'opens_at',defaults.d->>'closes_at'
  FROM public.edupulse_enrollments e JOIN auth.users u ON u.id=auth.uid()
  CROSS JOIN LATERAL (SELECT edupulse_private.default_course_block_window(course,e.block_section,teaching_week) d) defaults
  WHERE e.course_id=course AND e.student_email=lower(u.email) AND NOT e.suspended AND edupulse_private.academic_role()='student' AND defaults.d IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM public.edupulse_delivery_schedules s WHERE s.course_id=course AND s.block_section=e.block_section)
 ) windows
 ORDER BY (opens_at::timestamptz<=now() AND (closes_at IS NULL OR closes_at::timestamptz>now())) DESC,
  CASE WHEN opens_at::timestamptz>now() THEN opens_at::timestamptz END ASC NULLS LAST,opens_at::timestamptz DESC LIMIT 1
$$;

-- Publishing in block-schedule mode also accepts a week the class schedule opens by default.
DO $$ DECLARE original text; definition text; BEGIN
 original:=pg_get_functiondef('edupulse_private.require_block_delivery_schedule()'::regprocedure);
 definition:=replace(original,'IF NOT EXISTS(SELECT 1 FROM public.edupulse_delivery_schedules d CROSS JOIN LATERAL jsonb_array_elements(d.windows) w',
  'IF NOT edupulse_private.default_delivery_ready(NEW.owner_id,source,(item.value->>''week'')::int) AND NOT EXISTS(SELECT 1 FROM public.edupulse_delivery_schedules d CROSS JOIN LATERAL jsonb_array_elements(d.windows) w');
 IF definition=original THEN RAISE EXCEPTION 'Default delivery patch unavailable'; END IF;
 EXECUTE definition;
END $$;

-- Dean and Program Coordinator: record when classes start in the current or next semester.
CREATE FUNCTION edupulse_private.dean_term_calendar(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); sem text:=edupulse_private.canonical_semester(command->>'semester'); y text:=coalesce(command->>'academic_year',''); first text:=coalesce(command->>'classes_start',''); weeks integer;
BEGIN
 IF actor IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501';END IF;
 IF sem NOT IN ('1st Semester','2nd Semester','Summer') OR y !~ '^20[0-9]{2}-20[0-9]{2}$' THEN RAISE EXCEPTION 'Choose a semester and school year.' USING ERRCODE='22023';END IF;
 IF NOT edupulse_private.editable_course_term(y,sem) THEN RAISE EXCEPTION 'Only the current or next semester can be changed.' USING ERRCODE='42501';END IF;
 BEGIN
  IF first !~ '^\d{4}-\d{2}-\d{2}$' OR to_char(first::date,'YYYY-MM-DD')<>first THEN RAISE EXCEPTION 'invalid date'; END IF;
 EXCEPTION WHEN others THEN RAISE EXCEPTION 'Enter the first day of classes.' USING ERRCODE='22023';
 END;
 weeks:=coalesce(nullif(command->>'weeks','')::int,18);
 IF weeks NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'A semester has 1 to 30 teaching weeks.' USING ERRCODE='22023';END IF;
 INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by) VALUES('term_calendar',sem||'|'||y,jsonb_build_object('Semester',sem,'AcademicYear',y,'ClassesStart',first,'Weeks',weeks),actor)
 ON CONFLICT ON CONSTRAINT edupulse_institutional_records_pkey DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=clock_timestamp();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(actor,'loads','Classes start recorded',concat_ws(' · ',sem,y,first,weeks||' teaching weeks'));
 RETURN jsonb_build_object('semester',sem,'academic_year',y,'classes_start',first,'weeks',weeks);
END $$;

DO $$ DECLARE body text;BEGIN
 body:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 body:=replace(body,'CASE v_action',$patch$CASE v_action WHEN 'term.calendar' THEN RETURN edupulse_private.dean_term_calendar(command);$patch$);
 IF strpos(body,'dean_term_calendar')=0 THEN RAISE EXCEPTION 'Dean term calendar command unavailable';END IF;
 EXECUTE body;
END $$;

REVOKE ALL ON FUNCTION edupulse_private.meeting_weekdays(text),edupulse_private.class_start(text),
 edupulse_private.default_block_window(uuid,text,text,text,text,integer),edupulse_private.default_course_block_window(text,text,integer),
 edupulse_private.default_delivery_ready(uuid,jsonb,integer),edupulse_private.dean_term_calendar(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.meeting_weekdays(text),edupulse_private.class_start(text),
 edupulse_private.default_block_window(uuid,text,text,text,text,integer),edupulse_private.default_course_block_window(text,text,integer),
 edupulse_private.default_delivery_ready(uuid,jsonb,integer),edupulse_private.dean_term_calendar(jsonb) TO authenticated;
