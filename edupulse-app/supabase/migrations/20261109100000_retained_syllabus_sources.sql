-- Immutable, owner-private reference snapshots live outside the 3 MB workspace.
CREATE TABLE public.edupulse_source_archives (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 reference_key text NOT NULL CHECK(reference_key ~ '^[a-f0-9]{64}$'), reference jsonb NOT NULL CHECK(octet_length(reference::text)<=8000),
 url text NOT NULL CHECK(length(url)<=2000), sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 255), mime text NOT NULL CHECK(length(mime)<=150),
 size integer NOT NULL CHECK(size BETWEEN 1 AND 2000000), text text NOT NULL CHECK(length(text) BETWEEN 80 AND 150000),
 base64 text NOT NULL CHECK(length(base64)<=2666668), pages integer NOT NULL CHECK(pages BETWEEN 0 AND 300),
 truncated boolean NOT NULL DEFAULT false, warnings jsonb NOT NULL DEFAULT '[]' CHECK(octet_length(warnings::text)<=8000),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,reference_key,sha256)
);
CREATE INDEX edupulse_sources_owner_key ON public.edupulse_source_archives(owner_id,reference_key,created_at DESC);
ALTER TABLE public.edupulse_source_archives ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,DELETE ON public.edupulse_source_archives TO authenticated;
REVOKE ALL ON public.edupulse_source_archives FROM anon;
CREATE POLICY retained_source_owner_read ON public.edupulse_source_archives FOR SELECT TO authenticated
 USING(owner_id=(select auth.uid()) AND (select auth.jwt()->'app_metadata'->>'role') IN ('instructor','admin'));
CREATE POLICY retained_source_owner_insert ON public.edupulse_source_archives FOR INSERT TO authenticated
 WITH CHECK(owner_id=(select auth.uid()) AND (select auth.jwt()->'app_metadata'->>'role') IN ('instructor','admin'));
CREATE POLICY retained_source_owner_delete ON public.edupulse_source_archives FOR DELETE TO authenticated
 USING(owner_id=(select auth.uid()) AND (select auth.jwt()->'app_metadata'->>'role') IN ('instructor','admin'));
-- No UPDATE grant/policy: an explicit refresh creates a new version instead of rewriting evidence.
CREATE FUNCTION public.edupulse_source_archive_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.owner_id::text,0));
 IF (SELECT count(*) FROM public.edupulse_source_archives WHERE owner_id=NEW.owner_id)>=200
 AND NOT EXISTS(SELECT 1 FROM public.edupulse_source_archives WHERE owner_id=NEW.owner_id AND reference_key=NEW.reference_key AND sha256=NEW.sha256)
 THEN RAISE EXCEPTION 'Retained source version limit reached' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.edupulse_source_archive_limit() FROM PUBLIC,anon;
CREATE TRIGGER edupulse_source_archive_quota BEFORE INSERT ON public.edupulse_source_archives
FOR EACH ROW EXECUTE FUNCTION public.edupulse_source_archive_limit();
