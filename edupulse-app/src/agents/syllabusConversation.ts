import type {EditorSnapshot} from './editorTools.js'
import {isOutlineExam,weekSections,type OutlineWeek} from '../utils/outlineSections.js'

export type SyllabusTask={scope:string;record:string;course:string;at:number;section:string}
/** Editable content plus trusted course/record identity. No approval bytes, histories or permissions. */
export function syllabusEditorData(data:Record<string,unknown>){return Object.fromEntries(['id','courseCode','courseTitle','courseInfo','courseDescription','institutionalContext','programOutcomes','courseOutline','courseRequirements','gradingSystem','coursePolicy','books','onlineReferences'].filter(key=>data[key]!==undefined).map(key=>[key,data[key]]))}
const record=(editor:EditorSnapshot)=>String(editor.data.id||editor.instance)
const week=/\b(?:week|wk)\.?\s*(\d{1,2})\b/i
export const explicitOutlineTask=(message:string)=>week.test(message)||/\b(?:remaining|unfinished|missing|next)\s+(?:teaching\s+)?weeks?\b/i.test(message)
const shortContinuation=/^\s*(?:(?:can|could|would)\s+you\s+)?(?:(?:please|kindly)\s+)?(?:(?:provide|give|do|generate|complete|finish|fill|prepare)\s+(?:me\s+)?)?(?:(?:the|for)\s+)?(?:(?:week|wk)\.?\s*\d{1,2}|(?:next|remaining|unfinished|missing)\s+(?:teaching\s+)?weeks?)(?:\s+(?:then|next|please|only|too|as\s+well))*[.!?]?\s*$/i
export const isWeekContinuation=(message:string)=>shortContinuation.test(message)
const complete=(row:OutlineWeek)=>weekSections(row).every(section=>section.ilos.trim()&&section.contents.some(text=>text.trim())&&section.activities?.trim()&&section.assessments?.trim()&&section.assessmentTypes?.length)
export function unfinishedSyllabusWeeks(editor:EditorSnapshot){return (editor.data.courseOutline as OutlineWeek[]||[]).filter(row=>!isOutlineExam(row)&&!complete(row)).map(row=>row.week)}
export function syllabusTask(editor:EditorSnapshot,scope:string,section:string):SyllabusTask{return {scope,record:record(editor),course:String(editor.data.courseCode),section,at:Date.now()}}
/** Conversation state is an account/thread/record reference, never a saved model command. */
export function continueSyllabusTask(message:string,editor:EditorSnapshot|null,previous:SyllabusTask|null,scope:string){
 if(!editor||editor.kind!=='syllabus'||!shortContinuation.test(message))return null
 const explicit=/\b(?:provide|give|generate|complete|finish|fill|prepare)\b/i.test(message)
 const related=previous?.scope===scope&&previous.record===record(editor)&&previous.course===editor.data.courseCode&&previous.section==='courseOutline'&&Date.now()-previous.at<30*60_000
 if(!explicit&&!related)return null
 const number=message.match(week)?.[1]
 const next=unfinishedSyllabusWeeks(editor)[0]
 return number?`Complete the course outline for Week ${Number(number)} only.`:/\bnext\b/i.test(message)&&next?`Complete the course outline for Week ${next} only.`:'Complete the remaining unfinished course outline weeks. Preserve all completed weeks.'
}
export function editableSyllabusPath(id:string){return `/syllabus?tab=builder&edit=${encodeURIComponent(id)}`}
