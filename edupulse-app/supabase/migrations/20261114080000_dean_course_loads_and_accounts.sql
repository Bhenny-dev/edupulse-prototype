-- Dean course loading, instructor/student account management and EduSuite list intake.
-- The Dean manages instructor and student accounts only. Every entry point rechecks the
-- live Dean role; suspended accounts lose their academic role immediately.

-- Irregular students attend named course/block classes instead of one home block.
DO $$ DECLARE c text; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.edupulse_institutional_records'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%kind%' LOOP
  EXECUTE format('ALTER TABLE public.edupulse_institutional_records DROP CONSTRAINT %I',c);
 END LOOP;
END $$;
ALTER TABLE public.edupulse_institutional_records ADD CONSTRAINT edupulse_institutional_records_kind_check
 CHECK(kind IN ('courses','loads','rosters','irregular'));

-- Recorded qualifications. Only the Dean writes them; instructors cannot edit their own degree.
CREATE TABLE public.edupulse_staff_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 employee_id text NOT NULL DEFAULT '' CHECK(length(employee_id)<=80),
 has_masters boolean NOT NULL DEFAULT false,
 degree text NOT NULL DEFAULT '' CHECK(length(degree)<=200),
 specialization text NOT NULL DEFAULT '' CHECK(length(specialization)<=200),
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.edupulse_staff_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_staff_profiles FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.edupulse_staff_profiles TO authenticated;
CREATE POLICY edupulse_staff_profiles_read ON public.edupulse_staff_profiles FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) OR (SELECT edupulse_private.academic_role()) IN ('dean','associate_dean','admin'));

-- A suspended account keeps its records but has no academic role until it is reactivated.
CREATE OR REPLACE FUNCTION edupulse_private.academic_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN raw_app_meta_data->>'suspended'='true' THEN NULL ELSE raw_app_meta_data->>'role' END
 FROM auth.users WHERE id=(SELECT auth.uid())
$$;

-- Same projection as before, plus irregular students in the classes they actually attend.
CREATE OR REPLACE FUNCTION edupulse_private.refresh_imported_enrollments() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rec record;
BEGIN
 DELETE FROM public.edupulse_enrollments WHERE source='institutional';
 DELETE FROM public.edupulse_enrollments e USING public.edupulse_courses c,public.edupulse_institutional_records l WHERE e.course_id=c.id AND l.kind='loads' AND l.data->>'CourseCode'=c.course_code AND l.data->>'Block'=e.block_section AND l.data->>'InstructorID'<>e.instructor_id::text;
 INSERT INTO public.edupulse_enrollments(course_id,instructor_id,student_email,student_ref,display_name,block_section,source)
 SELECT c.id,c.instructor_id,lower(r.data->>'Email'),r.data->>'StudentID',r.data->>'Name',r.data->>'Block','institutional'
 FROM public.edupulse_courses c JOIN public.edupulse_institutional_records l ON l.kind='loads' AND l.data->>'CourseCode'=c.course_code AND l.data->>'InstructorID'=c.instructor_id::text
 JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND r.data->>'Block'=l.data->>'Block'
 WHERE lower(coalesce(r.data->>'Status','active')) NOT IN ('inactive','withdrawn') ON CONFLICT DO NOTHING;

 -- A full class (35 students) is never overfilled by an irregular student; the Dean's intake reports it.
 FOR rec IN SELECT c.id course_id,c.instructor_id,lower(i.data->>'Email') email,i.data->>'StudentID' ref,i.data->>'Name' name,i.data->>'Block' block
  FROM public.edupulse_institutional_records i
  JOIN public.edupulse_institutional_records l ON l.kind='loads' AND l.data->>'CourseCode'=i.data->>'CourseCode' AND l.data->>'Block'=i.data->>'Block'
  JOIN public.edupulse_courses c ON c.course_code=l.data->>'CourseCode' AND c.instructor_id::text=l.data->>'InstructorID'
  WHERE i.kind='irregular' ORDER BY i.data->>'StudentID',i.data->>'CourseCode'
 LOOP
  IF (SELECT count(DISTINCT student_email) FROM public.edupulse_enrollments WHERE course_id=rec.course_id AND block_section=rec.block AND student_email<>rec.email)<35 THEN
   INSERT INTO public.edupulse_enrollments(course_id,instructor_id,student_email,student_ref,display_name,block_section,source)
   VALUES(rec.course_id,rec.instructor_id,rec.email,rec.ref,rec.name,rec.block,'institutional') ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;

 WITH summaries AS (
  SELECT c.id,(SELECT coalesce(jsonb_agg(jsonb_build_object('block',block_section,'students',students,'schedule',schedule,'yearLevel',year_level,'adviser',adviser) ORDER BY block_section),'[]')
   FROM (SELECT e.block_section,count(DISTINCT e.student_email) students,max(r.data->>'Schedule') schedule,max(r.data->>'YearLevel') year_level,max(r.data->>'Adviser') adviser
    FROM public.edupulse_enrollments e LEFT JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND lower(r.data->>'Email')=e.student_email AND r.data->>'Block'=e.block_section
    WHERE e.course_id=c.id GROUP BY e.block_section) blocks) AS info
  FROM public.edupulse_courses c
 )
 UPDATE public.edupulse_courses c SET block_info=s.info FROM summaries s
 WHERE c.id=s.id AND c.block_info IS DISTINCT FROM s.info;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.refresh_imported_enrollments() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION edupulse_private.dean_clean(value text,max_length integer) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE result text:=regexp_replace(btrim(coalesce(value,'')),'\s+',' ','g');
