-- Durable provenance for the owner's persistent academic population. This is
-- maintenance metadata, never a public endpoint or a source of authorization.
CREATE TABLE edupulse_private.population_batches (
 id text PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 provenance text NOT NULL CHECK (provenance = 'owner-authorized-generated-population'),
 manifest jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
ALTER TABLE edupulse_private.population_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.population_batches FROM PUBLIC, anon, authenticated;
