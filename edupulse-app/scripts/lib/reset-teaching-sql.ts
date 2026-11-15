// Owner-requested maintenance only. No application route calls this reset.
export const resetTables = [
  'public.edupulse_workspaces', 'public.edupulse_courses', 'public.edupulse_enrollments',
  'public.edupulse_publications', 'public.edupulse_attempts', 'public.edupulse_material_access',
  'public.edupulse_material_progress', 'public.edupulse_assessment_sessions',
  'public.edupulse_syllabus_shares', 'public.edupulse_source_archives',
  'public.edupulse_ai_documents', 'public.edupulse_ai_chunks',
  'public.edupulse_practice_sets', 'public.edupulse_practice_attempts',
  'edupulse_private.assessment_keys', 'edupulse_private.practice_keys',
  'edupulse_private.pipeline_activity_grants', 'public.edupulse_notices',
] as const
export const foundationTables = ['public.edupulse_institutional_records', 'public.edupulse_students', 'public.edupulse_staff_profiles'] as const
export const tableDigest = (table: string) => `(SELECT md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text),'')) FROM ${table} t)`
export const accountDigest = `(SELECT md5(coalesce(string_agg(jsonb_build_array(id,email,raw_app_meta_data,raw_user_meta_data)::text,E'\n' ORDER BY id),'')) FROM auth.users)`
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"

