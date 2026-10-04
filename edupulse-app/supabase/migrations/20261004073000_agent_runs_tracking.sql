-- Agent runs tracked for the System Admin console (FR-AGENT-03, FR-AGENT-04).
-- One row per Pulse or courseware request by a signed-in account. A row holds the
-- task, outcome, timing and each named agent's goal result; never prompt, answer or
-- document text, and the admin view exposes roles, not the people behind them.
CREATE TABLE public.edupulse_agent_runs (
  id uuid PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('admin', 'dean', 'associate_dean', 'instructor', 'student')),
  workflow text NOT NULL CHECK (workflow IN ('chat', 'courseware')),
  task text NOT NULL CHECK (task ~ '^[a-z-]{1,32}$'),
  outcome text NOT NULL CHECK (outcome IN ('answered', 'quoted-sources', 'insufficient-evidence', 'references', 'declined', 'failed')),
  policy_rule text CHECK (policy_rule IN ('assessment-integrity', 'excluded-feature', 'official-grades')),
  provider text NOT NULL DEFAULT '' CHECK (length(provider) <= 40),
  model text NOT NULL DEFAULT '' CHECK (length(model) <= 120),
  duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 0 AND 3600000),
  sources smallint NOT NULL DEFAULT 0 CHECK (sources >= 0),
  claims smallint NOT NULL DEFAULT 0 CHECK (claims >= 0),
  unsupported smallint NOT NULL DEFAULT 0 CHECK (unsupported >= 0),
  agents jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(agents) = 'array' AND jsonb_array_length(agents) <= 12 AND octet_length(agents::text) <= 4000),
  CHECK ((outcome = 'declined') = (policy_rule IS NOT NULL))
);
CREATE INDEX edupulse_agent_runs_recent_idx ON public.edupulse_agent_runs (occurred_at DESC);
CREATE INDEX edupulse_agent_runs_actor_idx ON public.edupulse_agent_runs (actor_id);
ALTER TABLE public.edupulse_agent_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_agent_runs FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.edupulse_agent_runs TO authenticated;
-- The API inserts as the signed-in user, so a run can only be recorded for oneself under one's assigned role.
CREATE POLICY agent_runs_self_insert ON public.edupulse_agent_runs FOR INSERT TO authenticated
  WITH CHECK (actor_id = (SELECT auth.uid()) AND actor_role = ((SELECT auth.jwt())->'app_metadata'->>'role'));

CREATE SCHEMA IF NOT EXISTS edupulse_private;
REVOKE ALL ON SCHEMA edupulse_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA edupulse_private TO authenticated;

-- Same gate as edupulse_private.admin_overview: the owner's admin account with a linked Google identity.
CREATE FUNCTION edupulse_private.is_system_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND lower(u.email) = 'riverabenlor461@gmail.com'
      AND u.raw_app_meta_data->>'role' = 'admin'
      AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'google')
  );
$$;
REVOKE ALL ON FUNCTION edupulse_private.is_system_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION edupulse_private.is_system_admin() TO authenticated;

CREATE FUNCTION edupulse_private.admin_agent_activity(days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  since timestamptz;
BEGIN
  IF NOT edupulse_private.is_system_admin() THEN
    RAISE EXCEPTION 'System admin required' USING ERRCODE = '42501';
  END IF;
  since := now() - make_interval(days => greatest(1, least(coalesce(days, 7), 90)));
  RETURN (
    WITH runs AS (SELECT * FROM public.edupulse_agent_runs WHERE occurred_at >= since),
    work AS (
      SELECT a->>'agent' AS agent, (a->>'goalMet')::boolean AS goal_met, (a->>'ms')::integer AS ms, a->>'status' AS status, r.occurred_at
      FROM runs r CROSS JOIN LATERAL jsonb_array_elements(r.agents) AS a
    )
    SELECT jsonb_build_object(
      'since', since,
      'totals', (SELECT jsonb_build_object(
        'runs', count(*), 'declined', count(*) FILTER (WHERE outcome = 'declined'),
        'failed', count(*) FILTER (WHERE outcome = 'failed'), 'avgMs', coalesce(round(avg(duration_ms)), 0)) FROM runs),
      'byAgent', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'agent', agent, 'runs', runs, 'goalMet', goal_met, 'fallbacks', fallbacks, 'avgMs', avg_ms, 'lastRun', last_run)), '[]'::jsonb)
        FROM (SELECT agent, count(*) AS runs, count(*) FILTER (WHERE goal_met) AS goal_met,
                     count(*) FILTER (WHERE status IN ('fallback', 'skipped')) AS fallbacks,
                     round(avg(ms)) AS avg_ms, max(occurred_at) AS last_run
              FROM work GROUP BY agent) per_agent),
      'byRule', (SELECT coalesce(jsonb_agg(jsonb_build_object('rule', policy_rule, 'count', n)), '[]'::jsonb)
        FROM (SELECT policy_rule, count(*) AS n FROM runs WHERE policy_rule IS NOT NULL GROUP BY policy_rule) per_rule),
      'recent', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'at', occurred_at, 'role', actor_role, 'workflow', workflow, 'task', task, 'outcome', outcome,
          'rule', policy_rule, 'ms', duration_ms, 'sources', sources, 'agents', agents) ORDER BY occurred_at DESC), '[]'::jsonb)
        FROM (SELECT * FROM runs ORDER BY occurred_at DESC LIMIT 30) latest)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION edupulse_private.admin_agent_activity(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION edupulse_private.admin_agent_activity(integer) TO authenticated;

CREATE FUNCTION public.edupulse_admin_agent_activity(days integer DEFAULT 7)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT edupulse_private.admin_agent_activity(days);
$$;
REVOKE ALL ON FUNCTION public.edupulse_admin_agent_activity(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edupulse_admin_agent_activity(integer) TO authenticated;
