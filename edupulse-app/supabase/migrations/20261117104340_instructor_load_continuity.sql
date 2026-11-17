-- Explicit Dean load changes carry a class's teaching basis, never the owner's
-- whole workspace, conversations, provider settings or unrelated student records.
ALTER TABLE public.edupulse_courses ADD COLUMN academic_year text NOT NULL DEFAULT '',ADD COLUMN semester text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION edupulse_private.academic_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN raw_app_meta_data->>'suspended'='true' OR banned_until>now() THEN NULL ELSE raw_app_meta_data->>'role' END FROM auth.users WHERE id=auth.uid()
$$;
DO $$ DECLARE original text; definition text; BEGIN
 original:=pg_get_functiondef('edupulse_private.restore_metadata()'::regprocedure);
 definition:=replace(original,'SET syllabus_status=s->>''status''','SET academic_year=coalesce(s->''courseInfo''->>''academicYear'',''''),semester=coalesce(s->''courseInfo''->>''periodOffered'',''''),syllabus_status=s->>''status''');
 IF definition=original THEN RAISE EXCEPTION 'Course term projection patch unavailable'; END IF;
 EXECUTE definition;
END $$;
UPDATE public.edupulse_courses c SET academic_year=coalesce(s->'courseInfo'->>'academicYear',''),semester=coalesce(s->'courseInfo'->>'periodOffered','')
 FROM public.edupulse_workspaces w CROSS JOIN LATERAL jsonb_array_elements(w.data->'syllabi') s WHERE c.instructor_id=w.owner_id AND c.syllabus_id=s->>'id';

CREATE TABLE edupulse_private.teaching_handover_bundles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),source_owner uuid NOT NULL REFERENCES auth.users(id),
 syllabus_id text NOT NULL,fingerprint text NOT NULL,snapshot jsonb NOT NULL,
 created_by uuid NOT NULL REFERENCES auth.users(id),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_owner,syllabus_id,fingerprint),CHECK(octet_length(snapshot::text)<=10000000));
