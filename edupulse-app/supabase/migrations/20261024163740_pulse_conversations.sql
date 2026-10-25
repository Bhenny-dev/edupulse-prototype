-- Private conversation archive and explicit, attributable cross-session preferences.
CREATE TABLE public.edupulse_pulse_threads (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160), archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,owner_id)
);
CREATE INDEX edupulse_pulse_threads_owner_idx ON public.edupulse_pulse_threads(owner_id,updated_at DESC);
CREATE TABLE public.edupulse_pulse_messages (
 id uuid PRIMARY KEY, sequence bigint GENERATED ALWAYS AS IDENTITY, thread_id uuid NOT NULL, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('user','assistant')), text text NOT NULL CHECK(length(text)<=20000),
 attachments jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(attachments)='array' AND jsonb_array_length(attachments)<=3),
 kind text NOT NULL DEFAULT 'chat' CHECK(kind IN ('chat','action','receipt','error')), created_at timestamptz NOT NULL DEFAULT now(),
 search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple',text)) STORED,
 FOREIGN KEY(thread_id,owner_id) REFERENCES public.edupulse_pulse_threads(id,owner_id) ON DELETE CASCADE, UNIQUE(id,owner_id)
);
CREATE INDEX edupulse_pulse_messages_thread_idx ON public.edupulse_pulse_messages(owner_id,thread_id,sequence);
CREATE INDEX edupulse_pulse_messages_search_idx ON public.edupulse_pulse_messages USING gin(search_vector);
CREATE TABLE public.edupulse_pulse_memories (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 text text NOT NULL CHECK(length(text) BETWEEN 3 AND 500), source_message_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,text), FOREIGN KEY(source_message_id,owner_id) REFERENCES public.edupulse_pulse_messages(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX edupulse_pulse_memories_owner_idx ON public.edupulse_pulse_memories(owner_id);
CREATE TABLE public.edupulse_pulse_preferences (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, automatic_memory boolean NOT NULL DEFAULT true
);
ALTER TABLE public.edupulse_pulse_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_pulse_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_pulse_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edupulse_pulse_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_pulse_threads,public.edupulse_pulse_messages,public.edupulse_pulse_memories,public.edupulse_pulse_preferences FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.edupulse_pulse_threads,public.edupulse_pulse_memories,public.edupulse_pulse_preferences TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.edupulse_pulse_messages TO authenticated;
CREATE POLICY pulse_threads_owner ON public.edupulse_pulse_threads TO authenticated USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY pulse_messages_owner ON public.edupulse_pulse_messages TO authenticated USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY pulse_memories_owner ON public.edupulse_pulse_memories TO authenticated USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY pulse_preferences_owner ON public.edupulse_pulse_preferences TO authenticated USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));

CREATE FUNCTION public.edupulse_pulse_capacity() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_count integer;
BEGIN
 -- Serializes capacity checks for this account without a service-role bypass.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.owner_id::text,715));
 IF TG_TABLE_NAME='edupulse_pulse_threads' THEN
   IF EXISTS(SELECT 1 FROM public.edupulse_pulse_threads WHERE id=NEW.id AND owner_id=NEW.owner_id) THEN RETURN NEW; END IF;
   SELECT count(*) INTO current_count FROM public.edupulse_pulse_threads WHERE owner_id=NEW.owner_id;
   IF current_count>=100 THEN RAISE EXCEPTION 'Conversation limit reached. Delete an old conversation first.' USING ERRCODE='54000'; END IF;
 ELSIF TG_TABLE_NAME='edupulse_pulse_messages' THEN
   IF EXISTS(SELECT 1 FROM public.edupulse_pulse_messages WHERE id=NEW.id AND owner_id=NEW.owner_id) THEN RETURN NEW; END IF;
   SELECT count(*) INTO current_count FROM public.edupulse_pulse_messages WHERE thread_id=NEW.thread_id AND owner_id=NEW.owner_id;
   IF current_count>=500 THEN RAISE EXCEPTION 'Start a new conversation; this thread has 500 messages.' USING ERRCODE='54000'; END IF;
 ELSE
   IF EXISTS(SELECT 1 FROM public.edupulse_pulse_memories WHERE owner_id=NEW.owner_id AND text=NEW.text) THEN RETURN NEW; END IF;
   SELECT count(*) INTO current_count FROM public.edupulse_pulse_memories WHERE owner_id=NEW.owner_id;
   IF current_count>=100 THEN RAISE EXCEPTION 'Memory limit reached. Remove an old memory first.' USING ERRCODE='54000'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.edupulse_pulse_capacity() FROM PUBLIC,anon;
CREATE TRIGGER pulse_thread_capacity BEFORE INSERT ON public.edupulse_pulse_threads FOR EACH ROW EXECUTE FUNCTION public.edupulse_pulse_capacity();
CREATE TRIGGER pulse_message_capacity BEFORE INSERT ON public.edupulse_pulse_messages FOR EACH ROW EXECUTE FUNCTION public.edupulse_pulse_capacity();
CREATE TRIGGER pulse_memory_capacity BEFORE INSERT ON public.edupulse_pulse_memories FOR EACH ROW EXECUTE FUNCTION public.edupulse_pulse_capacity();

CREATE FUNCTION public.edupulse_recall_pulse(query_text text,excluded_thread uuid DEFAULT NULL)
RETURNS TABLE(id uuid,text text,role text,thread_id uuid,created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT m.id,m.text,m.role,m.thread_id,m.created_at FROM public.edupulse_pulse_messages m
 WHERE m.owner_id=(SELECT auth.uid()) AND (excluded_thread IS NULL OR m.thread_id<>excluded_thread)
 AND m.search_vector @@ pg_catalog.websearch_to_tsquery('simple',left(query_text,400))
 ORDER BY pg_catalog.ts_rank(m.search_vector,pg_catalog.websearch_to_tsquery('simple',left(query_text,400))) DESC,m.sequence DESC LIMIT 5
$$;
REVOKE ALL ON FUNCTION public.edupulse_recall_pulse(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.edupulse_recall_pulse(text,uuid) TO authenticated;
