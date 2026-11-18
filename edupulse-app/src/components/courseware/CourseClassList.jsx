import {useState} from 'react'
import {useWorkspace,useWorkspaceViewState} from '../../context/WorkspaceContext'
import {useAcademicRecords} from '../../context/AcademicContext'
import BlockSectionUploader from '../syllabus/BlockSectionUploader'
import StudentDirectoryPicker from '../syllabus/StudentDirectoryPicker'
import PageModal from '../ui/PageModal'

/** Files can be read immediately; only confirmation writes an assigned class. */
export default function CourseClassList({course,block,onClose,onSaved}){
 const workspace=useWorkspace(),records=useAcademicRecords()
 const [tab,setTab]=useWorkspaceViewState(`course:${course.id}:class-list-tab`,'upload')
 const [error,setError]=useState('')
 const register=async(input,mode)=>{
  setError('')
  if(workspace.loading||workspace.saving||workspace.dirty)throw new Error('Save or resolve the current workspace before confirming this class list.')
  if(!course.assignmentKey)throw new Error('This course assignment is no longer available. Reopen Course.')
  try{
   const result=await records.command({operation:'class-list',assignment:course.assignmentKey,revision:workspace.revision,block:input.blockSection,filename:input.fileName,mode,students:input.students.map(student=>({StudentID:student.StudentID||undefined,Email:student.Email||undefined}))})
   await workspace.refresh();onSaved(`${input.blockSection}: ${result.students} registered students saved.`)
  }catch(failure){setError(failure.message);throw failure}
 }
 const scope={course:course.code,title:course.title,...(block?{block}:{})}
 return <PageModal title={block?`${block} class list`:'Add block section'} subtitle={`${course.code} — ${course.title} · ${course.semester} · AY ${course.academicYear}`} label="Course class list" onClose={onClose}>
  <nav className="tabs mb-24" aria-label="Class-list entry">{[['upload','Upload class list'],['directory','Choose individual students']].map(([key,label])=><button className={`tab ${tab===key?'active':''}`} key={key} onClick={()=>setTab(key)} aria-pressed={tab===key}>{label}</button>)}</nav>
  <p className="text-sm text-muted mb-16">The class year comes from its registered students. Students from other blocks or departments can be selected individually. Their home records stay unchanged.</p>
  {error&&<p role="alert" className="connected-pulse-warning">{error}</p>}
  {tab==='upload'?<BlockSectionUploader scope={scope} onRegister={input=>register(input,'replace')} onCancel={onClose}/>:<StudentDirectoryPicker scope={scope} onRegister={input=>register(input,'append')}/>}
 </PageModal>
}
