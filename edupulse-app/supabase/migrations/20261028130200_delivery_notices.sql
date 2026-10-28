ALTER TABLE public.edupulse_notices ADD COLUMN event_key text;
CREATE UNIQUE INDEX edupulse_notice_event_idx ON public.edupulse_notices(recipient_id,event_key) WHERE event_key IS NOT NULL;
CREATE FUNCTION edupulse_private.publication_notices() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.edupulse_publications; previous jsonb; item record; s jsonb; old_status text;
BEGIN
 IF coalesce(edupulse_private.academic_role(),'') NOT IN ('instructor','admin') THEN RETURN NEW; END IF;
 FOR item IN SELECT key,value FROM jsonb_each(NEW.data->'content') WHERE value->>'status'='published' LOOP
  previous:=CASE WHEN TG_OP='UPDATE' THEN OLD.data->'content'->item.key ELSE NULL END;
  SELECT * INTO p FROM public.edupulse_publications WHERE id=md5(NEW.owner_id::text||':'||item.key) AND active;
  IF p.id IS NULL OR (previous->>'status'='published' AND previous->'content'=item.value->'content' AND previous->>'releaseAt' IS NOT DISTINCT FROM item.value->>'releaseAt') THEN CONTINUE; END IF;
  INSERT INTO public.edupulse_notices(recipient_id,actor_id,publication_id,title,detail,path,created_at,event_key)
  SELECT DISTINCT u.id,NEW.owner_id,p.id,'New published '||p.type||': '||p.title,'Week '||p.week||' is available in your enrolled course.',CASE p.type WHEN 'assessment' THEN '/assessment' ELSE '/courseware' END,greatest(now(),coalesce(p.release_at,now())),p.id||':'||p.source_version
  FROM public.edupulse_enrollments e JOIN auth.users u ON lower(u.email)=e.student_email AND u.raw_app_meta_data->>'role'='student' WHERE e.course_id=p.course_id ON CONFLICT(recipient_id,event_key) WHERE event_key IS NOT NULL DO UPDATE SET created_at=excluded.created_at,title=excluded.title,detail=excluded.detail;
  INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(NEW.owner_id,'publication',p.title,CASE WHEN p.release_at>now() THEN 'Scheduled for '||p.release_at::text ELSE 'Published week '||p.week END);
 END LOOP;
 FOR s IN SELECT value FROM jsonb_array_elements(NEW.data->'syllabi') WHERE coalesce(value->>'sample','false')<>'true' LOOP
  old_status:=CASE WHEN TG_OP='UPDATE' THEN (SELECT value->>'status' FROM jsonb_array_elements(OLD.data->'syllabi') WHERE value->>'id'=s->>'id') ELSE NULL END;
  IF old_status IS DISTINCT FROM s->>'status' THEN
   INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(NEW.owner_id,'syllabus',s->>'courseCode',s->>'status');
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.publication_notices() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zzz_edupulse_publication_notices AFTER INSERT OR UPDATE ON public.edupulse_workspaces FOR EACH ROW EXECUTE FUNCTION edupulse_private.publication_notices();

DROP POLICY notice_read ON public.edupulse_notices;
CREATE POLICY notice_read ON public.edupulse_notices FOR SELECT TO authenticated USING (
 recipient_id=(SELECT auth.uid()) AND created_at<=now() AND (event_key IS NULL OR EXISTS(SELECT 1 FROM public.edupulse_publications p WHERE p.id=publication_id AND p.active AND (p.release_at IS NULL OR p.release_at<=now())))
);
