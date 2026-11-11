-- Only explicit syllabus fields cross accounts. Private copies, file bytes and history never do.
CREATE FUNCTION edupulse_private.syllabus_share_section(value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce((SELECT jsonb_object_agg(key,v) FROM jsonb_each(value) e(key,v)
  WHERE key=ANY(ARRAY['id','ilos','contents','activities','assessments','assessmentTypes','week'])), '{}'::jsonb) ||
 jsonb_build_object('resources',coalesce((SELECT jsonb_agg(jsonb_build_object('type','link','name',r->>'name','url',r->>'url')) FROM jsonb_array_elements(coalesce(value->'resources','[]')) r WHERE r->>'url' ~ '^https?://'),'[]'))
$$;
REVOKE ALL ON FUNCTION edupulse_private.syllabus_share_section(jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION edupulse_private.syllabus_share_snapshot(value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce((SELECT jsonb_object_agg(key,v) FROM jsonb_each(value) e(key,v) WHERE key=ANY(ARRAY[
  'courseCode','courseTitle','courseInfo','courseDescription','institutionalContext','programOutcomes',
  'courseRequirements','gradingSystem','coursePolicy'])), '{}'::jsonb) || jsonb_build_object(
  'courseOutline',coalesce((SELECT jsonb_agg(edupulse_private.syllabus_share_section(row) ||
   CASE WHEN row ? 'sections' THEN jsonb_build_object('sections',(SELECT jsonb_agg(edupulse_private.syllabus_share_section(s)) FROM jsonb_array_elements(row->'sections') s)) ELSE '{}'::jsonb END)
   FROM jsonb_array_elements(coalesce(value->'courseOutline','[]')) row),'[]'),
  'books',coalesce((SELECT jsonb_agg(CASE WHEN jsonb_typeof(b)='string' THEN b ELSE jsonb_build_object('title',b->>'title','authors',b->'authors','year',b->'year','publisher',b->>'publisher','doi',b->>'doi','isbn',b->>'isbn','url',CASE WHEN b->>'url' ~ '^https?://' THEN b->>'url' ELSE '' END) END) FROM jsonb_array_elements(coalesce(value->'books',value->'references'->'books','[]')) b),'[]'),
  'onlineReferences',coalesce((SELECT jsonb_agg(CASE WHEN jsonb_typeof(b)='string' THEN b ELSE jsonb_build_object('title',b->>'title','url',CASE WHEN b->>'url' ~ '^https?://' THEN b->>'url' ELSE '' END,'authors',b->'authors','year',b->'year','publisher',b->>'publisher') END) FROM jsonb_array_elements(coalesce(value->'onlineReferences',value->'references'->'onlineReferences',CASE WHEN jsonb_typeof(value->'references')='array' THEN value->'references' END,'[]')) b),'[]'))
$$;
REVOKE ALL ON FUNCTION edupulse_private.syllabus_share_snapshot(jsonb) FROM PUBLIC,anon,authenticated;
CREATE TABLE public.edupulse_syllabus_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, syllabus_id text NOT NULL CHECK(length(syllabus_id) BETWEEN 1 AND 120),
 sender_name text NOT NULL, recipient_name text NOT NULL, snapshot jsonb NOT NULL CHECK(octet_length(snapshot::text)<=250000),
 created_at timestamptz NOT NULL DEFAULT now(), recipient_hidden boolean NOT NULL DEFAULT false,
 UNIQUE(sender_id,syllabus_id,recipient_id), CHECK(sender_id<>recipient_id)
);
ALTER TABLE public.edupulse_syllabus_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_syllabus_shares FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.edupulse_syllabus_shares TO authenticated;
CREATE INDEX edupulse_syllabus_shares_recipient_idx ON public.edupulse_syllabus_shares(recipient_id,created_at DESC);
CREATE POLICY syllabus_shares_participants ON public.edupulse_syllabus_shares FOR SELECT TO authenticated
 USING ((SELECT edupulse_private.academic_role()) IN ('instructor','admin') AND
  (sender_id=(SELECT auth.uid()) OR (recipient_id=(SELECT auth.uid()) AND NOT recipient_hidden)));
-- Elevated only for explicit cross-account delivery. Neither workspace can be edited here.
CREATE FUNCTION edupulse_private.syllabus_share_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); recipient auth.users; author auth.users; saved public.edupulse_workspaces;
 source jsonb; shared public.edupulse_syllabus_shares; affected uuid;
BEGIN
 IF actor IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RAISE EXCEPTION 'Instructor required' USING ERRCODE='42501'; END IF;
 IF command->>'operation'='send' THEN
  IF length(coalesce(command->>'syllabus','')) NOT BETWEEN 1 AND 120 OR length(coalesce(command->>'email','')) NOT BETWEEN 3 AND 254 THEN RAISE EXCEPTION 'Select a saved syllabus and instructor email' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('syllabus-share:'||actor::text));
  SELECT * INTO saved FROM public.edupulse_workspaces WHERE owner_id=actor FOR SHARE;
  IF saved.revision IS DISTINCT FROM (command->>'revision')::bigint THEN RAISE EXCEPTION 'Save pending changes and reload before sharing' USING ERRCODE='40001'; END IF;
  SELECT s INTO source FROM jsonb_array_elements(saved.data->'syllabi') s WHERE s->>'id'=command->>'syllabus' AND coalesce(s->>'sample','false')='false';
  IF source IS NULL THEN RAISE EXCEPTION 'Owned saved syllabus required' USING ERRCODE='42501'; END IF;
  SELECT * INTO recipient FROM auth.users WHERE lower(email)=lower(trim(command->>'email')) AND raw_app_meta_data->>'role'='instructor' AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<now());
  IF recipient.id IS NULL OR recipient.id=actor THEN RAISE EXCEPTION 'Enter another registered instructor email' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM public.edupulse_syllabus_shares WHERE sender_id=actor)>=100 AND NOT EXISTS(SELECT 1 FROM public.edupulse_syllabus_shares WHERE sender_id=actor AND syllabus_id=source->>'id' AND recipient_id=recipient.id) THEN RAISE EXCEPTION 'Remove an old share before adding another (100 shares)' USING ERRCODE='22023'; END IF;
  SELECT * INTO author FROM auth.users WHERE id=actor;
  INSERT INTO public.edupulse_syllabus_shares(sender_id,recipient_id,syllabus_id,sender_name,recipient_name,snapshot)
   VALUES(actor,recipient.id,source->>'id',coalesce(nullif(author.raw_user_meta_data->>'full_name',''),author.email),coalesce(nullif(recipient.raw_user_meta_data->>'full_name',''),recipient.email),edupulse_private.syllabus_share_snapshot(source))
   ON CONFLICT(sender_id,syllabus_id,recipient_id) DO UPDATE SET snapshot=excluded.snapshot,sender_name=excluded.sender_name,recipient_name=excluded.recipient_name,created_at=now(),recipient_hidden=false RETURNING * INTO shared;
  RETURN jsonb_build_object('id',shared.id,'recipient',shared.recipient_name);
 ELSIF command->>'operation'='remove' THEN
  UPDATE public.edupulse_syllabus_shares SET recipient_hidden=true WHERE id=(command->>'id')::uuid AND recipient_id=actor RETURNING id INTO affected;
  IF affected IS NULL THEN DELETE FROM public.edupulse_syllabus_shares WHERE id=(command->>'id')::uuid AND sender_id=actor RETURNING id INTO affected; END IF;
  IF affected IS NULL THEN RAISE EXCEPTION 'Shared syllabus unavailable' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('removed',affected);
 END IF;
 RAISE EXCEPTION 'Unsupported sharing operation' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION edupulse_private.syllabus_share_command(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.syllabus_share_command(jsonb) TO authenticated;
CREATE FUNCTION public.edupulse_syllabus_share(command jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.syllabus_share_command(command) $$;
REVOKE ALL ON FUNCTION public.edupulse_syllabus_share(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_syllabus_share(jsonb) TO authenticated;
-- Extend the audited support gateway while preserving its other cases and grants.
DO $outer$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure) INTO body;
 body:=replace(body,'''students.read'') THEN','''students.read'',''syllabi.read'',''syllabi.open'',''syllabi.command'') THEN');
 body:=replace(body,'''academic.command'') THEN','''academic.command'',''syllabi.command'') THEN');
 body:=replace(body,'WHEN ''students.read'' THEN',
  'WHEN ''syllabi.read'' THEN SELECT coalesce(jsonb_agg(to_jsonb(t)-''snapshot'' || jsonb_build_object(''courseCode'',snapshot->>''courseCode'',''courseTitle'',snapshot->>''courseTitle'') ORDER BY created_at DESC,id),''[]'') INTO result FROM (SELECT * FROM public.edupulse_syllabus_shares ORDER BY created_at DESC,id LIMIT 1001) t;
   WHEN ''syllabi.open'' THEN SELECT snapshot INTO result FROM public.edupulse_syllabus_shares WHERE id=(input->>''id'')::uuid;
   WHEN ''syllabi.command'' THEN result:=public.edupulse_syllabus_share(input);
   WHEN ''students.read'' THEN');
 EXECUTE body;
END $outer$;
