-- A PostgreSQL maintenance backfill is archival, never a live handover.
-- No authenticated/anon/service role, JWT or public RPC can select this branch.
DO $$ DECLARE body text; BEGIN
 body:=pg_get_functiondef('edupulse_private.continue_load_teaching()'::regprocedure);
 body:=replace(body,'BEGIN', $patch$BEGIN
 IF NEW.kind='loads' AND NEW.data->>'AllocationSource'='approved-historical-teaching-load'
  AND NEW.data->>'LoadType'='course' AND edupulse_private.completed_term(NEW.data->>'AcademicYear',NEW.data->>'Semester')
  AND auth.uid() IS NULL AND session_user='postgres' AND current_setting('role')='none'
 THEN RETURN NEW; END IF;$patch$);
 IF strpos(body,'approved-historical-teaching-load')=0 THEN RAISE EXCEPTION 'Historical backfill guard patch unavailable';END IF;
 EXECUTE body;
END $$;