BEGIN
 IF length(result)>max_length THEN RAISE EXCEPTION 'A field is longer than % characters',max_length USING ERRCODE='22023'; END IF;
 RETURN result;
END $$;

-- Space-insensitive course code comparison: "IT102" and "IT 102" are the same course.
CREATE FUNCTION edupulse_private.dean_code_key(value text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT upper(regexp_replace(coalesce(value,''),'[\s-]+','','g')) $$;

-- Reuse an existing block spelling so loads, rosters and irregular classes join exactly.
CREATE FUNCTION edupulse_private.dean_block(value text) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE wanted text:=upper(edupulse_private.dean_clean(value,40)); found text;
BEGIN
 IF wanted='' THEN RETURN ''; END IF;
 SELECT r.data->>'Block' INTO found FROM public.edupulse_institutional_records r
  WHERE r.kind IN ('rosters','loads','irregular') AND upper(btrim(r.data->>'Block'))=wanted ORDER BY r.kind DESC LIMIT 1;
 RETURN coalesce(found,wanted);
END $$;

-- Resolves a course code to the recorded course list; creates the record when a title is supplied.
CREATE FUNCTION edupulse_private.dean_course(code text,title text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE wanted text:=edupulse_private.dean_code_key(code); found text; found_title text; v_title text:=edupulse_private.dean_clean(title,300);
BEGIN
 IF wanted='' THEN RAISE EXCEPTION 'A course code is required' USING ERRCODE='22023'; END IF;
 SELECT r.data->>'CourseCode' INTO found FROM public.edupulse_institutional_records r
  WHERE r.kind='courses' AND edupulse_private.dean_code_key(r.record_key)=wanted LIMIT 1;
 IF found IS NOT NULL THEN RETURN found; END IF;
 SELECT c.course_code,c.course_title INTO found,found_title FROM public.edupulse_courses c
  WHERE edupulse_private.dean_code_key(c.course_code)=wanted ORDER BY c.updated_at DESC LIMIT 1;
 IF found IS NULL THEN found:=upper(edupulse_private.dean_clean(code,40)); END IF;
 IF v_title='' THEN v_title:=coalesce(found_title,''); END IF;
 IF coalesce(v_title,'')='' THEN RAISE EXCEPTION 'Add % to the course list first, or include its descriptive title',found USING ERRCODE='22023'; END IF;
 INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at)
 VALUES('courses',found,jsonb_build_object('CourseCode',found,'CourseTitle',v_title),auth.uid(),now());
 RETURN found;
END $$;

-- Creates a confirmed email sign-in for an instructor or student account.
CREATE FUNCTION edupulse_private.dean_new_user(p_email text,p_password text,p_role text,p_name text,p_app jsonb,p_meta jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=gen_random_uuid();
BEGIN
 IF p_role NOT IN ('instructor','student') THEN RAISE EXCEPTION 'Unsupported account role' USING ERRCODE='42501'; END IF;
 INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
 VALUES('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',p_email,extensions.crypt(p_password,extensions.gen_salt('bf')),now(),
  jsonb_build_object('provider','email','providers',jsonb_build_array('email'),'role',p_role)||coalesce(p_app,'{}'),
  coalesce(p_meta,'{}')||jsonb_build_object('full_name',p_name,'email_verified',true),now(),now(),'','','','');
 INSERT INTO auth.identities(id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
 VALUES(gen_random_uuid(),uid,uid::text,jsonb_build_object('sub',uid::text,'email',p_email,'email_verified',true,'phone_verified',false),'email',now(),now(),now());
 RETURN uid;
END $$;

-- Restores a removed account of the same role with a newly issued password.
CREATE FUNCTION edupulse_private.dean_restore_user(p_id uuid,p_role text,p_password text,p_name text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE auth.users SET raw_app_meta_data=(raw_app_meta_data-'removed_role'-'removed_at'-'suspended')||jsonb_build_object('role',p_role),
  raw_user_meta_data=coalesce(raw_user_meta_data,'{}')||jsonb_build_object('full_name',p_name),banned_until=NULL,
  encrypted_password=extensions.crypt(p_password,extensions.gen_salt('bf')),updated_at=now()
 WHERE id=p_id AND raw_app_meta_data->>'removed_role'=p_role AND raw_app_meta_data->>'role' IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'This account cannot be restored' USING ERRCODE='22023'; END IF;
END $$;

CREATE FUNCTION edupulse_private.dean_roster(p_number text,p_name text,p_email text,p_year integer,p_program text,p_placement text,p_block text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE prior jsonb; v_block text:=CASE WHEN p_placement='irregular' THEN 'IRREGULAR' ELSE edupulse_private.dean_block(p_block) END;
BEGIN
 IF p_placement NOT IN ('block','irregular') THEN RETURN; END IF;
 IF p_placement='block' AND (v_block='' OR v_block='IRREGULAR') THEN RAISE EXCEPTION 'Choose a block for student %',p_number USING ERRCODE='22023'; END IF;
 SELECT data INTO prior FROM public.edupulse_institutional_records WHERE kind='rosters' AND record_key=p_number;
 INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at)
 VALUES('rosters',p_number,coalesce(prior,'{}')||jsonb_build_object('StudentID',p_number,'Name',p_name,'Email',p_email,'YearLevel',p_year::text,'Block',v_block,'Status','active','Type',CASE WHEN p_placement='irregular' THEN 'Irregular' ELSE 'Regular' END,'Program',p_program),auth.uid(),now())
 ON CONFLICT ON CONSTRAINT edupulse_institutional_records_pkey DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=now();
 IF p_placement='block' THEN DELETE FROM public.edupulse_institutional_records WHERE kind='irregular' AND data->>'StudentID'=p_number; END IF;
END $$;

CREATE FUNCTION edupulse_private.dean_block_capacity() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE full_block text;
BEGIN
 SELECT x.data->>'Block' INTO full_block FROM public.edupulse_institutional_records x
  WHERE x.kind='rosters' AND x.data->>'Block'<>'IRREGULAR' AND lower(coalesce(x.data->>'Status','active')) NOT IN ('inactive','withdrawn')
  GROUP BY x.data->>'Block' HAVING count(*)>35 LIMIT 1;
 IF full_block IS NOT NULL THEN RAISE EXCEPTION 'Block % would exceed 35 active students',full_block USING ERRCODE='22023'; END IF;
END $$;

CREATE FUNCTION edupulse_private.dean_directory() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(edupulse_private.academic_role(),'')<>'dean' THEN RAISE EXCEPTION 'Dean account required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
  'instructors',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',u.id,'name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email),'email',u.email,
     'status',CASE WHEN u.raw_app_meta_data->>'suspended'='true' THEN 'suspended' ELSE 'active' END,
     'employee_id',coalesce(p.employee_id,''),'has_masters',p.has_masters,'degree',coalesce(p.degree,''),'specialization',coalesce(p.specialization,''),
     'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at) ORDER BY coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email)),'[]')
    FROM auth.users u LEFT JOIN public.edupulse_staff_profiles p ON p.user_id=u.id WHERE u.raw_app_meta_data->>'role'='instructor'),
  'students',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.user_id,'student_number',s.student_number,'name',s.full_name,'surname',s.surname,'first_name',s.first_name,
     'middle_name',s.middle_name,'email',s.email,'year_level',s.year_level,'program',s.program,
     'status',CASE WHEN u.raw_app_meta_data->>'suspended'='true' THEN 'suspended' ELSE 'active' END,
     'block',nullif(r.data->>'Block',''),'type',r.data->>'Type','last_sign_in_at',u.last_sign_in_at) ORDER BY s.surname,s.first_name,s.student_number),'[]')
    FROM public.edupulse_students s JOIN auth.users u ON u.id=s.user_id
    LEFT JOIN public.edupulse_institutional_records r ON r.kind='rosters' AND r.record_key=s.student_number
    WHERE s.active AND s.department='College of Information Technology' AND u.raw_app_meta_data->>'role'='student'),
  'irregular',(SELECT coalesce(jsonb_agg(r.data ORDER BY r.record_key),'[]') FROM public.edupulse_institutional_records r WHERE r.kind='irregular'));
