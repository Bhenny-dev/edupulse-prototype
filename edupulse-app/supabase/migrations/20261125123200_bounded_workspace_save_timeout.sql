-- A validated 3 MB workspace can atomically project thousands of memberships
-- and publication notices. Keep that owned, revision-checked RPC bounded while
-- allowing it to finish beyond the authenticated role's default eight seconds.
-- This stays below both the REST gateway's 60 s cap and the app's 110 s hosted
-- handler deadline. No role-wide timeout or authorization grant changes.
ALTER FUNCTION public.edupulse_save_workspace(bigint,jsonb) SET statement_timeout TO '45s';
NOTIFY pgrst, 'reload schema';
