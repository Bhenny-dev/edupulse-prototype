import { parsedToFormState, type ParsedSyllabus } from './syllabusParser.js'
import { meaningfulOutline, type RetainedSyllabusFile } from './syllabusFiles.js'

/** Shared by the upload review and authorized intake tooling; does not save or attest approval. */
export function approvedSyllabusCandidate(parsed:ParsedSyllabus,approvedFile:RetainedSyllabusFile,id:string=crypto.randomUUID(),now=new Date().toISOString()) {
  const source=parsed.sections[0].parsed
  const courseCode=source.courseCode?.trim()||parsed.courseMatch?.code||''
  const courseTitle=source.courseTitle?.trim()||parsed.courseMatch?.title||''
  if(!courseCode||!courseTitle)throw new Error('The file needs a readable Course Code and Course Title. Check the document and upload it again.')
  const form=parsedToFormState(parsed),outline=form.courseOutline
  if(!meaningfulOutline(outline))throw new Error('No usable weekly learning outcomes and contents were found. Check the outline table in the approved file and upload it again.')
  if(outline.length>52||outline.some(row=>!Number.isInteger(row.week)||row.week<1||row.week>52)||new Set(outline.map(row=>row.week)).size!==outline.length)throw new Error('The outline needs distinct week numbers from 1 to 52. Check the document and upload it again.')
  return {...form,id,institutionalContext:form.institutionalContext||{kcp:{vision:'',mission:'',objectives:[],coreValues:[]},cit:{mission:'',objectives:[]}},courseCode,courseTitle,courseInfo:{...(form.courseInfo as Record<string,unknown>),courseCode,courseTitle},courseOutline:outline,approvedFile,extractedAt:now,version:1,sample:false}
}
