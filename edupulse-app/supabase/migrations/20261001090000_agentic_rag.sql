-- v0.4.0 agentic RAG. Additive: document/chunk metadata, Postgres full-text
-- search beside pgvector, and owner-scoped hybrid retrieval. Existing rows,
-- policies and v0.1 functions remain valid.
ALTER TABLE public.edupulse_ai_documents DROP CONSTRAINT IF EXISTS edupulse_ai_documents_embedding_model_check;
ALTER TABLE public.edupulse_ai_documents
  ALTER COLUMN embedding_model SET DEFAULT 'all-minilm-l6-v2-int8',
  ADD CONSTRAINT edupulse_ai_documents_embedding_model_check CHECK (embedding_model IN ('all-minilm', 'all-minilm-l6-v2-int8')),
  ADD COLUMN source_type text NOT NULL DEFAULT 'text' CHECK (source_type IN ('text', 'pdf', 'docx', 'pptx', 'html', 'markdown', 'csv')),
  ADD COLUMN file_name text CHECK (file_name IS NULL OR char_length(file_name) BETWEEN 1 AND 255),
  ADD COLUMN char_count integer NOT NULL DEFAULT 0 CHECK (char_count BETWEEN 0 AND 400000),
  ADD COLUMN page_count integer CHECK (page_count IS NULL OR page_count BETWEEN 1 AND 300),
  ADD COLUMN quality jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(quality) = 'object' AND octet_length(quality::text) <= 8000);

ALTER TABLE public.edupulse_ai_chunks
  ADD COLUMN chunk_index integer NOT NULL DEFAULT 0 CHECK (chunk_index BETWEEN 0 AND 999),
  ADD COLUMN page integer CHECK (page IS NULL OR page BETWEEN 1 AND 300),
  ADD COLUMN section text CHECK (section IS NULL OR char_length(section) <= 200),
  ADD COLUMN flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN fts tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED;
CREATE INDEX edupulse_chunks_fts_idx ON public.edupulse_ai_chunks USING gin (fts);

CREATE FUNCTION public.edupulse_ingest_document_v2(doc jsonb, chunks jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE doc_id uuid; chunk jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(doc) <> 'object' OR jsonb_typeof(chunks) <> 'array' OR jsonb_array_length(chunks) NOT BETWEEN 1 AND 250 OR octet_length(chunks::text) > 6000000 THEN
    RAISE EXCEPTION 'Invalid document' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  SELECT id INTO doc_id FROM public.edupulse_ai_documents WHERE owner_id = auth.uid() AND content_hash = doc->>'content_hash';
  IF doc_id IS NOT NULL THEN RETURN doc_id; END IF;
  IF (SELECT count(*) FROM public.edupulse_ai_documents WHERE owner_id = auth.uid()) >= 50 THEN RAISE EXCEPTION 'Document quota exceeded' USING ERRCODE = '53400'; END IF;
  INSERT INTO public.edupulse_ai_documents(title, content_hash, embedding_model, source_type, file_name, char_count, page_count, quality)
  VALUES (doc->>'title', doc->>'content_hash', doc->>'embedding_model', coalesce(doc->>'source_type', 'text'), doc->>'file_name',
    coalesce((doc->>'char_count')::int, 0), (doc->>'page_count')::int, coalesce(doc->'quality', '{}'::jsonb))
  RETURNING id INTO doc_id;
  FOR chunk IN SELECT * FROM jsonb_array_elements(chunks) LOOP
    INSERT INTO public.edupulse_ai_chunks(document_id, text, embedding, chunk_index, page, section, flagged)
    VALUES (doc_id, chunk->>'text', (chunk->>'embedding')::extensions.vector(384), coalesce((chunk->>'chunk_index')::int, 0),
      (chunk->>'page')::int, chunk->>'section', coalesce((chunk->>'flagged')::boolean, false));
  END LOOP;
  RETURN doc_id;
END;
$$;

-- Returns vector and keyword ranks separately; the API fuses them with
-- reciprocal rank fusion and reranks with a cross-encoder.
CREATE FUNCTION public.edupulse_hybrid_chunks(query_embedding extensions.vector(384), query_terms text[], match_count int DEFAULT 20, model text DEFAULT 'all-minilm-l6-v2-int8', document_ids uuid[] DEFAULT NULL)
RETURNS TABLE(id uuid, document_id uuid, title text, text text, page int, section text, flagged boolean, similarity float, vector_rank int, keyword_rank int)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE tsq tsquery; lim int := greatest(1, least(40, match_count));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF coalesce(array_length(query_terms, 1), 0) > 32 OR EXISTS (SELECT 1 FROM unnest(query_terms) t WHERE t !~ '^[a-z0-9]{2,40}$') THEN
    RAISE EXCEPTION 'Invalid query terms' USING ERRCODE = '22023';
  END IF;
  IF coalesce(array_length(document_ids, 1), 0) > 5 THEN RAISE EXCEPTION 'Too many documents' USING ERRCODE = '22023'; END IF;
  IF coalesce(array_length(query_terms, 1), 0) > 0 THEN tsq := to_tsquery('english', array_to_string(query_terms, ' | ')); END IF;
  RETURN QUERY
  WITH scope AS (
    SELECT c.id AS cid, c.document_id AS did, d.title AS dtitle, c.text AS ctext, c.page AS cpage, c.section AS csection, c.flagged AS cflagged, c.embedding AS cembedding, c.fts AS cfts
    FROM public.edupulse_ai_chunks c JOIN public.edupulse_ai_documents d ON d.id = c.document_id
    WHERE d.owner_id = (SELECT auth.uid()) AND d.embedding_model = model AND (document_ids IS NULL OR d.id = ANY(document_ids))
  ), semantic AS (
    SELECT s.cid, 1 - (s.cembedding OPERATOR(extensions.<=>) query_embedding) AS sim,
      row_number() OVER (ORDER BY s.cembedding OPERATOR(extensions.<=>) query_embedding) AS r
    FROM scope s ORDER BY s.cembedding OPERATOR(extensions.<=>) query_embedding LIMIT lim
  ), keyword AS (
    SELECT s.cid, row_number() OVER (ORDER BY ts_rank_cd(s.cfts, tsq) DESC) AS r
    FROM scope s WHERE tsq IS NOT NULL AND s.cfts @@ tsq ORDER BY ts_rank_cd(s.cfts, tsq) DESC LIMIT lim
  )
  SELECT s.cid, s.did, s.dtitle, s.ctext, s.cpage, s.csection, s.cflagged, sem.sim::float, sem.r::int, kw.r::int
  FROM scope s LEFT JOIN semantic sem ON sem.cid = s.cid LEFT JOIN keyword kw ON kw.cid = s.cid
  WHERE sem.cid IS NOT NULL OR kw.cid IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.edupulse_ingest_document_v2(jsonb, jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.edupulse_hybrid_chunks(extensions.vector, text[], int, text, uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.edupulse_ingest_document_v2(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edupulse_hybrid_chunks(extensions.vector, text[], int, text, uuid[]) TO authenticated;
