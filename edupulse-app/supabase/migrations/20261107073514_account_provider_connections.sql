CREATE TABLE public.edupulse_provider_connections (
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK(provider IN ('ollama','gemini','openai','groq','anthropic','openrouter','huggingface')),
 ciphertext text CHECK(length(ciphertext) BETWEEN 40 AND 6000),
 connection_id text,
 active boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT active OR (ciphertext IS NOT NULL AND connection_id IS NOT NULL)),
 PRIMARY KEY(owner_id,provider)
);
ALTER TABLE public.edupulse_provider_connections ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX edupulse_provider_active ON public.edupulse_provider_connections(owner_id) WHERE active;
REVOKE ALL ON public.edupulse_provider_connections FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.edupulse_provider_connections TO authenticated;
CREATE POLICY provider_self ON public.edupulse_provider_connections TO authenticated
 USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE FUNCTION public.edupulse_save_provider(provider_name text,protected_value text,saved_id text,activate boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 -- Serialize selection changes for this account without widening RLS.
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-provider:'||auth.uid()::text));
 IF NOT activate THEN
   UPDATE public.edupulse_provider_connections SET ciphertext=protected_value,updated_at=now()
   WHERE owner_id=auth.uid() AND provider=provider_name AND connection_id=saved_id AND ciphertext IS NOT NULL;
   RETURN;
 END IF;
 UPDATE public.edupulse_provider_connections SET active=false WHERE owner_id=auth.uid() AND active;
 INSERT INTO public.edupulse_provider_connections(owner_id,provider,ciphertext,connection_id,active)
 VALUES(auth.uid(),provider_name,protected_value,saved_id,true)
 ON CONFLICT(owner_id,provider) DO UPDATE SET ciphertext=excluded.ciphertext,
 connection_id=excluded.connection_id,active=true,updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.edupulse_save_provider(text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_save_provider(text,text,text,boolean) TO authenticated;
