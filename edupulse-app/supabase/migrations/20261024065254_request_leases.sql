CREATE TABLE edupulse_private.request_leases (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL DEFAULT now(), request_count integer NOT NULL DEFAULT 0,
 lease_id uuid, lease_until timestamptz
);
ALTER TABLE edupulse_private.request_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.request_leases FROM PUBLIC,anon,authenticated;
CREATE FUNCTION edupulse_private.ai_lease(lease uuid, release boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE state edupulse_private.request_leases;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('admin','dean','associate_dean','instructor','student') THEN RAISE EXCEPTION 'Academic account required' USING ERRCODE='42501'; END IF;
 INSERT INTO edupulse_private.request_leases(owner_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
 SELECT * INTO state FROM edupulse_private.request_leases WHERE owner_id=auth.uid() FOR UPDATE;
 IF release THEN
  UPDATE edupulse_private.request_leases SET lease_id=NULL,lease_until=NULL WHERE owner_id=auth.uid() AND lease_id=lease;
  RETURN true;
 END IF;
 IF state.lease_until>now() OR (state.window_start>now()-interval '60 seconds' AND state.request_count>=20) THEN RETURN false; END IF;
 UPDATE edupulse_private.request_leases SET request_count=CASE WHEN window_start<=now()-interval '60 seconds' THEN 1 ELSE request_count+1 END,
  window_start=CASE WHEN window_start<=now()-interval '60 seconds' THEN now() ELSE window_start END, lease_id=lease,lease_until=now()+interval '130 seconds' WHERE owner_id=auth.uid();
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.ai_lease(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.ai_lease(uuid,boolean) TO authenticated;
CREATE FUNCTION public.edupulse_ai_lease(lease uuid, release boolean DEFAULT false) RETURNS boolean
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.ai_lease(lease,release) $$;
REVOKE ALL ON FUNCTION public.edupulse_ai_lease(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_ai_lease(uuid,boolean) TO authenticated;
