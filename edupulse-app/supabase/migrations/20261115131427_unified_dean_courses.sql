-- A narrow, read-only projection of the same syllabus basis shown in Instructor Course.
-- Full workspaces, answer keys, AI evidence, source archives and learner activity stay private.
CREATE FUNCTION edupulse_private.dean_course_basis(snapshot jsonb, load jsonb) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH scope AS (
  SELECT jsonb_build_object('AcademicYear',coalesce(nullif(load->>'AcademicYear',''),c.data->>'AcademicYear',''),
   'Semester',coalesce(nullif(load->>'Semester',''),c.data->>'Semester','')) AS term
  FROM (SELECT 1) singleton LEFT JOIN public.edupulse_institutional_records c ON c.kind='courses'
   AND edupulse_private.dean_code_key(c.data->>'CourseCode')=edupulse_private.dean_code_key(load->>'CourseCode') LIMIT 1
 )
 SELECT s FROM jsonb_array_elements(coalesce(snapshot->'syllabi','[]')) s CROSS JOIN scope
 WHERE edupulse_private.dean_code_key(s->>'courseCode')=edupulse_private.dean_code_key(load->>'CourseCode')
 AND coalesce(s->>'suspended','false')<>'true' AND s->>'status'<>'archived'
 AND (scope.term->>'AcademicYear'='' OR coalesce(s->'courseInfo'->>'academicYear','')='' OR scope.term->>'AcademicYear'=s->'courseInfo'->>'academicYear')
 AND (scope.term->>'Semester'='' OR coalesce(s->'courseInfo'->>'periodOffered','')=''
   OR CASE WHEN scope.term->>'Semester' ~* '(1|first)' THEN '1' WHEN scope.term->>'Semester' ~* '(2|second)' THEN '2' ELSE lower(btrim(scope.term->>'Semester')) END
    = CASE WHEN s->'courseInfo'->>'periodOffered' ~* '(1|first)' THEN '1' WHEN s->'courseInfo'->>'periodOffered' ~* '(2|second)' THEN '2' ELSE lower(btrim(s->'courseInfo'->>'periodOffered')) END)
 ORDER BY (s->>'status'='active') DESC, coalesce(s->>'lastUpdated','') DESC, s->>'id' LIMIT 1
$$;

CREATE FUNCTION edupulse_private.dean_inspect_load(p_key text, expected_instructor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE load jsonb; snapshot jsonb; basis jsonb; items jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean','admin') THEN RAISE EXCEPTION 'Academic management account required' USING ERRCODE='42501'; END IF;
 SELECT data INTO load FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=p_key;
 IF load IS NULL OR load->>'InstructorID' IS DISTINCT FROM expected_instructor OR coalesce(load->>'Status','') ~* '^(inactive|suspended|withdrawn|deleted)$'
 OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id::text=load->>'InstructorID' AND u.raw_app_meta_data->>'role'='instructor' AND coalesce(u.raw_app_meta_data->>'suspended','false')<>'true') THEN
  RAISE EXCEPTION 'This course load is no longer available. Close and select a current instructor.' USING ERRCODE='22023';
 END IF;
 SELECT w.data INTO snapshot FROM public.edupulse_workspaces w WHERE w.owner_id::text=load->>'InstructorID';
 basis:=edupulse_private.dean_course_basis(snapshot,load);
 IF basis IS NULL THEN RETURN jsonb_build_object('syllabus',NULL,'items','[]'::jsonb); END IF;
 -- Whitelist displayed fields rather than forwarding a private workspace or question object.
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.key,'week',e.value->'week','type',e.value->>'type','status',e.value->>'status','content',
  jsonb_build_object('title',e.value->'content'->>'title','description',e.value->'content'->>'description','subtitle',e.value->'content'->>'subtitle',
   'sections',(SELECT coalesce(jsonb_agg(jsonb_build_object('heading',s->>'heading','body',s->'body')),'[]') FROM jsonb_array_elements(coalesce(e.value->'content'->'sections','[]')) s),
   'attachments',(SELECT coalesce(jsonb_agg(jsonb_build_object('path',a->>'path','name',a->>'name','mime',a->>'mime','size',a->'size')),'[]') FROM jsonb_array_elements(coalesce(e.value->'content'->'attachments','[]')) a),
   'questions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',q->>'id','text',q->>'text','type',q->>'type','responseFormat',q->>'responseFormat',
     'options',(SELECT coalesce(jsonb_agg(CASE WHEN jsonb_typeof(o)='string' THEN o ELSE o->'text' END),'[]') FROM jsonb_array_elements(coalesce(q->'options','[]')) o))),'[]')
    FROM jsonb_array_elements(coalesce(e.value->'content'->'questions','[]')) q))) ORDER BY (e.value->>'week')::integer,e.key),'[]') INTO items
 FROM jsonb_each(coalesce(snapshot->'content','{}')) e WHERE e.value->>'syllabusId'=basis->>'id'
  AND e.value->>'type' IN ('material','activity','assessment') AND e.value->'content' IS NOT NULL;
 RETURN jsonb_build_object('syllabus',jsonb_build_object('id',basis->>'id','courseCode',basis->>'courseCode','courseTitle',basis->>'courseTitle',
  'status',basis->>'status','courseOutline',coalesce(basis->'courseOutline','[]'),'approvedFile',basis->'approvedFile'),'items',items);
