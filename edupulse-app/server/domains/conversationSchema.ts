/** Local counterpart of the account-owned Supabase tables. Owner IDs are text for local personas. */
export const conversationLocalSchema = `
CREATE TABLE IF NOT EXISTS ep_pulse_threads (
 id uuid PRIMARY KEY, owner_id text NOT NULL, title text NOT NULL CHECK(length(title)<=160),
 archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,owner_id)
);
CREATE INDEX IF NOT EXISTS ep_pulse_threads_owner_idx ON ep_pulse_threads(owner_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS ep_pulse_messages (
 id uuid PRIMARY KEY, sequence bigint GENERATED ALWAYS AS IDENTITY, thread_id uuid NOT NULL, owner_id text NOT NULL,
 role text NOT NULL CHECK(role IN ('user','assistant')), text text NOT NULL CHECK(length(text)<=20000),
 attachments jsonb NOT NULL DEFAULT '[]', kind text NOT NULL DEFAULT 'chat', created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(thread_id,owner_id) REFERENCES ep_pulse_threads(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ep_pulse_messages_thread_idx ON ep_pulse_messages(owner_id,thread_id,sequence);
CREATE INDEX IF NOT EXISTS ep_pulse_messages_search_idx ON ep_pulse_messages USING gin(to_tsvector('simple',text));
CREATE TABLE IF NOT EXISTS ep_pulse_memories (
 id uuid PRIMARY KEY, owner_id text NOT NULL, text text NOT NULL CHECK(length(text)<=500),
 source_message_id uuid REFERENCES ep_pulse_messages(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,text)
);
CREATE INDEX IF NOT EXISTS ep_pulse_memories_owner_idx ON ep_pulse_memories(owner_id);
CREATE TABLE IF NOT EXISTS ep_pulse_preferences(owner_id text PRIMARY KEY, automatic_memory boolean NOT NULL DEFAULT true);
CREATE OR REPLACE FUNCTION ep_pulse_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
 IF TG_TABLE_NAME='ep_pulse_threads' THEN
  IF EXISTS(SELECT 1 FROM ep_pulse_threads WHERE id=NEW.id) THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM ep_pulse_threads WHERE owner_id=NEW.owner_id;
  IF n>=100 THEN RAISE EXCEPTION 'Conversation limit reached. Delete an old conversation first.' USING ERRCODE='54000'; END IF;
 ELSIF TG_TABLE_NAME='ep_pulse_messages' THEN
  IF EXISTS(SELECT 1 FROM ep_pulse_messages WHERE id=NEW.id) THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM ep_pulse_messages WHERE thread_id=NEW.thread_id;
  IF n>=500 THEN RAISE EXCEPTION 'Start a new conversation; this thread has 500 messages.' USING ERRCODE='54000'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM ep_pulse_memories WHERE owner_id=NEW.owner_id AND text=NEW.text) THEN RETURN NEW; END IF;
  SELECT count(*) INTO n FROM ep_pulse_memories WHERE owner_id=NEW.owner_id;
  IF n>=100 THEN RAISE EXCEPTION 'Memory limit reached. Remove an old memory first.' USING ERRCODE='54000'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER ep_pulse_threads_capacity BEFORE INSERT ON ep_pulse_threads FOR EACH ROW EXECUTE FUNCTION ep_pulse_capacity();
CREATE OR REPLACE TRIGGER ep_pulse_messages_capacity BEFORE INSERT ON ep_pulse_messages FOR EACH ROW EXECUTE FUNCTION ep_pulse_capacity();
CREATE OR REPLACE TRIGGER ep_pulse_memories_capacity BEFORE INSERT ON ep_pulse_memories FOR EACH ROW EXECUTE FUNCTION ep_pulse_capacity();
`
