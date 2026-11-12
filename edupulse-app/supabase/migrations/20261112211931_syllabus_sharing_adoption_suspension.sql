-- Explicit recipient selection, adoption, and a saved suspension before removal.
ALTER TABLE public.edupulse_syllabus_shares ADD COLUMN sender_suspended boolean NOT NULL DEFAULT false, ADD COLUMN recipient_suspended boolean NOT NULL DEFAULT false;
CREATE FUNCTION edupulse_private.syllabus_recipients() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RAISE EXCEPTION 'Instructor required' USING ERRCODE='42501'; END IF;
 IF (SELECT count(*) FROM auth.users WHERE id<>auth.uid() AND raw_app_meta_data->>'role'='instructor' AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<now()))>500 THEN RAISE EXCEPTION 'Instructor directory exceeds 500 accounts; refine the directory before sharing' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',coalesce(nullif(raw_user_meta_data->>'full_name',''),email),'email',email) ORDER BY lower(coalesce(raw_user_meta_data->>'full_name',email)),id),'[]') INTO result
 FROM auth.users WHERE id<>auth.uid() AND raw_app_meta_data->>'role'='instructor' AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<now());
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.syllabus_recipients() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.syllabus_recipients() TO authenticated;
CREATE FUNCTION public.edupulse_syllabus_recipients() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.syllabus_recipients() $$;
REVOKE ALL ON FUNCTION public.edupulse_syllabus_recipients() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_syllabus_recipients() TO authenticated;
ALTER FUNCTION edupulse_private.syllabus_share_command(jsonb) RENAME TO syllabus_share_legacy_command;
REVOKE ALL ON FUNCTION edupulse_private.syllabus_share_legacy_command(jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION edupulse_private.syllabus_share_command(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); shared public.edupulse_syllabus_shares; saved public.edupulse_workspaces;
 source jsonb; copy jsonb; next_data jsonb; existing jsonb; recipient_email text; approved boolean; adopted_id text; result jsonb;
BEGIN
 IF actor IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RAISE EXCEPTION 'Instructor required' USING ERRCODE='42501'; END IF;
 IF command->>'operation'='send' THEN
  SELECT * INTO saved FROM public.edupulse_workspaces WHERE owner_id=actor FOR SHARE;
  SELECT s INTO source FROM jsonb_array_elements(saved.data->'syllabi') s WHERE s->>'id'=command->>'syllabus';
  IF source->>'suspended'='true' THEN RAISE EXCEPTION 'Resume this syllabus before sharing' USING ERRCODE='22023'; END IF;
  IF command ? 'recipient' THEN
   SELECT email INTO recipient_email FROM auth.users WHERE id=(command->>'recipient')::uuid AND raw_app_meta_data->>'role'='instructor' AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<now());
   IF recipient_email IS NULL THEN RAISE EXCEPTION 'Select an available registered instructor' USING ERRCODE='22023'; END IF;
   command:=(command-'recipient')||jsonb_build_object('email',recipient_email);
  END IF;
  result:=edupulse_private.syllabus_share_legacy_command(command);
  UPDATE public.edupulse_syllabus_shares SET sender_suspended=false WHERE id=(result->>'id')::uuid;
  RETURN result;
 END IF;
 SELECT * INTO shared FROM public.edupulse_syllabus_shares WHERE id=(command->>'id')::uuid AND (sender_id=actor OR recipient_id=actor AND NOT recipient_hidden) FOR UPDATE;
 IF shared.id IS NULL THEN RAISE EXCEPTION 'Shared syllabus unavailable' USING ERRCODE='42501'; END IF;
 IF command->>'operation' IN ('suspend','resume') THEN
  UPDATE public.edupulse_syllabus_shares SET sender_suspended=CASE WHEN sender_id=actor THEN command->>'operation'='suspend' ELSE sender_suspended END, recipient_suspended=CASE WHEN recipient_id=actor THEN command->>'operation'='suspend' ELSE recipient_suspended END WHERE id=shared.id;
  RETURN jsonb_build_object('id',shared.id,'suspended',command->>'operation'='suspend');
 ELSIF command->>'operation'='remove' THEN
  IF NOT (CASE WHEN shared.sender_id=actor THEN shared.sender_suspended ELSE shared.recipient_suspended END) THEN RAISE EXCEPTION 'Suspend this shared entry before deleting it' USING ERRCODE='22023'; END IF;
  RETURN edupulse_private.syllabus_share_legacy_command(command);
 ELSIF command->>'operation'='adopt' THEN
  IF shared.recipient_id<>actor OR shared.sender_suspended OR shared.recipient_suspended THEN RAISE EXCEPTION 'An available received syllabus is required' USING ERRCODE='42501'; END IF;
  IF command->>'mode' NOT IN ('draft','approved') OR command->>'mode' IS NULL THEN RAISE EXCEPTION 'Select draft or approved use' USING ERRCODE='22023'; END IF;
  IF command->>'mode'='approved' AND command->>'approvalAttested' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Confirm the offline approval before approved use' USING ERRCODE='22023'; END IF;
  SELECT * INTO saved FROM public.edupulse_workspaces WHERE owner_id=actor FOR UPDATE;
  SELECT s INTO existing FROM jsonb_array_elements(coalesce(saved.data->'syllabi','[]')) s WHERE s->'sharedFrom'->>'id'=shared.id::text AND s->'sharedFrom'->>'mode'=command->>'mode';
  IF existing IS NOT NULL THEN RETURN jsonb_build_object('id',existing->>'id','revision',saved.revision,'reused',true); END IF;
  IF coalesce(saved.revision,0) IS DISTINCT FROM (command->>'revision')::bigint THEN RAISE EXCEPTION 'Save pending changes and reload before adopting a syllabus' USING ERRCODE='40001'; END IF;
  IF jsonb_array_length(coalesce(saved.data->'syllabi','[]'))>=50 THEN RAISE EXCEPTION 'Workspace supports up to 50 syllabi' USING ERRCODE='22023'; END IF;
  adopted_id:=gen_random_uuid()::text;
  copy:=shared.snapshot||jsonb_build_object('id',adopted_id,'instructorId',actor,'version',1,'sample',false,'status','drafted','history','[]'::jsonb,'versions','[]'::jsonb,'sharedBy',jsonb_build_object('id',shared.sender_id,'name',shared.sender_name),'sharedFrom',jsonb_build_object('id',shared.id,'mode',command->>'mode'),'lastUpdated',now());
  IF command->>'mode'='approved' THEN
   SELECT s INTO source FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(w.data->'syllabi') s WHERE w.owner_id=shared.sender_id AND s->>'id'=shared.syllabus_id;
   approved:=source->>'status' IN ('active','approved_uploaded') AND coalesce(source->>'suspended','false')='false' AND source->'approvedFile'->>'approvalAttested'='true' AND source->'approvedFile'->>'base64' IS NOT NULL AND edupulse_private.syllabus_share_snapshot(source)=shared.snapshot;
   IF NOT coalesce(approved,false) THEN RAISE EXCEPTION 'The sender must retain a matching approved copy. Ask them to reshare it, or use this syllabus as a draft.' USING ERRCODE='22023'; END IF;
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(copy->'courseOutline') r WHERE length(btrim(coalesce(r->>'ilos','')))>0 AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(r->'contents','[]')) t WHERE length(btrim(t))>0)) THEN RAISE EXCEPTION 'A usable approved outline is required' USING ERRCODE='22023'; END IF;
   IF (source->'approvedFile'->>'size')::integer NOT BETWEEN 1 AND 750000 OR NOT ((source->'approvedFile'->>'name' ~* '\.pdf$' AND encode(substring(decode(source->'approvedFile'->>'base64','base64') FROM 1 FOR 5),'hex')='255044462d') OR (source->'approvedFile'->>'name' ~* '\.docx$' AND encode(substring(decode(source->'approvedFile'->>'base64','base64') FROM 1 FOR 4),'hex')='504b0304')) THEN RAISE EXCEPTION 'A valid retained approved PDF or DOCX up to 750 KB is required' USING ERRCODE='22023'; END IF;
   IF octet_length(decode(source->'approvedFile'->>'base64','base64')) IS DISTINCT FROM (source->'approvedFile'->>'size')::integer OR encode(sha256(decode(source->'approvedFile'->>'base64','base64')),'hex') IS DISTINCT FROM source->'approvedFile'->>'sha256' THEN RAISE EXCEPTION 'The retained approved file failed its checksum or size check' USING ERRCODE='22023'; END IF;
   copy:=copy||jsonb_build_object('status','active','approvedFile',source->'approvedFile','extractedAt',now(),'sharedApprovalAcknowledgedAt',now());
  END IF;
  next_data:=coalesce(saved.data,jsonb_build_object('syllabi','[]'::jsonb,'content','{}'::jsonb,'registrations','[]'::jsonb));
  next_data:=jsonb_set(next_data,'{syllabi}',(next_data->'syllabi')||jsonb_build_array(copy));
  IF octet_length(next_data::text)>3000000 THEN RAISE EXCEPTION 'Workspace is near its 3 MB limit; export a backup and remove unused attachments' USING ERRCODE='22023'; END IF;
  PERFORM public.edupulse_save_workspace(coalesce(saved.revision,0),next_data);
  RETURN jsonb_build_object('id',adopted_id,'revision',coalesce(saved.revision,0)+1,'reused',false);
 END IF;
 RAISE EXCEPTION 'Unsupported sharing operation' USING ERRCODE='22023';
