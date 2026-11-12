-- Explicit owner-authorized student demonstration. Ordinary support remains read-only.
ALTER TABLE public.edupulse_attempts ADD COLUMN admin_actor_id uuid REFERENCES auth.users(id);
ALTER TABLE public.edupulse_material_access ADD COLUMN admin_actor_id uuid REFERENCES auth.users(id);
ALTER TABLE public.edupulse_material_progress ADD COLUMN admin_actor_id uuid REFERENCES auth.users(id);
ALTER TABLE public.edupulse_assessment_sessions ADD COLUMN admin_actor_id uuid REFERENCES auth.users(id);

CREATE FUNCTION edupulse_private.admin_activity_label() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF nullif(current_setting('edupulse.admin_actor',true),'') IS NOT NULL THEN
  NEW.admin_actor_id:=current_setting('edupulse.admin_actor')::uuid;
  NEW.is_test:=true;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.admin_activity_label() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_admin_activity BEFORE INSERT ON public.edupulse_attempts FOR EACH ROW EXECUTE FUNCTION edupulse_private.admin_activity_label();
CREATE TRIGGER zz_admin_activity BEFORE INSERT ON public.edupulse_material_access FOR EACH ROW EXECUTE FUNCTION edupulse_private.admin_activity_label();
CREATE TRIGGER zz_admin_activity BEFORE INSERT ON public.edupulse_material_progress FOR EACH ROW EXECUTE FUNCTION edupulse_private.admin_activity_label();
CREATE TRIGGER zz_admin_activity BEFORE INSERT ON public.edupulse_assessment_sessions FOR EACH ROW EXECUTE FUNCTION edupulse_private.admin_activity_label();

CREATE FUNCTION edupulse_private.authorize_admin_demonstration(subject uuid,publication text,version text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE account jsonb; p public.edupulse_publications;
BEGIN
 account:=edupulse_private.support_account(subject,'{}');
 IF account->>'role'<>'student' THEN RAISE EXCEPTION 'Select a current student' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.edupulse_publications WHERE id=publication AND active AND source_version=version AND (release_at IS NULL OR release_at<=now()) FOR SHARE;
 IF p.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.edupulse_courses WHERE id=p.course_id AND active)
 OR NOT EXISTS(SELECT 1 FROM public.edupulse_enrollments WHERE course_id=p.course_id AND student_email=lower(account->>'email') AND NOT suspended) THEN
  RAISE EXCEPTION 'Current enrolled released content required' USING ERRCODE='42501';
 END IF;
 IF EXISTS(SELECT 1 FROM public.edupulse_attempts WHERE publication_id=p.id AND student_id=subject AND NOT is_test)
 OR EXISTS(SELECT 1 FROM public.edupulse_material_access WHERE publication_id=p.id AND student_id=subject AND NOT is_test)
 OR EXISTS(SELECT 1 FROM public.edupulse_assessment_sessions WHERE publication_id=p.id AND student_id=subject AND NOT coalesce(is_test,false)) THEN
  RAISE EXCEPTION 'Independent student activity is protected; use an untouched item' USING ERRCODE='22023';
 END IF;
 INSERT INTO edupulse_private.pipeline_activity_grants(publication_id,source_version,student_id,instructor_id)
 VALUES(p.id,version,subject,p.instructor_id) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.authorize_admin_demonstration(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.authorize_admin_demonstration(uuid,text,text) TO authenticated;

CREATE FUNCTION edupulse_private.support_student_demonstration(subject uuid,input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE account jsonb; actor uuid:=auth.uid(); claims text:=current_setting('request.jwt.claims',true);
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_email text:=current_setting('request.jwt.claim.email',true);
 old_actor text:=current_setting('edupulse.admin_actor',true); result jsonb;
BEGIN
 account:=edupulse_private.support_account(subject,'{}');
 IF input->>'operation' NOT IN ('open','start','respond','read-section') THEN RAISE EXCEPTION 'Unsupported demonstration command' USING ERRCODE='42501'; END IF;
 PERFORM edupulse_private.authorize_admin_demonstration(subject,input->>'publication',input->>'version');
 INSERT INTO public.edupulse_support_events(actor_id,subject_id,operation) VALUES(actor,subject,'academic.command');
 INSERT INTO public.edupulse_audit_events(actor_id,actor_role,action,outcome,detail) VALUES(actor,'admin','view_switch','success','Labelled student demonstration: '||(input->>'operation')||' subject='||subject::text);
 PERFORM set_config('request.jwt.claims',(account->'claims')::text,true);
 PERFORM set_config('request.jwt.claim.sub',subject::text,true);
 PERFORM set_config('request.jwt.claim.email',account->>'email',true);
 PERFORM set_config('edupulse.admin_actor',actor::text,true);
 CASE input->>'operation'
 WHEN 'open' THEN result:=public.edupulse_academic_action(input->>'publication',input->>'version','[]','open');
 WHEN 'read-section' THEN result:=public.edupulse_read_material_section(input->>'publication',input->>'version',(input->>'section')::integer);
 ELSE result:=public.edupulse_assessment_command((input-'adminTest')||jsonb_build_object('operation',CASE WHEN input->>'operation'='respond' THEN 'submit' ELSE 'start' END));
 END CASE;
 PERFORM set_config('request.jwt.claims',coalesce(claims,''),true);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claim.email',coalesce(old_email,''),true);
 PERFORM set_config('edupulse.admin_actor',coalesce(old_actor,''),true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('request.jwt.claims',coalesce(claims,''),true);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claim.email',coalesce(old_email,''),true);
 PERFORM set_config('edupulse.admin_actor',coalesce(old_actor,''),true);
 RAISE;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.support_student_demonstration(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.support_student_demonstration(uuid,jsonb) TO authenticated;
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_support_action(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'account:=edupulse_private.support_account(subject,input);', $patch$account:=edupulse_private.support_account(subject,input);
 IF operation='academic.command' AND account->>'role'='student' AND input->>'adminTest'='true' THEN RETURN edupulse_private.support_student_demonstration(subject,input); END IF;$patch$);
 IF strpos(definition,'support_student_demonstration(subject,input)')=0 THEN RAISE EXCEPTION 'Support patch unavailable'; END IF;
 EXECUTE definition;
 -- Whitelisted instructor label is available even for pending assignments.
 definition:=pg_get_functiondef('edupulse_private.student_course_loads()'::regprocedure);
 definition:=replace(definition,'''course_title'',c.course_title,','''course_title'',c.course_title,''instructor_name'',c.instructor_name,');
 EXECUTE definition;
END $$;
