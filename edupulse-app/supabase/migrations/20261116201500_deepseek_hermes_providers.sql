-- DeepSeek and Hermes (Nous Portal) join the providers an account can connect.
-- The provider list is a CHECK on the column, so replace it whatever name it was given.
DO $$
DECLARE existing text;
BEGIN
  FOR existing IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.edupulse_provider_connections'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%huggingface%'
  LOOP
    EXECUTE format('ALTER TABLE public.edupulse_provider_connections DROP CONSTRAINT %I', existing);
  END LOOP;
END $$;

ALTER TABLE public.edupulse_provider_connections
  ADD CONSTRAINT edupulse_provider_connections_provider_check
  CHECK (provider IN ('ollama','gemini','openai','groq','anthropic','openrouter','huggingface','deepseek','hermes'));
