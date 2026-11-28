import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { workspaceData } from '../server/workspace.js'
import { populationVersion, weekOneAssessments } from './lib/population-content.js'

const args = process.argv.slice(2)
if (args.length > 1 || (args[0] && !['--rehearse','--apply'].includes(args[0]))) throw Error('Use no option for a plan, --rehearse to roll back, or --apply.')
if (readFileSync('supabase/.temp/project-ref','utf8').trim() !== 'xyziepdkdvvuhgkymooo') throw Error('Link the EduPulse project first.')
const dir = join('.data','week-one-assessment-backfill')
mkdirSync(dir,{recursive:true})
const cli = join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')
const text = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const json = (value: unknown) => text(JSON.stringify(value)) + '::jsonb'
function query(label: string, sql: string) {
 const file = join(dir,label + '.sql')
 writeFileSync(file,sql,{mode:0o600})
 try {
  const result = execFileSync(process.execPath,[cli,'db','query','--linked','--file',file,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:25000000})
  writeFileSync(join(dir,label + '.json'),result,{mode:0o600})
  return JSON.parse(result).rows
 } catch (error) {
  writeFileSync(join(dir,label + '.error.log'),String((error as {stderr?: string}).stderr || error),{mode:0o600})
  throw Error('Week 1 backfill stopped at ' + label + '. See its private diagnostic.')
 }
}

const courses = query('inventory', `
WITH loads AS (
 SELECT DISTINCT l.data->>'InstructorID' owner, edupulse_private.dean_code_key(l.data->>'CourseCode') code, l.data->>'Block' block
 FROM public.edupulse_institutional_records l
 WHERE l.kind='loads' AND coalesce(nullif(l.data->>'AcademicYear',''),'2026-2027')='2026-2027'
   AND coalesce(l.data->>'Semester','') !~* '^(2|second|summer)'
   AND coalesce(l.data->>'Status','') !~* '^(inactive|suspended|withdrawn|deleted)$'
)
SELECT distinct on (l.owner,l.code) l.owner,l.code, c.id, c.syllabus_id, w.revision,
  EXISTS (SELECT 1 FROM loads b WHERE b.owner=l.owner AND b.code=l.code AND edupulse_private.course_has_current_load(c.id,b.block)) has_current_block,
  coalesce((SELECT jsonb_object_agg(p.workspace_item_id,w.data->'content'->p.workspace_item_id)
   FROM public.edupulse_publications p WHERE p.course_id=c.id AND p.week=1 AND p.active),'{}') items
FROM loads l
LEFT JOIN auth.users u ON u.id::text=l.owner AND u.raw_app_meta_data->>'role'='instructor' AND (u.banned_until IS NULL OR u.banned_until<now())
LEFT JOIN public.edupulse_courses c ON c.instructor_id=u.id AND c.active AND c.academic_year='2026-2027'
  AND edupulse_private.canonical_semester(c.semester)='1st Semester' AND edupulse_private.dean_code_key(c.course_code)=l.code
LEFT JOIN public.edupulse_workspaces w ON w.owner_id=c.instructor_id
ORDER BY l.owner,l.code,has_current_block DESC,c.id
`) as {
 owner: string; code: string; id: string | null; syllabus_id: string; revision: number; has_current_block: boolean;
 items: Record<string,{type: string; position?: number; provenance?: {populationVersion?: string}; content: {
  title: string; courseTopicId?: string; overallAssessment?: boolean; submissionOnly?: boolean;
  sections?: {heading: string; body: string}[]; questions?: {type?: string; responseFormat?: string; topic?: string}[]
 }}>
}[]