END $$;

CREATE FUNCTION edupulse_private.dean_account_create(a jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_role text:=a->>'role'; v_surname text:=edupulse_private.dean_clean(a->>'surname',100); v_first text:=edupulse_private.dean_clean(a->>'first_name',150);
 v_middle text:=edupulse_private.dean_clean(a->>'middle_name',100); v_email text:=lower(edupulse_private.dean_clean(a->>'email',254)); v_pass text:=coalesce(a->>'password','');
 v_number text:=edupulse_private.dean_clean(a->>'student_number',80); v_program text:=edupulse_private.dean_clean(a->>'program',250);
 v_year integer; v_full text; existing auth.users; uid uuid; restored boolean:=false;
BEGIN
 IF v_role NOT IN ('instructor','student') THEN RAISE EXCEPTION 'The Dean adds instructor or student accounts only' USING ERRCODE='22023'; END IF;
 IF v_surname='' OR v_first='' THEN RAISE EXCEPTION 'Surname and first name are required' USING ERRCODE='22023'; END IF;
 IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE='22023'; END IF;
 IF length(v_pass) NOT BETWEEN 6 AND 72 THEN RAISE EXCEPTION 'The initial password must be 6 to 72 characters' USING ERRCODE='22023'; END IF;
 v_full:=concat_ws(' ',v_first,nullif(v_middle,''),v_surname);
 IF v_role='student' THEN
  IF v_number !~ '^[A-Za-z0-9-]{1,80}$' THEN RAISE EXCEPTION 'Enter the official student number' USING ERRCODE='22023'; END IF;
  IF coalesce(a->>'year_level','') !~ '^[1-4]$' THEN RAISE EXCEPTION 'Choose a year level from 1 to 4' USING ERRCODE='22023'; END IF;
  IF v_program='' THEN RAISE EXCEPTION 'Choose the student''s program' USING ERRCODE='22023'; END IF;
  v_year:=(a->>'year_level')::integer;
 END IF;
 SELECT * INTO existing FROM auth.users u WHERE lower(u.email)=v_email;
 IF existing.id IS NOT NULL THEN
  IF existing.raw_app_meta_data->>'removed_role'=v_role AND existing.raw_app_meta_data->>'role' IS NULL THEN
   PERFORM edupulse_private.dean_restore_user(existing.id,v_role,v_pass,v_full); uid:=existing.id; restored:=true;
  ELSE RAISE EXCEPTION 'An account already uses %',v_email USING ERRCODE='22023';
  END IF;
 END IF;
 IF v_role='student' THEN
  IF EXISTS(SELECT 1 FROM public.edupulse_students s WHERE s.student_number=v_number AND (uid IS NULL OR s.user_id<>uid))
   THEN RAISE EXCEPTION 'Student number % already belongs to another account',v_number USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.edupulse_students s WHERE s.email=v_email AND s.student_number<>v_number)
   THEN RAISE EXCEPTION 'Another student record already uses %',v_email USING ERRCODE='22023'; END IF;
  IF uid IS NOT NULL AND EXISTS(SELECT 1 FROM public.edupulse_students s WHERE s.user_id=uid AND s.student_number<>v_number)
   THEN RAISE EXCEPTION 'This account belongs to a different student number' USING ERRCODE='22023'; END IF;
 END IF;
 IF uid IS NULL THEN
  uid:=edupulse_private.dean_new_user(v_email,v_pass,v_role,v_full,
   CASE WHEN v_role='student' THEN jsonb_build_object('official_student_number',v_number) ELSE '{}'::jsonb END,
   CASE WHEN v_role='student' THEN jsonb_build_object('student_number',v_number,'surname',v_surname,'first_name',v_first,'middle_name',v_middle,'year_level',v_year,'program',v_program) ELSE '{}'::jsonb END);
 END IF;
 IF v_role='instructor' THEN
  INSERT INTO public.edupulse_staff_profiles(user_id,employee_id,has_masters,degree,specialization,updated_by,updated_at)
  VALUES(uid,edupulse_private.dean_clean(a->>'employee_id',80),coalesce((a->>'has_masters')::boolean,false),edupulse_private.dean_clean(a->>'degree',200),edupulse_private.dean_clean(a->>'specialization',200),auth.uid(),now())
  ON CONFLICT(user_id) DO UPDATE SET employee_id=excluded.employee_id,has_masters=excluded.has_masters,degree=excluded.degree,specialization=excluded.specialization,updated_by=excluded.updated_by,updated_at=now();
 ELSE
  INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,middle_name,full_name,year_level,department,program,active)
  VALUES(v_number,uid,v_email,v_surname,v_first,v_middle,v_full,v_year,'College of Information Technology',v_program,true)
  ON CONFLICT(student_number) DO UPDATE SET email=excluded.email,surname=excluded.surname,first_name=excluded.first_name,middle_name=excluded.middle_name,
   full_name=excluded.full_name,year_level=excluded.year_level,department=excluded.department,program=excluded.program,active=true;
  PERFORM edupulse_private.dean_roster(v_number,v_full,v_email,v_year,v_program,coalesce(a->>'placement','none'),a->>'block');
  PERFORM edupulse_private.dean_block_capacity();
  PERFORM edupulse_private.refresh_imported_enrollments();
 END IF;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'account',CASE WHEN restored THEN 'Account restored' ELSE 'Account added' END,v_role||': '||v_full);
 RETURN jsonb_build_object('id',uid,'email',v_email,'role',v_role,'restored',restored);
