-- Keep legacy reviewed file imports compatible; structured manual details are validated atomically.
ALTER FUNCTION edupulse_private.course_assignment_command(jsonb) RENAME TO course_assignment_core;
CREATE FUNCTION edupulse_private.course_assignment_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; d jsonb:=command->'details'; k text; field text; n numeric; saved text;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501';END IF;
 IF d IS NOT NULL THEN
  IF command->>'action' NOT IN ('course-load.assign','course-load.update') OR jsonb_typeof(d)<>'object' THEN RAISE EXCEPTION 'Invalid course load details' USING ERRCODE='22023';END IF;
  FOREACH field IN ARRAY ARRAY['time','days','room','program','units','lecture','lab','hours'] LOOP
   IF length(btrim(coalesce(d->>field,''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Complete the required load details: %',field USING ERRCODE='22023';END IF;
  END LOOP;
  FOREACH field IN ARRAY ARRAY['units','lecture','lab','hours','students','computed_hours'] LOOP
   IF field='students' AND coalesce(d->>field,'')='' THEN CONTINUE;END IF;
   IF coalesce(d->>field,'')!~'^\d+(\.\d+)?$' THEN RAISE EXCEPTION 'Enter a valid numeric load value: %',field USING ERRCODE='22023';END IF;
   n:=(d->>field)::numeric;
   IF n<0 OR n>100000 OR (field IN ('units','hours','computed_hours') AND n<=0) OR (field='students' AND n<>trunc(n)) THEN RAISE EXCEPTION 'Invalid load value: %',field USING ERRCODE='22023';END IF;
  END LOOP;
 END IF;
 result:=edupulse_private.course_assignment_core(command);
 IF d IS NOT NULL THEN
  UPDATE public.edupulse_institutional_records r SET data=r.data||jsonb_build_object('ScheduleTime',btrim(d->>'time'),'ScheduleDays',btrim(d->>'days'),'Units',d->>'units','LectureUnits',d->>'lecture','LabUnits',d->>'lab','DeclaredHours',d->>'hours','ComputedHours',d->>'computed_hours','Room',btrim(d->>'room'),'StudentCount',coalesce(d->>'students',''),'Program',btrim(d->>'program'),'ManualLoadDetails','Yes'),updated_by=auth.uid(),updated_at=clock_timestamp()
  WHERE r.kind='loads' AND r.record_key=result->>'key' RETURNING record_key INTO saved;
  IF saved IS NULL THEN RAISE EXCEPTION 'Course load was not saved' USING ERRCODE='40001';END IF;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.course_assignment_command(jsonb),edupulse_private.course_assignment_core(jsonb) FROM PUBLIC,anon,authenticated;
