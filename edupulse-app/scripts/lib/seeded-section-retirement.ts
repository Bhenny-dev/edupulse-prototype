import { populationTerm } from './population-content.js'

type Load = { record_key: string; data: Record<string, any>; updated_at: string }
type Retirement = { owner: string; kept: string[]; retired: Load[] }
const current = (l: Load) => l.data.LoadType === 'class' && l.data.AcademicYear === populationTerm.academic_year && l.data.Semester === populationTerm.semester

/** Only sections absent from the retained baseline AND attributed to our batch may retire. */
export function seededSectionRetirement(live: { loads: Load[]; batchManifests: any[] }, baseline: { edupulse_institutional_records: any[] }, owner: string): Retirement {
 const original = new Set<string>(baseline.edupulse_institutional_records.filter(l => l.kind === 'loads' && l.data.InstructorID === owner && current(l)).map(l => l.record_key))
 const classes = live.loads.filter(l => l.data.InstructorID === owner && current(l))
 if (!original.size || [...original].some(k => !classes.some(l => l.record_key === k))) throw Error('The confirmed baseline sections must all be present.')
 const retired = classes.filter(l => !original.has(l.record_key))
 for (const l of retired) if (!live.batchManifests.some(b => b.id.startsWith('academic-population-2026-11-25-scoped:classes:') && b.manifest.owner === owner && b.manifest.course === l.data.CourseCode && b.manifest.blocks.some((v: any) => v.block === l.data.Block))) throw Error('An extra section has no matching population provenance; stop for review.')
 return { owner, kept: [...original].sort(), retired }
}

const literal = (v: unknown) => "'" + String(v).replaceAll("'", "''") + "'"
const history = [
 ['public.edupulse_attempts', 'id::text'],
 ['public.edupulse_material_access', "publication_id||':'||student_id"],
 ['public.edupulse_material_progress', "publication_id||':'||student_id||':'||source_version"],
 ['public.edupulse_practice_sets', 'id::text'],
 ['public.edupulse_practice_attempts', 'id::text'],
 ['edupulse_private.topic_comments', 'id::text'],
 ['edupulse_private.topic_submissions', "publication_id||':'||student_id"],
]

/** Privileged one-time correction; existing management continuity triggers stay enabled. */
export function retireSectionsSql(plan: Retirement, actor: string, sourceHash: string, rollback: boolean) {
 if (!/^[0-9a-f]{64}$/.test(sourceHash) || !plan.retired.length || !plan.kept.length) throw Error('Review a nonempty plan and source SHA-256 first.')
 const rows = literal(JSON.stringify(plan.retired)) + '::jsonb'
 const keep = literal(JSON.stringify(plan.kept)) + '::jsonb'
 const fingerprints = history.map(([table, key]) => `SELECT ${literal(table)} AS relation,${key} AS key,md5(to_jsonb(t)::text) AS fingerprint FROM ${table} t`).join('\nUNION ALL\n')
 const checks = history.map(([table, key]) => `IF EXISTS(SELECT key,fingerprint FROM load_retirement_history WHERE relation=${literal(table)} EXCEPT SELECT ${key},md5(to_jsonb(t)::text) FROM ${table} t) THEN RAISE EXCEPTION 'Learning history changed in ${table}';END IF;`).join('\n')
 return `BEGIN;
SET LOCAL statement_timeout='90s';
CREATE TEMP TABLE load_retirement_history ON COMMIT DROP AS ${fingerprints};
DO $retire$
DECLARE actor auth.users%ROWTYPE; r jsonb; actual public.edupulse_institutional_records%ROWTYPE;
BEGIN
 SELECT * INTO actor FROM auth.users WHERE id=${literal(actor)}::uuid;
 IF actor.id IS NULL OR coalesce(actor.raw_app_meta_data->>'role','') NOT IN ('dean','associate_dean','admin') OR coalesce(actor.raw_app_meta_data->>'suspended','false')='true' OR actor.banned_until>now() THEN RAISE EXCEPTION 'An active management actor is required';END IF;
 PERFORM set_config('request.jwt.claim.sub',actor.id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor.id,'email',actor.email,'role','authenticated','app_metadata',actor.raw_app_meta_data)::text,true);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(${keep}) k WHERE NOT EXISTS(SELECT 1 FROM public.edupulse_institutional_records x WHERE x.kind='loads' AND x.record_key=k AND x.data->>'InstructorID'=${literal(plan.owner)})) THEN RAISE EXCEPTION 'A confirmed section disappeared';END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(${rows}) LOOP
  SELECT * INTO actual FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=r->>'record_key' FOR UPDATE;
  IF actual.record_key IS NULL OR actual.data<>r->'data' OR actual.updated_at<>(r->>'updated_at')::timestamptz OR actual.data->>'InstructorID'<>${literal(plan.owner)} OR actual.data->>'LoadType'<>'class' THEN RAISE EXCEPTION 'A reviewed section changed; take a fresh snapshot';END IF;
  IF NOT EXISTS(SELECT 1 FROM edupulse_private.population_batches b CROSS JOIN LATERAL jsonb_array_elements(b.manifest->'blocks') block WHERE b.id LIKE 'academic-population-2026-11-25-scoped:classes:%' AND b.manifest->>'owner'=${literal(plan.owner)} AND b.manifest->>'course'=actual.data->>'CourseCode' AND block->>'block'=actual.data->>'Block') THEN RAISE EXCEPTION 'Population provenance is missing';END IF;
  UPDATE edupulse_private.class_codes SET disabled_at=clock_timestamp() WHERE load_key=actual.record_key AND disabled_at IS NULL;
  DELETE FROM public.edupulse_institutional_records WHERE kind='loads' AND record_key=actual.record_key;
 END LOOP;
 PERFORM edupulse_private.refresh_imported_enrollments();
 ${checks}
 INSERT INTO edupulse_private.population_batches(id,actor_id,provenance,manifest,completed_at) VALUES(${literal('source-load-correction-20261125:' + plan.owner)},actor.id,'owner-authorized-generated-population',jsonb_build_object('sourceSHA256',${literal(sourceHash)},'retained',${keep},'retired',${rows},'learningHistoryUnchanged',true),now());
END $retire$;
SELECT count(*)::int AS retained_classes FROM public.edupulse_institutional_records WHERE kind='loads' AND data->>'InstructorID'=${literal(plan.owner)} AND data->>'LoadType'='class' AND data->>'AcademicYear'=${literal(populationTerm.academic_year)} AND data->>'Semester'=${literal(populationTerm.semester)};
${rollback ? 'ROLLBACK' : 'COMMIT'};`
}
