/** Owner-authorized demonstration only: one currently enrolled approved course per learner.
 * No later-week actions; remaining courses stay available for manual attempts. */
export function studentDemonstrationCohort<T extends {course:string;student:string}>(members:T[]):T[]{
 const learners=[...new Set(members.map(m=>m.student))].sort(),counts=new Map<string,number>()
 return learners.map(student=>{const choices=members.filter(m=>m.student===student).sort((a,b)=>(counts.get(a.course)||0)-(counts.get(b.course)||0)||a.course.localeCompare(b.course)),selected=choices[0];counts.set(selected.course,(counts.get(selected.course)||0)+1);return selected})
}
