-- All selection, import and disconnect operations share the same owner lock.
CREATE FUNCTION public.edupulse_import_provider(provider_name text,protected_value text,saved_id text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-provider:'||auth.uid()::text));
 IF NOT EXISTS(SELECT 1 FROM public.edupulse_provider_connections WHERE owner_id=auth.uid()) THEN
  PERFORM public.edupulse_save_provider(provider_name,protected_value,saved_id,true);
 END IF;
END $$;
CREATE FUNCTION public.edupulse_disconnect_provider(provider_name text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-provider:'||auth.uid()::text));
 IF provider_name IS NULL THEN
  UPDATE public.edupulse_provider_connections SET ciphertext=NULL,connection_id=NULL,active=false,updated_at=now() WHERE owner_id=auth.uid();
 ELSE
  INSERT INTO public.edupulse_provider_connections(owner_id,provider,ciphertext,active) VALUES(auth.uid(),provider_name,NULL,false)
  ON CONFLICT(owner_id,provider) DO UPDATE SET ciphertext=NULL,connection_id=NULL,active=false,updated_at=now();
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.edupulse_import_provider(text,text,text),public.edupulse_disconnect_provider(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_import_provider(text,text,text),public.edupulse_disconnect_provider(text) TO authenticated;