END $$;

CREATE FUNCTION edupulse_private.dean_account_update(a jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target auth.users; v_role text; v_surname text:=edupulse_private.dean_clean(a->>'surname',100); v_first text:=edupulse_private.dean_clean(a->>'first_name',150);
 v_middle text:=edupulse_private.dean_clean(a->>'middle_name',100); v_email text:=lower(edupulse_private.dean_clean(a->>'email',254));
 v_program text:=edupulse_private.dean_clean(a->>'program',250); v_full text; v_year integer; profile public.edupulse_students; v_masters boolean;
 v_spec text:=edupulse_private.dean_clean(a->>'specialization',200);
BEGIN
 IF coalesce(a->>'id','') !~ '^[0-9a-f-]{36}$' THEN RAISE EXCEPTION 'Choose an account' USING ERRCODE='22023'; END IF;
 SELECT * INTO target FROM auth.users WHERE id=(a->>'id')::uuid;
 v_role:=target.raw_app_meta_data->>'role';
 IF target.id IS NULL OR coalesce(v_role,'') NOT IN ('instructor','student') THEN RAISE EXCEPTION 'Only instructor or student accounts can be edited here' USING ERRCODE='22023'; END IF;
 IF v_surname='' OR v_first='' THEN RAISE EXCEPTION 'Surname and first name are required' USING ERRCODE='22023'; END IF;
 IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users u WHERE lower(u.email)=v_email AND u.id<>target.id) THEN RAISE EXCEPTION 'An account already uses %',v_email USING ERRCODE='22023'; END IF;
 v_full:=concat_ws(' ',v_first,nullif(v_middle,''),v_surname);
 UPDATE auth.users SET email=v_email,raw_user_meta_data=coalesce(raw_user_meta_data,'{}')||jsonb_build_object('full_name',v_full),updated_at=now() WHERE id=target.id;
 UPDATE auth.identities SET identity_data=identity_data||jsonb_build_object('email',v_email),updated_at=now() WHERE user_id=target.id AND provider='email';
 IF v_role='instructor' THEN
  v_masters:=coalesce((a->>'has_masters')::boolean,false);
  INSERT INTO public.edupulse_staff_profiles(user_id,employee_id,has_masters,degree,specialization,updated_by,updated_at)
  VALUES(target.id,edupulse_private.dean_clean(a->>'employee_id',80),v_masters,edupulse_private.dean_clean(a->>'degree',200),v_spec,auth.uid(),now())
  ON CONFLICT(user_id) DO UPDATE SET employee_id=excluded.employee_id,has_masters=excluded.has_masters,degree=excluded.degree,specialization=excluded.specialization,updated_by=excluded.updated_by,updated_at=now();
  UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('InstructorName',v_full,'Email',v_email,'HasMasters',CASE WHEN v_masters THEN 'Yes' ELSE 'No' END,'Specialization',v_spec),updated_by=auth.uid(),updated_at=now()
   WHERE kind='loads' AND data->>'InstructorID'=target.id::text;
 ELSE
  SELECT * INTO profile FROM public.edupulse_students WHERE user_id=target.id;
  IF profile.student_number IS NULL THEN RAISE EXCEPTION 'This student has no official record' USING ERRCODE='22023'; END IF;
  IF coalesce(a->>'year_level','') !~ '^[1-4]$' OR v_program='' THEN RAISE EXCEPTION 'Year level and program are required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.edupulse_students s WHERE s.email=v_email AND s.student_number<>profile.student_number) THEN RAISE EXCEPTION 'Another student record already uses %',v_email USING ERRCODE='22023'; END IF;
  v_year:=(a->>'year_level')::integer;
  UPDATE public.edupulse_students SET email=v_email,surname=v_surname,first_name=v_first,middle_name=v_middle,full_name=v_full,year_level=v_year,program=v_program WHERE student_number=profile.student_number;
  UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('Name',v_full,'Email',v_email,'YearLevel',v_year::text),updated_by=auth.uid(),updated_at=now()
   WHERE (kind='rosters' AND record_key=profile.student_number) OR (kind='irregular' AND data->>'StudentID'=profile.student_number);
  PERFORM edupulse_private.dean_roster(profile.student_number,v_full,v_email,v_year,v_program,coalesce(a->>'placement','none'),a->>'block');
  PERFORM edupulse_private.dean_block_capacity();
 END IF;
 PERFORM edupulse_private.refresh_imported_enrollments();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'account','Account edited',v_role||': '||v_full);
 RETURN jsonb_build_object('id',target.id,'email',v_email,'role',v_role);