const pending = new Map<string, {revision: number; entries: Record<string, ReturnType<typeof weekOneAssessments>[number]['item']>; courseIds: Set<string>}>()
const unsupported: string[] = []
for (const course of courses) {
 if (!course.id || !course.has_current_block) { unsupported.push(course.code); continue }
 const items = Object.entries(course.items)
 const sources = items.filter(([, item]) => item && item.type !== 'assessment' && !item.content.submissionOnly &&
  item.provenance?.populationVersion === populationVersion && item.content.sections?.some(section=>section.heading==='Core idea'))
 if (!sources.length) { unsupported.push(course.code); continue }
 const group = pending.get(course.owner) || {revision:course.revision,entries:{},courseIds:new Set<string>()}
 for (const [sourceId, source] of sources) {
  const topicId = source.content.courseTopicId
  if (!topicId) throw Error('A seeded Week 1 reading is missing its topic.')
  const related = items.map(([,item])=>item).filter(item=>item?.content.courseTopicId === topicId)
  const topic = related.flatMap(item=>item.content.questions || []).find(question=>question.topic)?.topic
    || source.content.title.split(':')[0]!
  const present = new Set(related.filter(item=>item.type==='assessment').flatMap(item=>{
   const formats = new Set(item.content.questions?.map(question=>question.responseFormat || question.type || 'multiple_choice'))
   return formats.size===1 ? [...formats] : []
  }))
  const order = Math.max(0,...related.filter(item=>!item.content.overallAssessment).map(item=>item.position || 0))
  for (const {id,format,item} of weekOneAssessments(course.syllabus_id,topicId,topic,sourceId,source.content.sections!,order,new Date().toISOString())) {
   if (present.has(format) || group.entries[id]) continue
   if (course.items[id]) throw Error('A projected ID already exists with another format.')
   group.entries[id] = item
   group.courseIds.add(course.id)
  }
 }
 pending.set(course.owner,group)
}
if (unsupported.length) throw Error('Loaded courses missing a verified seeded Week 1 reading: ' + unsupported.join(', '))
const batches = [...pending].filter(([,group])=>Object.keys(group.entries).length)
console.log(JSON.stringify({loadedCourses:courses.length,instructors:pending.size,coursesToUpdate:batches.reduce((sum,[,group])=>sum+group.courseIds.size,0),
 assessments:batches.reduce((sum,[,group])=>sum+Object.keys(group.entries).length,0),mode:args[0] || 'plan'}))
if (args[0]) for (const [index,[owner,group]] of batches.entries()) {
 const checked = group.entries
 const published = Object.fromEntries(Object.entries(checked).map(([id,item])=>[id,{...item,status:'published'}]))
 workspaceData.parse({syllabi:[],content:checked,registrations:[]})
 const ids = Object.keys(checked)
 const body = `
DECLARE prior public.edupulse_workspaces; revision_next bigint;
BEGIN
 SELECT * INTO STRICT prior FROM public.edupulse_workspaces WHERE owner_id=auth.uid() FOR UPDATE;
 IF prior.revision <> ${group.revision} THEN RAISE EXCEPTION 'Workspace changed since plan'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(${json(checked)}) added WHERE prior.data->'content' ? added)
 THEN RAISE EXCEPTION 'Existing assessment ID; keep its current workspace record'; END IF;
 SELECT s.revision INTO STRICT revision_next FROM public.edupulse_save_workspace(prior.revision,
  jsonb_set(prior.data,'{content}',prior.data->'content'||${json(checked)})) s;
 PERFORM 1 FROM public.edupulse_save_workspace(revision_next,
  jsonb_set(prior.data,'{content}',prior.data->'content'||${json(published)}));
END;`
 const assertions = `
BEGIN
 IF (SELECT count(*) FROM public.edupulse_publications p
     WHERE p.instructor_id=${text(owner)}::uuid AND p.workspace_item_id IN (SELECT jsonb_array_elements_text(${json(ids)}))
      AND p.week=1 AND p.type='assessment' AND p.active AND p.content->'questions' IS NOT NULL) <> ${ids.length}
 THEN RAISE EXCEPTION 'Published assessment count differs from plan'; END IF;
 IF EXISTS (SELECT 1 FROM public.edupulse_publications p
   LEFT JOIN edupulse_private.assessment_keys k ON k.publication_id=p.id AND k.source_version=p.source_version
   WHERE p.instructor_id=${text(owner)}::uuid AND p.workspace_item_id IN (SELECT jsonb_array_elements_text(${json(ids)}))
     AND (k.publication_id IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(p.content->'questions') q WHERE q ?| array['correctIndex','explanation'])
       OR EXISTS (SELECT 1 FROM public.edupulse_attempts a WHERE a.publication_id=p.id)))
 THEN RAISE EXCEPTION 'Invalid public questions, missing private key or unexpected attempts'; END IF;
END;`
 const identity = `BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',id,'email',email,'role','authenticated','app_metadata',raw_app_meta_data)::text,true)
 FROM auth.users WHERE id=${text(owner)}::uuid AND raw_app_meta_data->>'role'='instructor' AND (banned_until IS NULL OR banned_until<now());
 IF NOT FOUND THEN RAISE EXCEPTION 'Instructor account is unavailable'; END IF;
END;`
 query((args[0]==='--apply'?'apply':'rehearse')+'-'+index,`
BEGIN;
DO ${text(identity)};
SET LOCAL ROLE authenticated;
DO ${text(body)};
RESET ROLE;
DO ${text(assertions)};
${args[0]==='--apply'?'COMMIT':'ROLLBACK'};`)
 console.log(JSON.stringify({batch:index+1,batches:batches.length,courses:group.courseIds.size,assessments:ids.length}))
}
