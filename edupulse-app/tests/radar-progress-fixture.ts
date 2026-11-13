import type {Page} from '@playwright/test'
import {restorationUI} from './role-restoration-fixture'
// Fictional transport models independent student submissions (is_test:false); no hosted record is changed.
// Synthetic presentation of three distinct quizzes. Hosted scoring is verified separately.
export async function radarProgressUI(page:Page,scored=3){
 const fixture=await restorationUI(page),data=fixture.records
 const course=data.courses[0];course.course_code='IT 103';course.course_title='Quantitative Methods'
 const publications=data.publications.filter(p=>p.type==='assessment')
 const titles=['Correlation and Scatterplot Interpretation','Pearson Coefficient: Calculation and Limits','Spearman Ranks: Computation and Interpretation']
 publications.forEach((p,i)=>{p.title=titles[i];p.week=12})
 data.publications=publications
 const first=data.enrollments[0]
 data.enrollments=Array.from({length:3},(_,i)=>({...first,student_email:`learner${i+1}@example.invalid`,display_name:`Synthetic learner ${i+1}`,student_ref:`SYN-${i+1}`,block_section:'BSIT-1A'}))
 const points=[[4,3,2],[4,4,3],[3,2,2]],sample=data.attempts[0]
 data.attempts=publications.slice(0,scored).flatMap((p,i)=>data.enrollments.map((s,n)=>({...sample,id:`synthetic-${i}-${n}`,publication_id:p.id,student_id:`synthetic-learner-${n}`,student_email:s.student_email,source_version:p.source_version,score:points[i][n],max_score:4,submitted_at:`2026-11-11T0${i+1}:0${n}:00Z`,is_test:false})))
 data.accesses=[]
 return fixture
}