END $$;

CREATE FUNCTION edupulse_private.dean_account_status(p_id uuid,p_status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target auth.users; v_role text; v_name text; v_number text;
BEGIN
 SELECT * INTO target FROM auth.users WHERE id=p_id;
 v_role:=target.raw_app_meta_data->>'role';
 IF target.id IS NULL OR coalesce(v_role,'') NOT IN ('instructor','student') THEN RAISE EXCEPTION 'Only instructor or student accounts can be changed here' USING ERRCODE='22023'; END IF;
 IF p_status NOT IN ('suspended','active','removed') THEN RAISE EXCEPTION 'Unsupported account status' USING ERRCODE='22023'; END IF;
 v_name:=coalesce(nullif(target.raw_user_meta_data->>'full_name',''),target.email);
 IF p_status='suspended' THEN
  UPDATE auth.users SET raw_app_meta_data=raw_app_meta_data||'{"suspended":true}',banned_until=now()+interval '100 years',updated_at=now() WHERE id=p_id;
  DELETE FROM auth.sessions WHERE user_id=p_id;
 ELSIF p_status='active' THEN
  UPDATE auth.users SET raw_app_meta_data=raw_app_meta_data-'suspended',banned_until=NULL,updated_at=now() WHERE id=p_id;
 ELSE
  IF target.raw_app_meta_data->>'suspended' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Suspend the account before removing it' USING ERRCODE='22023'; END IF;
  UPDATE auth.users SET raw_app_meta_data=(raw_app_meta_data-'role'-'suspended')||jsonb_build_object('removed_role',v_role,'removed_at',now()),banned_until=now()+interval '100 years',updated_at=now() WHERE id=p_id;
  DELETE FROM auth.sessions WHERE user_id=p_id;
  IF v_role='instructor' THEN
   DELETE FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'InstructorID'=p_id::text;
  ELSE
   UPDATE public.edupulse_students SET active=false WHERE user_id=p_id RETURNING student_number INTO v_number;
   DELETE FROM public.edupulse_institutional_records WHERE (kind='rosters' AND record_key=v_number) OR (kind='irregular' AND data->>'StudentID'=v_number);
  END IF;
  PERFORM edupulse_private.refresh_imported_enrollments();
 END IF;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail)
 VALUES(auth.uid(),'account',CASE p_status WHEN 'suspended' THEN 'Account suspended' WHEN 'active' THEN 'Account reactivated' ELSE 'Account removed' END,v_role||': '||v_name);
 RETURN jsonb_build_object('id',p_id,'status',p_status);