END $$;

-- Explicit file scans use the same live role, load and chosen syllabus checks, including private drafts.
CREATE FUNCTION edupulse_private.dean_scan_teaching_file(path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE entry record; basis jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(edupulse_private.academic_role(),'') NOT IN ('dean','associate_dean') THEN RETURN false; END IF;
 FOR entry IN SELECT l.data AS load,w.data AS snapshot FROM public.edupulse_institutional_records l
 JOIN public.edupulse_workspaces w ON w.owner_id::text=l.data->>'InstructorID'
 JOIN auth.users u ON u.id=w.owner_id AND u.raw_app_meta_data->>'role'='instructor' AND coalesce(u.raw_app_meta_data->>'suspended','false')<>'true'
 WHERE l.kind='loads' AND l.data->>'InstructorID'=split_part(path,'/',1) AND coalesce(l.data->>'Status','') !~* '^(inactive|suspended|withdrawn|deleted)$' LOOP
  basis:=edupulse_private.dean_course_basis(entry.snapshot,entry.load);
  IF basis IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_each(coalesce(entry.snapshot->'content','{}')) e
   WHERE e.value->>'syllabusId'=basis->>'id' AND coalesce(e.value->'content'->'attachments','[]') @> jsonb_build_array(jsonb_build_object('path',path))) THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.dean_course_basis(jsonb,jsonb),edupulse_private.dean_inspect_load(text,text),edupulse_private.dean_scan_teaching_file(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION edupulse_private.dean_scan_teaching_file(text) TO authenticated;
CREATE POLICY edupulse_teaching_file_scan ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='edupulse-teaching-files' AND edupulse_private.dean_scan_teaching_file(name));

-- Extend the existing single entry point; all load edits keep its import transaction lock.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.edupulse_dean_command(jsonb)'::regprocedure);
 definition:=replace(definition,'DECLARE v_action text:=command->>''action'';',
  'DECLARE v_action text:=command->>''action''; previous jsonb; target_key text; target_block text; target_sem text; result jsonb;');
 definition:=replace(definition,'IF v_action=''directory'' THEN',
  'IF v_action=''load.inspect'' THEN RETURN edupulse_private.dean_inspect_load(command->>''key'',command->>''expected_instructor''); END IF; IF v_action=''directory'' THEN');
 definition:=replace(definition,'WHEN ''load.assign'' THEN', $patch$
 WHEN 'load.update' THEN
  SELECT data INTO previous FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=command->>'key' FOR UPDATE;
  IF previous IS NULL OR previous->>'InstructorID' IS DISTINCT FROM command->>'expected_instructor' THEN RAISE EXCEPTION 'This load changed. Refresh the course before editing it.' USING ERRCODE='40001'; END IF;
  target_block:=edupulse_private.dean_block(command->>'block');
  target_sem:=edupulse_private.dean_clean(command->>'semester',60);
  IF target_block='' OR target_block='IRREGULAR' THEN RAISE EXCEPTION 'Choose a block' USING ERRCODE='22023'; END IF;
  IF target_sem='' THEN target_sem:=coalesce(previous->>'Semester',''); END IF;
  target_key:=concat_ws('|',previous->>'CourseCode',target_block,target_sem);
  IF target_key<>command->>'key' AND EXISTS(SELECT 1 FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=target_key) THEN RAISE EXCEPTION 'That course, block and semester already has a load. Edit that load instead.' USING ERRCODE='22023'; END IF;
  IF target_key<>command->>'key' THEN DELETE FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=command->>'key'; END IF;
  result:=edupulse_private.dean_assign_loads(jsonb_build_array(jsonb_build_object('course_code',previous->>'CourseCode','instructor_id',command->>'instructor_id','block',target_block,'semester',target_sem)),'Course load edited');
  UPDATE public.edupulse_institutional_records SET data=previous||data WHERE kind='loads' AND record_key=target_key;
  RETURN result||jsonb_build_object('key',target_key);
 WHEN 'load.assign' THEN
 $patch$);
 IF strpos(definition,'WHEN ''load.update''')=0 OR strpos(definition,'dean_inspect_load')=0 THEN RAISE EXCEPTION 'Course command patch unavailable'; END IF;
 EXECUTE definition;
END $$;
