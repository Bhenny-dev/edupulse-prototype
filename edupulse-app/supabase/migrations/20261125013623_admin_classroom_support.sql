-- Extend the existing invoker support gateway; keep fresh Admin/subject checks,
-- subject-scoped classroom RPCs, audit attribution and claim restoration.
DO $$ DECLARE body text; original text; marker text; insertion integer; BEGIN
 body:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 original:=body;
 body:=replace(body,$old$IF operation NOT IN ($old$,$new$IF operation NOT IN ('classroom.command',$new$);
 body:=replace(body,$old$IF operation IN ($old$,$new$IF operation IN ('classroom.command',$new$);
 body:=replace(body,$old$WHEN 'students.read' THEN$old$,$new$
 WHEN 'classroom.command' THEN
  IF subject_role<>'instructor' THEN RAISE EXCEPTION 'Instructor account required' USING ERRCODE='42501'; END IF;
  CASE input->>'operation'
  WHEN 'class-code' THEN result:=public.edupulse_class_code_command(input-'operation');
  WHEN 'announcement' THEN result:=public.edupulse_announcement_command(input->'command');
  ELSE RAISE EXCEPTION 'Unsupported classroom support action' USING ERRCODE='42501';
  END CASE;
 WHEN 'students.read' THEN$new$);
 -- These read-only projections run only after the gateway adopts the verified subject.
 marker:=$old$PERFORM set_config('request.jwt.claims',coalesce(claims,''),true);$old$;
 insertion:=strpos(body,marker);
 IF insertion=0 THEN RAISE EXCEPTION 'Support claim restoration unavailable'; END IF;
 body:=overlay(body placing $new$
 IF operation='academic.read' AND subject_role IN ('instructor','student') THEN
  result:=result||jsonb_build_object('classCodes',public.edupulse_class_codes()->'codes',
   'classJoins',public.edupulse_class_codes()->'joins','announcements',public.edupulse_class_announcements());
 END IF;
 $new$ from insertion for 0);
 IF body=original OR strpos(body,'WHEN ''classroom.command'' THEN')=0 OR strpos(body,'''classCodes'',public.edupulse_class_codes()')=0 THEN
  RAISE EXCEPTION 'Classroom support gateway patch unavailable';
 END IF;
 EXECUTE body;
END $$;