END $$;

CREATE FUNCTION edupulse_private.dean_assign_loads(p_loads jsonb,p_filename text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; v_code text; v_block text; v_sem text; v_key text; teacher auth.users; profile public.edupulse_staff_profiles; prior jsonb; course jsonb;
 created integer:=0; updated integer:=0; unchanged integer:=0; v_name text;
BEGIN
 IF jsonb_typeof(p_loads) IS DISTINCT FROM 'array' OR jsonb_array_length(p_loads) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Provide between 1 and 500 course loads' USING ERRCODE='22023'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_loads) LOOP
  SELECT * INTO teacher FROM auth.users WHERE id::text=r->>'instructor_id' AND raw_app_meta_data->>'role'='instructor';
  IF teacher.id IS NULL THEN RAISE EXCEPTION 'Choose a registered instructor for %',coalesce(r->>'course_code','each course') USING ERRCODE='22023'; END IF;
  v_name:=coalesce(nullif(teacher.raw_user_meta_data->>'full_name',''),teacher.email);
  IF teacher.raw_app_meta_data->>'suspended'='true' THEN RAISE EXCEPTION 'Reactivate % before giving them a course load',v_name USING ERRCODE='22023'; END IF;
  v_code:=edupulse_private.dean_course(r->>'course_code',r->>'course_title');
  v_block:=edupulse_private.dean_block(r->>'block');
  IF v_block='' OR v_block='IRREGULAR' THEN RAISE EXCEPTION 'Choose a block for %',v_code USING ERRCODE='22023'; END IF;
  v_sem:=edupulse_private.dean_clean(r->>'semester',60);
  IF v_sem='' THEN
   SELECT l.data->>'Semester' INTO v_sem FROM public.edupulse_institutional_records l WHERE l.kind='loads' AND l.data->>'CourseCode'=v_code AND l.data->>'Block'=v_block ORDER BY l.updated_at DESC LIMIT 1;
   IF v_sem IS NULL THEN SELECT c.data INTO course FROM public.edupulse_institutional_records c WHERE c.kind='courses' AND c.record_key=v_code; v_sem:=coalesce(course->>'Semester',''); END IF;
  END IF;
  v_key:=concat_ws('|',v_code,v_block,v_sem);
  SELECT data INTO prior FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=v_key;
  SELECT * INTO profile FROM public.edupulse_staff_profiles WHERE user_id=teacher.id;
  IF prior IS NULL THEN created:=created+1; ELSIF prior->>'InstructorID'=teacher.id::text THEN unchanged:=unchanged+1; ELSE updated:=updated+1; END IF;
  INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at)
  VALUES('loads',v_key,coalesce(prior,'{}')||jsonb_build_object('InstructorID',teacher.id::text,'InstructorName',v_name,'Email',teacher.email,'CourseCode',v_code,'Block',v_block,'Semester',v_sem,
   'HasMasters',CASE WHEN profile.user_id IS NULL THEN coalesce(prior->>'HasMasters','') WHEN profile.has_masters THEN 'Yes' ELSE 'No' END,
   'Specialization',coalesce(nullif(profile.specialization,''),prior->>'Specialization',''),'AllocationSource','dean-course-loading'),auth.uid(),now())
  ON CONFLICT ON CONSTRAINT edupulse_institutional_records_pkey DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=now();
 END LOOP;
 PERFORM edupulse_private.refresh_imported_enrollments();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'loads',coalesce(nullif(edupulse_private.dean_clean(p_filename,255),''),'Course loading'),'loads: '||created||' new, '||updated||' reassigned, '||unchanged||' unchanged');
 RETURN jsonb_build_object('created',created,'updated',updated,'unchanged',unchanged);
END $$;

CREATE FUNCTION edupulse_private.dean_remove_loads(p_keys jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE removed integer;
BEGIN
 IF jsonb_typeof(p_keys) IS DISTINCT FROM 'array' OR jsonb_array_length(p_keys) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Choose between 1 and 500 course loads' USING ERRCODE='22023'; END IF;
 DELETE FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key IN (SELECT jsonb_array_elements_text(p_keys));
 GET DIAGNOSTICS removed=ROW_COUNT;
 PERFORM edupulse_private.refresh_imported_enrollments();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'loads','Course loads removed','loads: '||removed||' removed');
 RETURN jsonb_build_object('removed',removed);
END $$;

