-- Trigger records may hold toasted multi-megabyte snapshots. Extract each
-- collection once per invocation instead of detoasting it inside every item
-- loop. These are local values from the same NEW/OLD records, never an
-- authorization cache. All guards, side effects and revision rules remain.
DO $patch$
DECLARE target text; body text; field record; declarations text; initializers text;
 guard text:='BEGIN IF edupulse_private.handover_workspace_write(NEW.owner_id) THEN RETURN NEW; END IF;';
BEGIN
 FOREACH target IN ARRAY ARRAY['project_workspace','restore_metadata','require_block_delivery_schedule','publication_notices'] LOOP
  SELECT pg_get_functiondef(('edupulse_private.'||target||'()')::regprocedure) INTO body;
  IF strpos(body,'cached_new_content')>0 THEN CONTINUE;END IF;
  IF strpos(body,guard)=0 OR strpos(body,'DECLARE ')=0 THEN
   RAISE EXCEPTION 'Review changed workspace trigger before materializing collections: %',target;
  END IF;
  declarations:='';initializers:='';
  FOR field IN SELECT * FROM (VALUES
   ('cached_new_content','NEW.data->''content''','NEW.data->''content'''),
   ('cached_new_syllabi','NEW.data->''syllabi''','NEW.data->''syllabi'''),
   ('cached_new_registrations','NEW.data->''registrations''','NEW.data->''registrations'''),
   ('cached_old_content','OLD.data->''content''','CASE WHEN TG_OP=''UPDATE'' THEN OLD.data->''content'' ELSE NULL END'),
   ('cached_old_syllabi','OLD.data->''syllabi''','CASE WHEN TG_OP=''UPDATE'' THEN OLD.data->''syllabi'' ELSE NULL END')
  ) AS fields(variable,expression,initializer) LOOP
   IF strpos(body,field.expression)=0 THEN CONTINUE;END IF;
   body:=replace(body,field.expression,field.variable);
   declarations:=declarations||field.variable||' jsonb; ';
   initializers:=initializers||field.variable||':='||field.initializer||E';\n';
  END LOOP;
  body:=replace(body,'DECLARE ','DECLARE '||declarations);
  body:=replace(body,guard,guard||E'\n'||initializers);
  EXECUTE body;
 END LOOP;
END $patch$;
