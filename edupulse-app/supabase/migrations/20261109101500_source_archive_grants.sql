-- Override project default grants as well as explicit grants. TRUNCATE bypasses RLS.
REVOKE ALL ON public.edupulse_source_archives FROM authenticated,anon;
GRANT SELECT,INSERT,DELETE ON public.edupulse_source_archives TO authenticated;
