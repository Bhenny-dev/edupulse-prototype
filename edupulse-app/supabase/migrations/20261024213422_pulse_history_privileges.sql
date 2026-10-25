-- Hosted Supabase default privileges can grant UPDATE/TRUNCATE before explicit GRANTs.
-- Reset the inherited table grants, then declare the complete intended surface.
REVOKE ALL ON public.edupulse_pulse_threads,public.edupulse_pulse_messages,public.edupulse_pulse_memories,public.edupulse_pulse_preferences FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.edupulse_pulse_threads,public.edupulse_pulse_memories,public.edupulse_pulse_preferences TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.edupulse_pulse_messages TO authenticated;