END $$;
REVOKE ALL ON FUNCTION edupulse_private.syllabus_share_command(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.syllabus_share_command(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.edupulse_syllabus_share(command jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT edupulse_private.syllabus_share_command(command) $$;
CREATE FUNCTION edupulse_private.validate_syllabus_removal() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE earlier jsonb; current_syllabus jsonb;
BEGIN
 IF TG_OP='UPDATE' THEN
  FOR earlier IN SELECT value FROM jsonb_array_elements(OLD.data->'syllabi') LOOP
   SELECT value INTO current_syllabus FROM jsonb_array_elements(NEW.data->'syllabi') WHERE value->>'id'=earlier->>'id';
   IF current_syllabus IS NULL AND (earlier->>'suspended' IS DISTINCT FROM 'true' OR earlier->>'status' IS DISTINCT FROM 'archived') THEN RAISE EXCEPTION 'Suspend the syllabus in a saved update before deleting it' USING ERRCODE='22023'; END IF;
  END LOOP;
 END IF;
 FOR current_syllabus IN SELECT value FROM jsonb_array_elements(NEW.data->'syllabi') LOOP
  IF current_syllabus->>'suspended'='true' AND current_syllabus->>'status' IS DISTINCT FROM 'archived' THEN RAISE EXCEPTION 'A suspended syllabus must remain inactive' USING ERRCODE='22023'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.validate_syllabus_removal() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER edupulse_validate_syllabus_removal BEFORE INSERT OR UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.validate_syllabus_removal();
DO $outer$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure) INTO body;
 body:=replace(body,'''syllabi.read'',''syllabi.open'',''syllabi.command''','''syllabi.read'',''syllabi.open'',''syllabi.recipients'',''syllabi.command''');
 body:=replace(body,'WHEN ''syllabi.read'' THEN','WHEN ''syllabi.recipients'' THEN result:=public.edupulse_syllabus_recipients(); WHEN ''syllabi.read'' THEN');
 EXECUTE body;
END $outer$;
