-- Additive, private per-account knowledge store. No changes to existing academic tables.
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
grant usage on schema extensions to authenticated;

create table public.edupulse_ai_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  embedding_model text not null default 'all-minilm' check (embedding_model = 'all-minilm'),
  created_at timestamptz not null default now(),
  unique(owner_id, content_hash)
);
create table public.edupulse_ai_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.edupulse_ai_documents(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1200),
  embedding extensions.vector(384) not null
);
create index edupulse_chunks_document_idx on public.edupulse_ai_chunks(document_id);
create index edupulse_chunks_vector_idx on public.edupulse_ai_chunks using hnsw (embedding extensions.vector_cosine_ops);
alter table public.edupulse_ai_documents enable row level security;
alter table public.edupulse_ai_chunks enable row level security;

create policy documents_owner on public.edupulse_ai_documents for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy chunks_owner on public.edupulse_ai_chunks for all to authenticated
  using (exists (select 1 from public.edupulse_ai_documents d where d.id = document_id and d.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.edupulse_ai_documents d where d.id = document_id and d.owner_id = (select auth.uid())));
revoke all on public.edupulse_ai_documents, public.edupulse_ai_chunks from anon;
grant select, insert, delete on public.edupulse_ai_documents, public.edupulse_ai_chunks to authenticated;

create function public.edupulse_ingest_document(doc_title text, doc_hash text, chunks jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare doc_id uuid; chunk jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select id into doc_id from public.edupulse_ai_documents where owner_id = auth.uid() and content_hash = doc_hash;
  if doc_id is not null then return doc_id; end if;
  if (select count(*) from public.edupulse_ai_documents where owner_id = auth.uid()) >= 50 then raise exception 'Document quota exceeded'; end if;
  if jsonb_typeof(chunks) <> 'array' or jsonb_array_length(chunks) not between 1 and 100 or octet_length(chunks::text) > 2000000 then raise exception 'Invalid chunks'; end if;
  insert into public.edupulse_ai_documents(title,content_hash) values(doc_title,doc_hash) returning id into doc_id;
  for chunk in select * from jsonb_array_elements(chunks) loop
    insert into public.edupulse_ai_chunks(document_id,text,embedding)
      values(doc_id,chunk->>'text',(chunk->>'embedding')::extensions.vector(384));
  end loop;
  return doc_id;
end;
$$;

create function public.edupulse_match_chunks(query_embedding extensions.vector(384), match_count int default 5, match_threshold float default 0.25)
returns table(id uuid, title text, text text, score float)
language sql stable security invoker set search_path = '' as $$
  select c.id, d.title, c.text, 1 - (c.embedding operator(extensions.<=>) query_embedding) as score
  from public.edupulse_ai_chunks c join public.edupulse_ai_documents d on d.id=c.document_id
  where d.owner_id = (select auth.uid()) and d.embedding_model='all-minilm'
    and 1 - (c.embedding operator(extensions.<=>) query_embedding) >= greatest(0.0, least(1.0, match_threshold))
  order by c.embedding operator(extensions.<=>) query_embedding limit greatest(1, least(10, match_count));
$$;
revoke all on function public.edupulse_ingest_document(text,text,jsonb) from public, anon;
revoke all on function public.edupulse_match_chunks(extensions.vector,int,float) from public, anon;
grant execute on function public.edupulse_ingest_document(text,text,jsonb) to authenticated;
grant execute on function public.edupulse_match_chunks(extensions.vector,int,float) to authenticated;