export function teachingResetSQL(digests: Record<string, string>, apply = false) {
  for (const table of [...resetTables, ...foundationTables, 'accounts']) if (!/^[a-f0-9]{32}$/.test(digests[table] || '')) throw new Error(`Missing verified backup fingerprint: ${table}`)
  const guards = [...resetTables, ...foundationTables, 'accounts'].map(table => `IF ${table === 'accounts' ? accountDigest : tableDigest(table)} <> ${quote(digests[table])} THEN RAISE EXCEPTION 'Snapshot changed: ${table}. Take a fresh backup before retrying.'; END IF;`).join('\n')
  return `BEGIN;
SET LOCAL statement_timeout='120s';
SELECT pg_advisory_xact_lock(hashtext('edupulse-institutional-import'));
LOCK TABLE ${[...resetTables, ...foundationTables].sort().join(',')} IN SHARE ROW EXCLUSIVE MODE;
DO $guard$ BEGIN ${guards} END $guard$;
DO $activity$ BEGIN
 IF EXISTS(SELECT 1 FROM public.edupulse_attempts WHERE NOT coalesce(is_test,false))
 OR EXISTS(SELECT 1 FROM public.edupulse_material_access WHERE NOT coalesce(is_test,false)) THEN
  RAISE EXCEPTION 'Independent learner activity exists. This demonstration reset must not erase it.';
 END IF;
END $activity$;
CREATE TEMP TABLE kept_records ON COMMIT DROP AS SELECT * FROM public.edupulse_institutional_records;
CREATE TEMP TABLE kept_students ON COMMIT DROP AS SELECT * FROM public.edupulse_students;
CREATE TEMP TABLE kept_staff ON COMMIT DROP AS SELECT * FROM public.edupulse_staff_profiles;
CREATE TEMP TABLE kept_workspaces ON COMMIT DROP AS SELECT * FROM public.edupulse_workspaces;
CREATE TEMP TABLE kept_enrollments ON COMMIT DROP AS SELECT e.* FROM public.edupulse_enrollments e
WHERE EXISTS(SELECT 1 FROM public.edupulse_courses c JOIN kept_records l ON l.kind='loads'
 AND l.data->>'InstructorID'=c.instructor_id::text
 AND edupulse_private.dean_code_key(l.data->>'CourseCode')=edupulse_private.dean_code_key(c.course_code)
 WHERE c.id=e.course_id AND l.data->>'Block'=e.block_section);
CREATE TEMP TABLE removed_documents ON COMMIT DROP AS SELECT d.id FROM public.edupulse_ai_documents d WHERE
 EXISTS(SELECT 1 FROM public.edupulse_source_archives s WHERE s.owner_id=d.owner_id AND s.id::text=d.quality->'source'->>'id')
 OR EXISTS(SELECT 1 FROM kept_records c WHERE c.kind='courses' AND edupulse_private.dean_code_key(c.data->>'CourseCode')=edupulse_private.dean_code_key(d.quality->>'course'));
DO $reset$
DECLARE w record; suspended jsonb;
BEGIN
 FOR w IN SELECT ws.*,u.email,u.raw_app_meta_data FROM public.edupulse_workspaces ws JOIN auth.users u ON u.id=ws.owner_id ORDER BY ws.owner_id LOOP
  IF jsonb_array_length(w.data->'syllabi')=0 AND w.data->'content'='{}'::jsonb THEN CONTINUE; END IF;
  IF coalesce(w.raw_app_meta_data->>'role','') NOT IN ('admin','instructor') THEN RAISE EXCEPTION 'Unexpected teaching workspace role'; END IF;
  PERFORM set_config('request.jwt.claim.sub',w.owner_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',w.owner_id,'email',w.email,'role','authenticated','app_metadata',w.raw_app_meta_data)::text,true);
  suspended:=jsonb_set(jsonb_set(w.data,'{content}','{}'::jsonb),'{syllabi}',
   (SELECT coalesce(jsonb_agg(s||jsonb_build_object('status','archived','suspended',true) ORDER BY n),'[]') FROM jsonb_array_elements(w.data->'syllabi') WITH ORDINALITY x(s,n)));
  -- Keep the ordinary owner checks, revision protection and suspend-before-remove trigger.
  PERFORM public.edupulse_save_workspace(w.revision,suspended);
  PERFORM public.edupulse_save_workspace(w.revision+1,jsonb_set(suspended,'{syllabi}','[]'::jsonb));
 END LOOP;
END $reset$;

DELETE FROM public.edupulse_practice_attempts WHERE set_id IN (SELECT id FROM public.edupulse_practice_sets);
DELETE FROM public.edupulse_practice_sets WHERE id IS NOT NULL;
DELETE FROM public.edupulse_assessment_sessions WHERE publication_id IN (SELECT id FROM public.edupulse_publications);
DELETE FROM public.edupulse_attempts WHERE publication_id IN (SELECT id FROM public.edupulse_publications);
DELETE FROM public.edupulse_material_progress WHERE publication_id IN (SELECT id FROM public.edupulse_publications);
DELETE FROM public.edupulse_material_access WHERE publication_id IN (SELECT id FROM public.edupulse_publications);
DELETE FROM public.edupulse_notices WHERE publication_id IN (SELECT id FROM public.edupulse_publications);
DELETE FROM public.edupulse_publications WHERE id IS NOT NULL;
DELETE FROM public.edupulse_syllabus_shares WHERE id IS NOT NULL;
DELETE FROM public.edupulse_ai_documents WHERE id IN (SELECT id FROM removed_documents);
DELETE FROM public.edupulse_source_archives WHERE id IS NOT NULL;

-- Keep course/load identities and class membership, but remove all syllabus-derived content.
DELETE FROM public.edupulse_courses c WHERE NOT EXISTS(SELECT 1 FROM kept_records l WHERE l.kind='loads'
 AND l.data->>'InstructorID'=c.instructor_id::text
 AND edupulse_private.dean_code_key(l.data->>'CourseCode')=edupulse_private.dean_code_key(c.course_code));
UPDATE public.edupulse_courses c SET active=false,syllabus_status='',outline='[]',source_links='[]',delivery='{}',
 source_revision=coalesce((SELECT revision FROM public.edupulse_workspaces WHERE owner_id=c.instructor_id),source_revision),updated_at=now()
WHERE c.id IS NOT NULL;
DELETE FROM public.edupulse_enrollments WHERE course_id IN (SELECT id FROM public.edupulse_courses);
INSERT INTO public.edupulse_enrollments SELECT * FROM kept_enrollments;

DO $verify$
BEGIN
 IF EXISTS(SELECT 1 FROM public.edupulse_workspaces WHERE jsonb_array_length(data->'syllabi')<>0 OR data->'content'<>'{}'::jsonb)
 OR EXISTS(SELECT 1 FROM public.edupulse_publications) OR EXISTS(SELECT 1 FROM public.edupulse_syllabus_shares)
 OR EXISTS(SELECT 1 FROM public.edupulse_attempts) OR EXISTS(SELECT 1 FROM public.edupulse_material_access)
 OR EXISTS(SELECT 1 FROM public.edupulse_material_progress) OR EXISTS(SELECT 1 FROM public.edupulse_assessment_sessions)
 OR EXISTS(SELECT 1 FROM public.edupulse_practice_sets) OR EXISTS(SELECT 1 FROM public.edupulse_practice_attempts)
 OR EXISTS(SELECT 1 FROM public.edupulse_source_archives)
 OR EXISTS(SELECT 1 FROM edupulse_private.assessment_keys) OR EXISTS(SELECT 1 FROM edupulse_private.practice_keys)
 OR EXISTS(SELECT 1 FROM edupulse_private.pipeline_activity_grants)
 OR EXISTS(SELECT 1 FROM public.edupulse_ai_documents WHERE id IN (SELECT id FROM removed_documents))
 OR EXISTS(SELECT 1 FROM public.edupulse_courses WHERE active OR syllabus_status<>'' OR outline<>'[]'::jsonb OR source_links<>'[]'::jsonb OR delivery<>'{}'::jsonb)
 THEN RAISE EXCEPTION 'Teaching reset did not finish'; END IF;
 IF ${tableDigest('public.edupulse_institutional_records')} <> ${quote(digests['public.edupulse_institutional_records'])}
 OR ${tableDigest('public.edupulse_students')} <> ${quote(digests['public.edupulse_students'])}
 OR ${tableDigest('public.edupulse_staff_profiles')} <> ${quote(digests['public.edupulse_staff_profiles'])}
 OR ${accountDigest} <> ${quote(digests.accounts)} THEN RAISE EXCEPTION 'Protected institutional/account data changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.edupulse_workspaces w JOIN kept_workspaces b USING(owner_id)
  WHERE w.data-'syllabi'-'content' IS DISTINCT FROM b.data-'syllabi'-'content') THEN RAISE EXCEPTION 'Roster or workspace settings changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.edupulse_workspaces w JOIN kept_workspaces b USING(owner_id)
  WHERE w.revision<>b.revision+CASE WHEN jsonb_array_length(b.data->'syllabi')=0 AND b.data->'content'='{}'::jsonb THEN 0 ELSE 2 END)
 THEN RAISE EXCEPTION 'Workspace revisions were not advanced safely'; END IF;
 IF EXISTS((SELECT * FROM kept_enrollments EXCEPT SELECT * FROM public.edupulse_enrollments)
 UNION ALL (SELECT * FROM public.edupulse_enrollments EXCEPT SELECT * FROM kept_enrollments)) THEN RAISE EXCEPTION 'Loaded block membership changed'; END IF;
END $verify$;
SELECT jsonb_build_object('phase',${quote(apply ? 'commit' : 'rollback-check')},'syllabi',0,'items',0,
 'publications',(SELECT count(*) FROM public.edupulse_publications),'loaded_course_rows',(SELECT count(*) FROM public.edupulse_courses),
 'memberships',(SELECT count(*) FROM public.edupulse_enrollments),'loads',(SELECT count(*) FROM kept_records WHERE kind='loads'),
 'rosters',(SELECT count(*) FROM kept_records WHERE kind='rosters'),'accounts_preserved',true,'institutional_preserved',true) AS receipt;
${apply ? 'COMMIT' : 'ROLLBACK'};
`
}
