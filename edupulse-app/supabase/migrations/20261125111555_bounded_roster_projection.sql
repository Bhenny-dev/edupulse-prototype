-- A workspace projection already holds the institutional-import advisory lock.
-- Check its loaded course/block once per roster, rather than detoasting the same
-- multi-megabyte workspace for each enrolled student. Proof exists only inside
-- the trigger's roster loop and is never writable/readable by browser roles.
CREATE TABLE IF NOT EXISTS edupulse_private.roster_projection_context (
 transaction_id bigint NOT NULL,
 course_id text NOT NULL,
 instructor_id uuid NOT NULL,
 block_section text NOT NULL,
 course_code text NOT NULL,
 academic_year text,
 semester text,
 overrides jsonb NOT NULL,
 PRIMARY KEY(transaction_id,course_id,block_section)
);
ALTER TABLE edupulse_private.roster_projection_context ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.roster_projection_context FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS edupulse_enrollment_course_block ON public.edupulse_enrollments(course_id,block_section);

DO $patch$
DECLARE body text; before_students text:=$before$   FOR student IN SELECT value FROM jsonb_array_elements(coalesce(r->'students','[]')) LOOP$before$;
 after_students text:=$after$   END LOOP;
  END LOOP;
 END LOOP;
 FOR item$after$;
BEGIN
 SELECT pg_get_functiondef('edupulse_private.project_workspace()'::regprocedure) INTO body;
 IF strpos(body,'roster_projection_context')=0 THEN
  IF strpos(body,before_students)=0 OR strpos(body,after_students)=0 THEN RAISE EXCEPTION 'Review the changed workspace projector before adding bounded roster projection';END IF;
  body:=replace(body,before_students,$replacement$   INSERT INTO edupulse_private.roster_projection_context(transaction_id,course_id,instructor_id,block_section,course_code,academic_year,semester,overrides)
   SELECT txid_current(),cid,NEW.owner_id,coalesce(r->>'blockSection',''),s->>'courseCode',s->'courseInfo'->>'academicYear',s->'courseInfo'->>'periodOffered',
    coalesce((SELECT jsonb_agg(d) FROM jsonb_array_elements(coalesce(NEW.data->'enrollmentOverrides','[]')) d WHERE d->>'courseCode'=s->>'courseCode'),'[]')
   WHERE edupulse_private.course_has_current_load(cid,coalesce(r->>'blockSection',''))
   ON CONFLICT(transaction_id,course_id,block_section) DO UPDATE SET overrides=excluded.overrides;
   IF NOT FOUND THEN CONTINUE;END IF;
$replacement$||before_students);
  body:=replace(body,after_students,$replacement$   END LOOP;
   DELETE FROM edupulse_private.roster_projection_context WHERE transaction_id=txid_current() AND course_id=cid AND block_section=coalesce(r->>'blockSection','');
  END LOOP;
 END LOOP;
 FOR item$replacement$);
  EXECUTE body;
 END IF;
END $patch$;

CREATE OR REPLACE FUNCTION edupulse_private.guard_roster_membership() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE decision jsonb; code text; snapshot jsonb; scope_year text; scope_semester text;
 proof edupulse_private.roster_projection_context;
BEGIN
 SELECT * INTO proof FROM edupulse_private.roster_projection_context p
 WHERE p.transaction_id=txid_current() AND p.course_id=NEW.course_id AND p.instructor_id=NEW.instructor_id AND p.block_section=NEW.block_section AND pg_trigger_depth()>1;
 IF FOUND THEN
  code:=proof.course_code;snapshot:=jsonb_build_object('enrollmentOverrides',proof.overrides);scope_year:=proof.academic_year;scope_semester:=proof.semester;
 ELSE
  IF NOT edupulse_private.course_has_current_load(NEW.course_id,NEW.block_section) THEN RETURN NULL;END IF;
  SELECT c.course_code,w.data,c.academic_year,c.semester INTO code,snapshot,scope_year,scope_semester FROM public.edupulse_courses c
  JOIN public.edupulse_workspaces w ON w.owner_id=c.instructor_id WHERE c.id=NEW.course_id AND c.instructor_id=NEW.instructor_id;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 FOR decision IN SELECT value FROM jsonb_array_elements(coalesce(snapshot->'enrollmentOverrides','[]'))
 WHERE value->>'courseCode'=code AND lower(value->>'studentEmail')=NEW.student_email
 AND coalesce(nullif(value->>'academicYear',''),'2026-2027')=coalesce(nullif(scope_year,''),'2026-2027')
 AND edupulse_private.canonical_semester(coalesce(nullif(value->>'semester',''),'1st Semester'))=edupulse_private.canonical_semester(coalesce(nullif(scope_semester,''),'1st Semester')) LOOP
  IF decision->>'excluded'='true' THEN RETURN NULL;END IF;
  NEW.suspended:=coalesce((decision->>'suspended')::boolean,false);
  NEW.year_level:=nullif(decision->>'yearLevel','')::integer;
  NEW.display_name:=coalesce(nullif(btrim(decision->>'displayName'),''),NEW.display_name);
  NEW.student_ref:=coalesce(btrim(decision->>'studentRef'),NEW.student_ref);
  IF nullif(btrim(decision->>'blockSection'),'') IS NOT NULL THEN NEW.block_section:=upper(btrim(decision->>'blockSection'));END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.edupulse_enrollments WHERE course_id=NEW.course_id AND block_section=NEW.block_section AND student_email<>NEW.student_email)>=35 THEN
  RAISE EXCEPTION 'A course block supports up to 35 students' USING ERRCODE='22023';
 END IF;
 RETURN NEW;
END $function$;