CREATE TABLE edupulse_private.teaching_load_continuity(
 load_key text PRIMARY KEY,bundle_id uuid NOT NULL REFERENCES edupulse_private.teaching_handover_bundles(id),
 load jsonb NOT NULL,memberships jsonb NOT NULL,windows jsonb,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE edupulse_private.teaching_handover_copies(
 source_owner uuid NOT NULL,source_syllabus text NOT NULL,recipient uuid NOT NULL REFERENCES auth.users(id),
 term text NOT NULL,fingerprint text NOT NULL,syllabus_id text NOT NULL,id_map jsonb NOT NULL,created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(source_owner,source_syllabus,recipient,term,fingerprint));
CREATE TABLE edupulse_private.teaching_handover_writes(
 transaction_id bigint NOT NULL,owner_id uuid NOT NULL,PRIMARY KEY(transaction_id,owner_id));
CREATE TABLE edupulse_private.teaching_handover_files(
 owner_id uuid NOT NULL REFERENCES auth.users(id),syllabus_id text NOT NULL,path text NOT NULL,
 PRIMARY KEY(owner_id,syllabus_id,path));
ALTER TABLE edupulse_private.teaching_handover_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE edupulse_private.teaching_load_continuity ENABLE ROW LEVEL SECURITY;
ALTER TABLE edupulse_private.teaching_handover_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE edupulse_private.teaching_handover_writes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edupulse_private.teaching_handover_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edupulse_private.teaching_handover_bundles,edupulse_private.teaching_load_continuity,
 edupulse_private.teaching_handover_copies,edupulse_private.teaching_handover_writes,edupulse_private.teaching_handover_files FROM PUBLIC,anon,authenticated;

CREATE FUNCTION edupulse_private.handover_workspace_write(owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND edupulse_private.academic_role() IN ('dean','associate_dean','admin') AND EXISTS(
  SELECT 1 FROM edupulse_private.teaching_handover_writes WHERE transaction_id=txid_current() AND owner_id=owner)
$$;
REVOKE ALL ON FUNCTION edupulse_private.handover_workspace_write(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION edupulse_private.handover_workspace_write(uuid) TO authenticated;

-- Exact string references are rewritten together (item IDs, syllabus IDs and
-- material coverage), without replacing coincidental substrings in lesson text.
CREATE FUNCTION edupulse_private.handover_rekey(value jsonb,mapping jsonb,field text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$ DECLARE result jsonb; BEGIN
 CASE jsonb_typeof(value)
 WHEN 'string' THEN RETURN CASE WHEN field IN ('id','syllabusId','workspace_item_id','courseItemId','materialId','materialIds','coveredMaterialIds','afterMaterialId','contentId') THEN coalesce(mapping->(value#>>'{}'),value) ELSE value END;
 WHEN 'array' THEN SELECT coalesce(jsonb_agg(edupulse_private.handover_rekey(v,mapping,field) ORDER BY n),'[]') INTO result FROM jsonb_array_elements(value) WITH ORDINALITY e(v,n);
 WHEN 'object' THEN SELECT coalesce(jsonb_object_agg(k,edupulse_private.handover_rekey(v,mapping,k)),'{}') INTO result FROM jsonb_each(value) e(k,v);
 ELSE RETURN value; END CASE; RETURN result;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.handover_rekey(jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;

-- Freeze the selected course once, deduplicated across its blocks. The separate
-- block link retains actual memberships/schedule for remove-then-replace flows.
CREATE FUNCTION edupulse_private.capture_load_teaching() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE source jsonb; basis jsonb; bundle jsonb; cid text; bid uuid; members jsonb; windows jsonb;
BEGIN
 IF OLD.kind<>'loads' OR (TG_OP='UPDATE' AND OLD.data->>'InstructorID' IS NOT DISTINCT FROM NEW.data->>'InstructorID' AND OLD.record_key=NEW.record_key) THEN
  IF TG_OP='UPDATE' THEN RETURN NEW; ELSE RETURN OLD; END IF;
 END IF;
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 SELECT data INTO source FROM public.edupulse_workspaces WHERE owner_id::text=OLD.data->>'InstructorID' FOR SHARE;
 basis:=edupulse_private.dean_course_basis(source,OLD.data);
 IF basis IS NULL THEN IF TG_OP='UPDATE' THEN RETURN NEW; ELSE RETURN OLD; END IF; END IF;
 SELECT id INTO cid FROM public.edupulse_courses WHERE instructor_id::text=OLD.data->>'InstructorID' AND syllabus_id=basis->>'id';
 bundle:=jsonb_build_object('syllabus',basis,'content',(SELECT coalesce(jsonb_object_agg(k,v),'{}') FROM jsonb_each(coalesce(source->'content','{}')) e(k,v) WHERE v->>'syllabusId'=basis->>'id'),
  'course',(SELECT to_jsonb(c) FROM public.edupulse_courses c WHERE c.id=cid),
  'publications',(SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]') FROM public.edupulse_publications p WHERE p.course_id=cid),
  'keys',(SELECT coalesce(jsonb_agg(to_jsonb(k)),'[]') FROM edupulse_private.assessment_keys k JOIN public.edupulse_publications p ON p.id=k.publication_id WHERE p.course_id=cid),
  'overrides',(SELECT coalesce(jsonb_agg(v),'[]') FROM jsonb_array_elements(coalesce(source->'enrollmentOverrides','[]')) v WHERE edupulse_private.dean_code_key(v->>'courseCode')=edupulse_private.dean_code_key(OLD.data->>'CourseCode')));
 bundle:=bundle||jsonb_build_object('sources',(SELECT coalesce(jsonb_agg(a.id),'[]') FROM public.edupulse_source_archives a WHERE a.owner_id::text=OLD.data->>'InstructorID'
  AND EXISTS(SELECT 1 FROM jsonb_path_query(bundle,'$.** ? (@.type() == "string")') v WHERE v=to_jsonb(a.id::text) OR (a.url<>'' AND v=to_jsonb(a.url)))));
 INSERT INTO edupulse_private.teaching_handover_bundles(source_owner,syllabus_id,fingerprint,snapshot,created_by)
 VALUES((OLD.data->>'InstructorID')::uuid,basis->>'id',md5(bundle::text),bundle,auth.uid())
 ON CONFLICT(source_owner,syllabus_id,fingerprint) DO UPDATE SET fingerprint=excluded.fingerprint RETURNING id INTO bid;
 SELECT coalesce(jsonb_agg(to_jsonb(e)),'[]') INTO members FROM public.edupulse_enrollments e WHERE e.course_id=cid AND e.block_section=OLD.data->>'Block';
 SELECT d.windows INTO windows FROM public.edupulse_delivery_schedules d WHERE d.course_id=cid AND d.block_section=OLD.data->>'Block';
 INSERT INTO edupulse_private.teaching_load_continuity(load_key,bundle_id,load,memberships,windows) VALUES(OLD.record_key,bid,OLD.data,members,windows)
 ON CONFLICT(load_key) DO UPDATE SET bundle_id=excluded.bundle_id,load=excluded.load,memberships=excluded.memberships,windows=excluded.windows,updated_at=now();
 IF TG_OP='UPDATE' THEN RETURN NEW; ELSE RETURN OLD; END IF;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.capture_load_teaching() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER capture_load_teaching BEFORE UPDATE OR DELETE ON public.edupulse_institutional_records FOR EACH ROW EXECUTE FUNCTION edupulse_private.capture_load_teaching();

-- A replacement may already teach a different block of this course. Bind each
-- inherited load to its own basis so neither instructor's teaching is overwritten.
DO $$ DECLARE original text; definition text; BEGIN
 original:=pg_get_functiondef('edupulse_private.dean_course_basis(jsonb,jsonb)'::regprocedure);
 definition:=replace(original,'AND coalesce(s->>''suspended'',''false'')',
  'AND (CASE WHEN coalesce(load->>''TeachingSyllabusID'','''')<>'''' THEN s->>''id''=load->>''TeachingSyllabusID'' ELSE NOT (s ? ''handedOverFrom'') END) AND coalesce(s->>''suspended'',''false'')');
 IF definition=original THEN RAISE EXCEPTION 'Class teaching basis patch unavailable'; END IF;
 EXECUTE definition;
END $$;

-- Handover writes are fully constructed below. Skip ordinary owner projection,
-- publication and notice triggers only for this private transaction/owner pair.
-- This avoids republishing every unrelated course or replaying learner actions.
DO $$ DECLARE fn regprocedure; definition text; BEGIN
 FOR fn IN SELECT DISTINCT t.tgfoid::regprocedure FROM pg_trigger t WHERE t.tgrelid='public.edupulse_workspaces'::regclass AND NOT t.tgisinternal LOOP
  definition:=pg_get_functiondef(fn);
  IF definition !~* 'RETURNS trigger' THEN RAISE EXCEPTION 'Unexpected workspace trigger %',fn; END IF;
  definition:=regexp_replace(definition,'\mBEGIN\M', 'BEGIN IF edupulse_private.handover_workspace_write(NEW.owner_id) THEN RETURN NEW; END IF;', 'i');
  EXECUTE definition;
 END LOOP;
END $$;

CREATE FUNCTION edupulse_private.continue_load_teaching() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<handover>>
DECLARE continuity edupulse_private.teaching_load_continuity; bundle edupulse_private.teaching_handover_bundles;
 recipient uuid; target_syllabus text; target_course text; target_term text; mapping jsonb; source jsonb; items jsonb; next_data jsonb;
 saved public.edupulse_workspaces; copied edupulse_private.teaching_handover_copies; item record; p jsonb; target_pub text; archive jsonb; source_id text; target_source text;
 path text; version text; original_version text; row jsonb; cls jsonb; members jsonb; student_ids uuid[]; tbl text; id_fields jsonb; is_new boolean;
BEGIN
 IF NEW.kind<>'loads' OR (TG_OP='UPDATE' AND NEW.data->>'InstructorID' IS NOT DISTINCT FROM OLD.data->>'InstructorID') THEN RETURN NEW; END IF;
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
 SELECT * INTO continuity FROM edupulse_private.teaching_load_continuity WHERE load_key=NEW.record_key;
 IF continuity.load_key IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO bundle FROM edupulse_private.teaching_handover_bundles WHERE id=continuity.bundle_id;
 recipient:=(NEW.data->>'InstructorID')::uuid;
 IF bundle.source_owner=recipient THEN
  UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('TeachingSyllabusID',bundle.syllabus_id) WHERE kind='loads' AND record_key=NEW.record_key;
  RETURN NEW;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=recipient AND raw_app_meta_data->>'role'='instructor' AND coalesce(raw_app_meta_data->>'suspended','false')<>'true' AND (banned_until IS NULL OR banned_until<now())) THEN RAISE EXCEPTION 'Choose an active instructor' USING ERRCODE='22023'; END IF;
 -- Serialize with regular compare-and-save and source quota writes in a fixed order.
 PERFORM pg_advisory_xact_lock(hashtextextended(recipient::text,0));
 SELECT * INTO saved FROM public.edupulse_workspaces WHERE owner_id=recipient FOR UPDATE;
 target_term:=concat_ws('|',NEW.data->>'AcademicYear',NEW.data->>'Semester');
 SELECT * INTO copied FROM edupulse_private.teaching_handover_copies WHERE source_owner=bundle.source_owner AND source_syllabus=bundle.syllabus_id AND teaching_handover_copies.recipient=handover.recipient AND term=target_term AND fingerprint=bundle.fingerprint;
 is_new:=copied.syllabus_id IS NULL;
 IF is_new THEN
  target_syllabus:=gen_random_uuid()::text;
  mapping:=jsonb_build_object(bundle.syllabus_id,target_syllabus);
  FOR item IN SELECT key,value FROM jsonb_each(bundle.snapshot->'content') LOOP mapping:=mapping||jsonb_build_object(item.key,'handover-'||md5(target_syllabus||':'||item.key)); END LOOP;
  FOR source_id IN SELECT jsonb_array_elements_text(coalesce(bundle.snapshot->'sources','[]')) LOOP
   SELECT to_jsonb(a) INTO archive FROM public.edupulse_source_archives a WHERE a.id=source_id::uuid AND a.owner_id=bundle.source_owner;
   IF archive IS NOT NULL THEN
    SELECT id::text INTO target_source FROM public.edupulse_source_archives WHERE owner_id=recipient AND reference_key=archive->>'reference_key' AND sha256=archive->>'sha256';
    IF target_source IS NULL THEN target_source:=gen_random_uuid()::text;
     INSERT INTO public.edupulse_source_archives SELECT (jsonb_populate_record(NULL::public.edupulse_source_archives,archive||jsonb_build_object('id',target_source,'owner_id',recipient))).*;
    END IF;
    mapping:=mapping||jsonb_build_object(source_id,target_source);
   END IF;
  END LOOP;
 ELSE target_syllabus:=copied.syllabus_id; mapping:=copied.id_map; END IF;
 target_course:=md5(recipient::text||':'||target_syllabus);
 source:=edupulse_private.handover_rekey(bundle.snapshot->'syllabus',mapping)||jsonb_build_object('sample',false,'instructorId',recipient,
  'handedOverFrom',jsonb_build_object('instructorId',bundle.source_owner,'instructorName',(SELECT coalesce(raw_user_meta_data->>'full_name',email) FROM auth.users WHERE id=bundle.source_owner),'syllabusId',bundle.syllabus_id,'by',auth.uid(),'at',now()));
 IF source->>'status' IN ('active','approved_uploaded') AND (
  source->'approvedFile'->>'approvalAttested' IS DISTINCT FROM 'true' OR coalesce(source->'approvedFile'->>'size','') !~ '^[0-9]+$'
  OR (source->'approvedFile'->>'size')::integer NOT BETWEEN 1 AND 750000
  OR octet_length(decode(source->'approvedFile'->>'base64','base64')) IS DISTINCT FROM (source->'approvedFile'->>'size')::integer
  OR encode(sha256(decode(source->'approvedFile'->>'base64','base64')),'hex') IS DISTINCT FROM source->'approvedFile'->>'sha256'
  OR NOT ((source->'approvedFile'->>'name' ~* '\.pdf$' AND substring(decode(source->'approvedFile'->>'base64','base64') FROM 1 FOR 5)=convert_to('%PDF-','UTF8'))
   OR (source->'approvedFile'->>'name' ~* '\.docx$' AND encode(substring(decode(source->'approvedFile'->>'base64','base64') FROM 1 FOR 4),'hex')='504b0304')))
 THEN RAISE EXCEPTION 'The original approved file is missing or failed verification. Review it before switching this class.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_object_agg(mapping->>k,edupulse_private.handover_rekey(v,mapping)),'{}') INTO items FROM jsonb_each(bundle.snapshot->'content') e(k,v);
 next_data:=coalesce(saved.data,'{"syllabi":[],"content":{},"registrations":[]}'::jsonb);
 IF is_new THEN
  next_data:=jsonb_set(jsonb_set(next_data,'{syllabi}',coalesce(next_data->'syllabi','[]')||jsonb_build_array(source)),'{content}',coalesce(next_data->'content','{}')||items);
 ELSE
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(next_data->'syllabi') s WHERE s->>'id'=target_syllabus) THEN RAISE EXCEPTION 'The continued syllabus was removed. Review the replacement instructor workspace before assigning another block.' USING ERRCODE='40001'; END IF;
 END IF;
 members:=continuity.memberships;
 SELECT array_agg(u.id) INTO student_ids FROM auth.users u WHERE lower(u.email) IN (SELECT lower(m->>'student_email') FROM jsonb_array_elements(members) m);
 -- Carry this block's actual roster, never a source headcount or other blocks.
 IF jsonb_array_length(members)>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(next_data->'registrations','[]')) r WHERE r->>'id'='handover:'||NEW.record_key) THEN
  next_data:=jsonb_set(next_data,'{registrations}',coalesce(next_data->'registrations','[]')||jsonb_build_array(jsonb_build_object('id','handover:'||NEW.record_key,'courseCode',NEW.data->>'CourseCode','blockSection',NEW.data->>'Block','status','active',
   'students',(SELECT jsonb_agg(jsonb_build_object('Email',m->>'student_email','Name',m->>'display_name','StudentID',m->>'student_ref')) FROM jsonb_array_elements(members) m))));
 END IF;
 FOR row IN SELECT v FROM jsonb_array_elements(bundle.snapshot->'overrides') v WHERE lower(v->>'studentEmail') IN (SELECT lower(m->>'student_email') FROM jsonb_array_elements(members) m)
  OR v->>'blockSection'=NEW.data->>'Block'
  OR EXISTS(SELECT 1 FROM public.edupulse_institutional_records r WHERE r.kind IN ('rosters','irregular') AND lower(r.data->>'Email')=lower(v->>'studentEmail') AND r.data->>'Block'=NEW.data->>'Block'
   AND (r.kind='rosters' OR edupulse_private.dean_code_key(r.data->>'CourseCode')=edupulse_private.dean_code_key(NEW.data->>'CourseCode'))) LOOP
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(next_data->'enrollmentOverrides','[]')) v WHERE v->>'courseCode'=row->>'courseCode' AND lower(v->>'studentEmail')=lower(row->>'studentEmail')) THEN next_data:=jsonb_set(next_data,'{enrollmentOverrides}',coalesce(next_data->'enrollmentOverrides','[]')||jsonb_build_array(row)); END IF;
 END LOOP;
 IF octet_length(next_data::text)>3000000 OR jsonb_array_length(next_data->'syllabi')>50 OR (SELECT count(*) FROM jsonb_object_keys(next_data->'content'))>1000 OR jsonb_array_length(next_data->'registrations')>200 OR jsonb_array_length(coalesce(next_data->'enrollmentOverrides','[]'))>5000 THEN RAISE EXCEPTION 'The replacement instructor workspace has insufficient capacity. No course load or teaching data was changed.' USING ERRCODE='22023'; END IF;
 INSERT INTO edupulse_private.teaching_handover_writes VALUES(txid_current(),recipient);
 INSERT INTO public.edupulse_workspaces(owner_id,revision,data,updated_at) VALUES(recipient,1,next_data,now())
 ON CONFLICT(owner_id) DO UPDATE SET data=excluded.data,revision=edupulse_workspaces.revision+1,updated_at=now();
 IF is_new THEN
  INSERT INTO edupulse_private.teaching_handover_copies(source_owner,source_syllabus,recipient,term,fingerprint,syllabus_id,id_map,created_by)
   VALUES(bundle.source_owner,bundle.syllabus_id,recipient,target_term,bundle.fingerprint,target_syllabus,mapping,auth.uid());
  cls:=bundle.snapshot->'course';
  IF cls IS NULL OR cls='null' THEN RAISE EXCEPTION 'The previous course projection is unavailable; handover was not applied' USING ERRCODE='40001'; END IF;
  INSERT INTO public.edupulse_courses SELECT (jsonb_populate_record(NULL::public.edupulse_courses,cls||jsonb_build_object('id',target_course,'instructor_id',recipient,'syllabus_id',target_syllabus,'source_revision',coalesce(saved.revision,0)+1,'instructor_name',(SELECT coalesce(raw_user_meta_data->>'full_name',email) FROM auth.users WHERE id=recipient),'updated_at',now(),'block_info','[]'::jsonb))).*;
  FOR item IN SELECT key,value FROM jsonb_each(bundle.snapshot->'content') LOOP
   FOR path IN SELECT a->>'path' FROM jsonb_array_elements(coalesce(item.value->'content'->'attachments','[]')) a LOOP
    IF split_part(path,'/',1)<>bundle.source_owner::text AND NOT EXISTS(SELECT 1 FROM edupulse_private.teaching_handover_files f WHERE f.owner_id=bundle.source_owner AND f.syllabus_id=bundle.syllabus_id AND f.path=handover.path) THEN RAISE EXCEPTION 'A source teaching file is not authorized for handover' USING ERRCODE='42501'; END IF;
    INSERT INTO edupulse_private.teaching_handover_files VALUES(recipient,target_syllabus,path) ON CONFLICT DO NOTHING;
   END LOOP;
  END LOOP;
 END IF;
 FOR p IN SELECT value FROM jsonb_array_elements(bundle.snapshot->'publications') LOOP
  target_pub:=md5(recipient::text||':'||(mapping->>(p->>'workspace_item_id')));
  original_version:=p->>'source_version'; version:=original_version;
  IF original_version=md5((bundle.snapshot->'content'->(p->>'workspace_item_id')->'content')::text) THEN version:=md5((items->(mapping->>(p->>'workspace_item_id'))->'content')::text); END IF;
  IF is_new THEN
   INSERT INTO public.edupulse_publications SELECT (jsonb_populate_record(NULL::public.edupulse_publications,edupulse_private.handover_rekey(p,mapping)||jsonb_build_object('id',target_pub,'course_id',target_course,'instructor_id',recipient,'source_version',version))).*;
   FOR row IN SELECT k FROM jsonb_array_elements(bundle.snapshot->'keys') k WHERE k->>'publication_id'=p->>'id' LOOP
    INSERT INTO edupulse_private.assessment_keys SELECT (jsonb_populate_record(NULL::edupulse_private.assessment_keys,row||jsonb_build_object('publication_id',target_pub,'source_version',version))).*;
   END LOOP;
  END IF;
  -- Stable derived IDs make repeated loads idempotent. Source records remain
  -- untouched, including marks, answers, timestamps and Admin/test attribution.
  FOREACH tbl IN ARRAY ARRAY['edupulse_attempts','edupulse_material_access','edupulse_material_progress','edupulse_assessment_sessions'] LOOP
   id_fields:=jsonb_build_object('publication_id',target_pub,'instructor_id',recipient);
   EXECUTE format('INSERT INTO public.%1$I SELECT (jsonb_populate_record(NULL::public.%1$I,to_jsonb(a)||$1||jsonb_build_object(''handover_origin'',jsonb_build_object(''publication_id'',a.publication_id,''instructor_id'',$7,''record_id'',to_jsonb(a)->>''id'',''prior'',to_jsonb(a)->''handover_origin''))||CASE WHEN to_jsonb(a) ? ''id'' THEN jsonb_build_object(''id'',md5(a.publication_id||'':''||$2||'':''||(to_jsonb(a)->>''id''))::uuid) ELSE ''{}''::jsonb END||CASE WHEN to_jsonb(a) ? ''source_version'' AND to_jsonb(a)->>''source_version''=$3 THEN jsonb_build_object(''source_version'',$4) ELSE ''{}''::jsonb END)).* FROM public.%1$I a WHERE a.publication_id=$5 AND a.student_id=ANY($6) ON CONFLICT DO NOTHING',tbl)
    USING id_fields,target_pub,original_version,version,p->>'id',coalesce(student_ids,'{}'::uuid[]),bundle.source_owner;
  END LOOP;
 END LOOP;
 IF continuity.windows IS NOT NULL THEN INSERT INTO public.edupulse_delivery_schedules(course_id,instructor_id,syllabus_id,block_section,revision,windows) VALUES(target_course,recipient,target_syllabus,NEW.data->>'Block',1,continuity.windows) ON CONFLICT DO NOTHING; END IF;
 UPDATE public.edupulse_institutional_records SET data=data||jsonb_build_object('TeachingSyllabusID',target_syllabus) WHERE kind='loads' AND record_key=NEW.record_key;
 FOR row IN SELECT v FROM jsonb_array_elements(members) v LOOP
  INSERT INTO public.edupulse_enrollments SELECT (jsonb_populate_record(NULL::public.edupulse_enrollments,row||jsonb_build_object('course_id',target_course,'instructor_id',recipient))).* ON CONFLICT DO NOTHING;
 END LOOP;
 INSERT INTO public.edupulse_academic_events(actor_id,kind,title,detail) VALUES(auth.uid(),'handover','Course teaching continued',(NEW.data->>'CourseCode')||' · '||(NEW.data->>'Block')||' · '||bundle.source_owner::text||' → '||recipient::text);
 DELETE FROM edupulse_private.teaching_handover_writes WHERE transaction_id=txid_current() AND owner_id=recipient;
 RETURN NEW;
END $$;

DO $$ DECLARE fn regprocedure; original text; definition text; BEGIN
 FOREACH fn IN ARRAY ARRAY['public.edupulse_delivery_schedule(jsonb)'::regprocedure,'edupulse_private.require_block_delivery_schedule()'::regprocedure] LOOP
  original:=pg_get_functiondef(fn);
  definition:=replace(original,'l.data->>''InstructorID''=auth.uid()::text','l.data->>''InstructorID''=auth.uid()::text AND (CASE WHEN coalesce(l.data->>''TeachingSyllabusID'','''')<>'''' THEN l.data->>''TeachingSyllabusID''=source->>''id'' ELSE NOT (source ? ''handedOverFrom'') END)');
  definition:=replace(definition,'l.data->>''InstructorID''=NEW.owner_id::text','l.data->>''InstructorID''=NEW.owner_id::text AND (CASE WHEN coalesce(l.data->>''TeachingSyllabusID'','''')<>'''' THEN l.data->>''TeachingSyllabusID''=source->>''id'' ELSE NOT (source ? ''handedOverFrom'') END)');
  IF definition=original THEN RAISE EXCEPTION 'Class-specific schedule patch unavailable'; END IF;
  EXECUTE definition;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.continue_load_teaching() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER continue_load_teaching AFTER INSERT OR UPDATE ON public.edupulse_institutional_records FOR EACH ROW EXECUTE FUNCTION edupulse_private.continue_load_teaching();

DO $$ DECLARE original text; definition text; BEGIN
 original:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 definition:=replace(original,'WHEN ''load.remove'' THEN RETURN',
  'WHEN ''load.remove'' THEN IF command->>''expected_instructor'' IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(command->''keys'') k LEFT JOIN public.edupulse_institutional_records l ON l.kind=''loads'' AND l.record_key=k WHERE l.data->>''InstructorID'' IS DISTINCT FROM command->>''expected_instructor'') THEN RAISE EXCEPTION ''This load changed. Reopen the course before removing it.'' USING ERRCODE=''40001''; END IF; RETURN');
 IF definition=original THEN RAISE EXCEPTION 'Stale course load removal patch unavailable'; END IF;
 EXECUTE definition;
END $$;

ALTER TABLE public.edupulse_attempts ADD COLUMN handover_origin jsonb;
ALTER TABLE public.edupulse_material_access ADD COLUMN handover_origin jsonb;
ALTER TABLE public.edupulse_material_progress ADD COLUMN handover_origin jsonb;
ALTER TABLE public.edupulse_assessment_sessions ADD COLUMN handover_origin jsonb;

-- A historical copy is not a fresh student action. Preserve existing attribution
-- rather than letting normal insert labels turn Admin/test work independent.
CREATE FUNCTION edupulse_private.handover_history_write(publication text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.edupulse_publications p WHERE p.id=publication AND edupulse_private.handover_workspace_write(p.instructor_id))
$$;
REVOKE ALL ON FUNCTION edupulse_private.handover_history_write(text) FROM PUBLIC,anon,authenticated;
DO $$ DECLARE fn regprocedure; definition text; BEGIN
 FOR fn IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='edupulse_private' AND p.proname IN ('label_pipeline_activity','label_assessment_session','assessment_student_label','admin_activity_label') LOOP
  definition:=pg_get_functiondef(fn);
  definition:=regexp_replace(definition,'\mBEGIN\M','BEGIN IF edupulse_private.handover_history_write(NEW.publication_id) THEN RETURN NEW; END IF;','i');
  EXECUTE definition;
 END LOOP;
END $$;

-- All paths that lock a workspace for saving acquire the existing institutional
-- lock first, matching the load handover and avoiding a row/advisory deadlock.
DO $$ DECLARE fn regprocedure; definition text; BEGIN
 FOREACH fn IN ARRAY ARRAY['public.edupulse_save_workspace(bigint,jsonb)'::regprocedure,'edupulse_private.syllabus_share_command(jsonb)'::regprocedure] LOOP
  definition:=pg_get_functiondef(fn);
  definition:=regexp_replace(definition,'\mBEGIN\M','BEGIN PERFORM pg_advisory_xact_lock(hashtext(''edupulse-institutional-import''));','i');
  EXECUTE definition;
 END LOOP;
END $$;

-- A copied registration cannot keep a removed class accessible after a later
-- workspace save. Match the same current-term syllabus basis as Instructor Course.
CREATE FUNCTION edupulse_private.course_has_current_load(course text,block text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.edupulse_courses c JOIN public.edupulse_workspaces w ON w.owner_id=c.instructor_id
 JOIN public.edupulse_institutional_records l ON l.kind='loads' AND l.data->>'InstructorID'=c.instructor_id::text
  AND edupulse_private.dean_code_key(l.data->>'CourseCode')=edupulse_private.dean_code_key(c.course_code)
 WHERE c.id=course AND l.data->>'Block'=block AND coalesce(l.data->>'Status','') !~* '^(inactive|suspended|withdrawn|deleted)$'
  AND coalesce(nullif(l.data->>'AcademicYear',''),'2026-2027')='2026-2027' AND coalesce(l.data->>'Semester','') !~* '^(2|second|summer)'
  AND edupulse_private.dean_course_basis(w.data,l.data)->>'id'=c.syllabus_id)
$$;
REVOKE ALL ON FUNCTION edupulse_private.course_has_current_load(text,text) FROM PUBLIC,anon,authenticated;
DO $$ DECLARE original text; definition text; BEGIN
 original:=pg_get_functiondef('edupulse_private.refresh_imported_enrollments()'::regprocedure);
 definition:=regexp_replace(original,'DELETE FROM public.edupulse_enrollments e USING public.edupulse_courses c,public.edupulse_institutional_records l WHERE[^;]+;',
  'DELETE FROM public.edupulse_enrollments e WHERE NOT edupulse_private.course_has_current_load(e.course_id,e.block_section);');
 definition:=replace(definition,'AND l.data->>''InstructorID''=c.instructor_id::text','AND l.data->>''InstructorID''=c.instructor_id::text AND edupulse_private.course_has_current_load(c.id,l.data->>''Block'')');
 IF definition=original OR strpos(definition,'course_has_current_load(c.id')=0 THEN RAISE EXCEPTION 'Current load enrollment patch unavailable'; END IF;
 EXECUTE definition;
 original:=pg_get_functiondef('edupulse_private.guard_roster_membership()'::regprocedure);
 definition:=regexp_replace(original,'\mBEGIN\M','BEGIN IF NOT edupulse_private.course_has_current_load(NEW.course_id,NEW.block_section) THEN RETURN NULL; END IF;','i');
 EXECUTE definition;
END $$;

CREATE FUNCTION edupulse_private.handover_file_access(path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE role text:=edupulse_private.academic_role(); BEGIN
 IF auth.uid() IS NULL THEN RETURN false; END IF;
 IF role IN ('instructor','admin') THEN
  RETURN EXISTS(SELECT 1 FROM edupulse_private.teaching_handover_files f
   JOIN public.edupulse_workspaces w ON w.owner_id=f.owner_id
   JOIN public.edupulse_courses c ON c.instructor_id=f.owner_id AND c.syllabus_id=f.syllabus_id
   WHERE f.owner_id=auth.uid() AND f.path=handover_file_access.path
    AND EXISTS(SELECT 1 FROM public.edupulse_institutional_records l WHERE l.kind='loads' AND l.data->>'InstructorID'=f.owner_id::text AND edupulse_private.dean_course_basis(w.data,l.data)->>'id'=f.syllabus_id)
    AND EXISTS(SELECT 1 FROM jsonb_each(w.data->'content') e WHERE e.value->>'syllabusId'=f.syllabus_id AND coalesce(e.value->'content'->'attachments','[]') @> jsonb_build_array(jsonb_build_object('path',f.path))));
 ELSIF role='student' THEN
  RETURN EXISTS(SELECT 1 FROM edupulse_private.teaching_handover_files f JOIN public.edupulse_publications p ON p.instructor_id=f.owner_id
   JOIN public.edupulse_courses c ON c.id=p.course_id AND c.syllabus_id=f.syllabus_id AND c.active
   JOIN public.edupulse_enrollments e ON e.course_id=c.id JOIN auth.users u ON u.id=auth.uid() AND lower(u.email)=e.student_email
   WHERE f.path=handover_file_access.path AND NOT e.suspended AND p.active AND (p.release_at IS NULL OR p.release_at<=now())
    AND edupulse_private.publication_window_open(p.id) AND coalesce(p.content->'attachments','[]') @> jsonb_build_array(jsonb_build_object('path',f.path)));
 END IF; RETURN false;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.handover_file_access(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION edupulse_private.handover_file_access(text) TO authenticated;
CREATE POLICY edupulse_handover_file_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='edupulse-teaching-files' AND edupulse_private.handover_file_access(name));
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('edupulse_private.dean_scan_teaching_file(text)'::regprocedure);
 definition:=replace(definition,'l.data->>''InstructorID''=split_part(path,''/'',1)',
  '(l.data->>''InstructorID''=split_part(path,''/'',1) OR EXISTS(SELECT 1 FROM edupulse_private.teaching_handover_files f WHERE f.owner_id::text=l.data->>''InstructorID'' AND f.path=path))');
 EXECUTE definition;
END $$;