-- EduSuite student lists, already reviewed by the Dean: accounts, blocks and irregular classes.
CREATE FUNCTION edupulse_private.dean_import_students(p_students jsonb,p_filename text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s jsonb; c jsonb; v_number text; v_surname text; v_first text; v_middle text; v_full text; v_email text; v_program text; v_year integer; v_placement text;
 profile public.edupulse_students; account auth.users; uid uuid; v_code text; v_block text;
 created integer:=0; updated integer:=0; linked integer:=0; restored integer:=0; regular integer:=0; irregular integer:=0; skipped jsonb:='[]';
BEGIN
 IF jsonb_typeof(p_students) IS DISTINCT FROM 'array' OR jsonb_array_length(p_students) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Send between 1 and 200 students per request' USING ERRCODE='22023'; END IF;
 FOR s IN SELECT value FROM jsonb_array_elements(p_students) LOOP
  v_number:=edupulse_private.dean_clean(s->>'student_number',80); v_surname:=edupulse_private.dean_clean(s->>'surname',100);
  v_first:=edupulse_private.dean_clean(s->>'first_name',150); v_middle:=edupulse_private.dean_clean(s->>'middle_name',100);
  v_program:=edupulse_private.dean_clean(s->>'program',250); v_placement:=coalesce(s->>'placement','none');
  v_email:=lower(coalesce(nullif(edupulse_private.dean_clean(s->>'email',254),''),v_number||'@gmail.com'));
  IF v_number !~ '^[A-Za-z0-9-]{1,80}$' OR v_first='' OR v_program='' OR coalesce(s->>'year_level','') !~ '^[1-4]$' OR v_placement NOT IN ('block','irregular','none') THEN
   skipped:=skipped||jsonb_build_object('student_number',v_number,'reason','Missing student number, first name, program or year level'); CONTINUE;
  END IF;
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN skipped:=skipped||jsonb_build_object('student_number',v_number,'reason','Invalid email address'); CONTINUE; END IF;
  v_year:=(s->>'year_level')::integer; v_full:=concat_ws(' ',v_first,nullif(v_middle,''),nullif(v_surname,'')); uid:=NULL;
  SELECT * INTO profile FROM public.edupulse_students WHERE student_number=v_number;
  IF profile.student_number IS NULL AND EXISTS(SELECT 1 FROM public.edupulse_students x WHERE x.email=v_email) THEN
   skipped:=skipped||jsonb_build_object('student_number',v_number,'reason','Another student record already uses '||v_email); CONTINUE;
  END IF;
  IF profile.student_number IS NOT NULL THEN
   SELECT * INTO account FROM auth.users WHERE id=profile.user_id;
   IF account.raw_app_meta_data->>'role'='student' THEN uid:=account.id; updated:=updated+1;
   ELSIF account.raw_app_meta_data->>'removed_role'='student' AND length(coalesce(s->>'password','')) BETWEEN 6 AND 72 THEN
    PERFORM edupulse_private.dean_restore_user(account.id,'student',s->>'password',v_full); uid:=account.id; restored:=restored+1;
   ELSE skipped:=skipped||jsonb_build_object('student_number',v_number,'reason','The student record belongs to an account that is not a student'); CONTINUE;
   END IF;
   v_email:=profile.email;
  ELSE
   SELECT * INTO account FROM auth.users u WHERE lower(u.email)=v_email;
   IF account.id IS NOT NULL THEN
    IF account.raw_app_meta_data->>'role'='student' AND NOT EXISTS(SELECT 1 FROM public.edupulse_students x WHERE x.user_id=account.id) THEN uid:=account.id; linked:=linked+1;
    ELSE skipped:=skipped||jsonb_build_object('student_number',v_number,'reason','Another account already uses '||v_email); CONTINUE;
    END IF;
   ELSIF length(coalesce(s->>'password','')) NOT BETWEEN 6 AND 72 THEN
    skipped:=skipped||jsonb_build_object('student_number',v_number,'reason','No initial password'); CONTINUE;
   ELSE
    uid:=edupulse_private.dean_new_user(v_email,s->>'password','student',v_full,jsonb_build_object('official_student_number',v_number),
     jsonb_build_object('student_number',v_number,'surname',v_surname,'first_name',v_first,'middle_name',v_middle,'year_level',v_year,'program',v_program));
    created:=created+1;
   END IF;
  END IF;
  INSERT INTO public.edupulse_students(student_number,user_id,email,surname,first_name,middle_name,full_name,year_level,department,program,active)
  VALUES(v_number,uid,v_email,coalesce(nullif(v_surname,''),v_first),v_first,v_middle,v_full,v_year,'College of Information Technology',v_program,true)
  ON CONFLICT(student_number) DO UPDATE SET surname=excluded.surname,first_name=excluded.first_name,middle_name=excluded.middle_name,
   full_name=excluded.full_name,year_level=excluded.year_level,program=excluded.program,active=true;
  PERFORM edupulse_private.dean_roster(v_number,v_full,v_email,v_year,v_program,v_placement,s->>'block');
  IF v_placement='block' THEN regular:=regular+1; END IF;
  IF v_placement='irregular' THEN
   irregular:=irregular+1;
   DELETE FROM public.edupulse_institutional_records WHERE kind='irregular' AND data->>'StudentID'=v_number;
   FOR c IN SELECT value FROM jsonb_array_elements(coalesce(s->'courses','[]')) LOOP
    v_code:=edupulse_private.dean_course(c->>'course_code',c->>'course_title'); v_block:=edupulse_private.dean_block(c->>'block');
    IF v_block='' OR v_block='IRREGULAR' THEN CONTINUE; END IF;
    INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at)
    VALUES('irregular',concat_ws('|',v_number,v_code,v_block),jsonb_build_object('StudentID',v_number,'Name',v_full,'Email',v_email,'YearLevel',v_year::text,'CourseCode',v_code,'Block',v_block,'Type','Irregular'),auth.uid(),now())
    ON CONFLICT ON CONSTRAINT edupulse_institutional_records_pkey DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=now();
   END LOOP;
  END IF;
 END LOOP;
 PERFORM edupulse_private.dean_block_capacity();
 PERFORM edupulse_private.refresh_imported_enrollments();
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'import',coalesce(nullif(edupulse_private.dean_clean(p_filename,255),''),'Student list'),
  'students: '||created||' new, '||updated||' updated, '||(linked+restored)||' linked, '||regular||' in blocks, '||irregular||' irregular, '||jsonb_array_length(skipped)||' skipped');
 RETURN jsonb_build_object('created',created,'updated',updated,'linked',linked,'restored',restored,'regular',regular,'irregular',irregular,'skipped',skipped);
END $$;

-- Single Dean entry point. Writes share the institutional import lock.
CREATE FUNCTION public.edupulse_dean_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_action text:=command->>'action';
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'')<>'dean' THEN RAISE EXCEPTION 'Dean account required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(command) IS DISTINCT FROM 'object' OR octet_length(command::text)>1500000 THEN RAISE EXCEPTION 'Invalid Dean request' USING ERRCODE='22023'; END IF;
 IF v_action='directory' THEN RETURN edupulse_private.dean_directory(); END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 CASE v_action
  WHEN 'account.create' THEN RETURN edupulse_private.dean_account_create(command->'account');
  WHEN 'account.update' THEN RETURN edupulse_private.dean_account_update(command->'account');
  WHEN 'account.status' THEN
   IF coalesce(command->>'id','') !~ '^[0-9a-f-]{36}$' THEN RAISE EXCEPTION 'Choose an account' USING ERRCODE='22023'; END IF;
   RETURN edupulse_private.dean_account_status((command->>'id')::uuid,command->>'status');
  WHEN 'load.assign' THEN RETURN edupulse_private.dean_assign_loads(command->'loads',command->>'filename');
  WHEN 'load.remove' THEN RETURN edupulse_private.dean_remove_loads(command->'keys');
  WHEN 'students.import' THEN RETURN edupulse_private.dean_import_students(command->'students',command->>'filename');
  ELSE RAISE EXCEPTION 'Unsupported Dean action' USING ERRCODE='22023';
 END CASE;
END $$;

DO $$ DECLARE f text; BEGIN
 FOREACH f IN ARRAY ARRAY['dean_clean(text,integer)','dean_code_key(text)','dean_block(text)','dean_course(text,text)','dean_new_user(text,text,text,text,jsonb,jsonb)','dean_restore_user(uuid,text,text,text)',
  'dean_roster(text,text,text,integer,text,text,text)','dean_block_capacity()','dean_directory()','dean_account_create(jsonb)','dean_account_update(jsonb)','dean_account_status(uuid,text)',
  'dean_assign_loads(jsonb,text)','dean_remove_loads(jsonb)','dean_import_students(jsonb,text)'] LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION edupulse_private.%s FROM PUBLIC,anon,authenticated',f);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.edupulse_dean_command(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_dean_command(jsonb) TO authenticated;

-- The admin's "view as Dean" support mode forwards the same commands and reads the directory.
DO $$ DECLARE definition text; BEGIN
 IF to_regprocedure('public.edupulse_support_action(uuid,text,jsonb)') IS NULL THEN RETURN; END IF;
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'IF operation NOT IN (','IF operation NOT IN (''dean.command'',');
 definition:=replace(definition,'IF operation IN (''enter'',','IF operation IN (''dean.command'',''enter'',');
 definition:=replace(definition,$find$WHEN 'students.read' THEN$find$,$patch$WHEN 'dean.command' THEN
  IF subject_role<>'dean' THEN RAISE EXCEPTION 'Dean account required' USING ERRCODE='42501'; END IF;
  result:=public.edupulse_dean_command(input);
 WHEN 'students.read' THEN$patch$);
 definition:=replace(definition,'''mode'',''cloud'',','''mode'',''cloud'',''directory'',CASE WHEN subject_role=''dean'' THEN edupulse_private.dean_directory() END,');
 IF strpos(definition,'WHEN ''dean.command''')=0 OR strpos(definition,'edupulse_private.dean_directory()')=0 OR strpos(definition,'IF operation IN (''dean.command''')=0 OR strpos(definition,'IF operation NOT IN (''dean.command''')=0
  THEN RAISE EXCEPTION 'Dean support patch unavailable'; END IF;
 EXECUTE definition;
END $$;
