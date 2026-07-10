/* ============================================================
   EduPulse — instructor-roster.js
   Instructor-scoped Students & Enrollment: for each subject the
   Dean assigned to this instructor, view its rostered students
   and add a roster (block section) or an individual student.
   Scoped strictly to this instructor's own subjects — full
   cross-subject administration (register accounts, any subject,
   any roster) stays Dean-only (assets/dean.js).
============================================================ */
function insStudents(){
  view().innerHTML=`
  <div class="note" style="margin-top:0">Rosters for the subjects the Dean assigned to you. Apply an existing block roster or add an individual student to any of your subjects — registering a brand-new roster/account for the whole college stays with the Dean.</div>
  ${myAssignments().map(x=>{const c=DB.curriculum.find(k=>k.code===x.code);
    const count=x.sections.reduce((a,sec)=>a+(sec==='INTL'?DB.intl.length:(DB.students[sec]||[]).length),0);
    return `
  <div class="card click subj-card" onclick="instSubjectRosterSheet('${x.code}')">
    <div class="sc-ic">🎓</div>
    <div style="flex:1"><b>${x.code} — ${c.title}</b><small>Sections: ${x.sections.join(', ')||'—'}</small></div>
    <div class="kpi" style="margin:0"><div class="k"><b>${count}</b><small>Rostered</small></div></div>
    <span class="chip c-mut">Open →</span>
  </div>`;}).join('')}`;
}
function instSubjectRosterSheet(code){
  const x=myAssignments().find(a=>a.code===code); const c=DB.curriculum.find(k=>k.code===code);
  openSheet('🎓', code+' — '+c.title, 'Rosters & individual students enrolled in your sections', `
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <button class="btn btn-p btn-s" onclick="instApplyRosterModal('${code}')">+ Apply a roster to this subject</button>
    <button class="btn btn-o btn-s" onclick="instEnrollModal('${code}')">+ Add individual student</button>
  </div>
  ${x.sections.length?x.sections.map(sec=>{
    const isIntl=sec==='INTL';
    const list=isIntl?DB.intl:(DB.students[sec]||[]);
    return `<div class="card" style="margin-bottom:14px"><h3>${isIntl?'🌐':'🧑‍🤝‍🧑'} ${sec}${isIntl?' — International / Irregular':' — Block Section'} <span class="chip c-teal">${list.length} student(s)</span></h3>
     ${list.map(st=>`<div class="sec-item click" onclick="instStuPop('${st.id}','${(st.name||'').replace(/'/g,"\\'")}',event)">
       <div class="tic" style="background:var(--pri-l)">🎓</div>
       <div><b>${st.name}</b><small>${st.id} · ${isIntl?st.tag:sec}</small></div>
       <div class="acts"><span class="chip c-mut">View ▾</span></div></div>`).join('')||'<div class="lock-note">No students rostered in this section yet.</div>'}
    </div>`;}).join(''):'<div class="lock-note">No sections applied yet — use “+ Apply a roster” above.</div>'}
  `);
}
function instApplyRosterModal(code){
  const x=myAssignments().find(a=>a.code===code);
  const available=ROSTER_CHOICES.filter(r=>!x.sections.includes(r.code));
  openModal(`<h3>Apply a roster to ${code}</h3><div class="frm">
  ${available.length?`
  <div><label>Roster / section</label><select id="irRoster" style="width:100%">${available.map(r=>`<option value="${r.code}">${r.label} · ${r.kind}</option>`).join('')}</select></div>
  <div class="note"><b>One action, whole roster:</b> every student already in the chosen roster is enrolled to ${code}, and the section is added to your assigned sections for this subject.</div>`
  :'<div class="lock-note">Every available roster is already applied to this subject.</div>'}
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
  ${available.length?`<button class="btn btn-p" onclick="saveApplyRoster('${code}')">Apply roster</button>`:''}</div></div>`);
}
function saveApplyRoster(code){
  const sec=$('irRoster').value;
  const x=myAssignments().find(a=>a.code===code);
  if(!x.sections.includes(sec)) x.sections.push(sec);
  const c=DB.curriculum.find(k=>k.code===code);
  if(c && !c.sections.includes(sec)) c.sections.push(sec);
  saveDB();
  closeModal(); instSubjectRosterSheet(code);
  toast('Roster applied to '+code+' — students now enrolled.');
}
/* Directory of every existing student in the system (all block-section
   rosters + INTL), each tagged with where they currently sit. Adding a
   student to a subject always picks from this list — never fabricates one. */
function allExistingStudents(){
  const list=[];
  Object.entries(DB.students).forEach(([sec,arr])=>arr.forEach(st=>list.push({...st, homeSection:sec})));
  DB.intl.forEach(st=>list.push({...st, homeSection:'INTL'}));
  return list;
}
function instEnrollModal(code){
  const x=myAssignments().find(a=>a.code===code);
  const alreadyIds=new Set();
  x.sections.forEach(sec=>(sec==='INTL'?DB.intl:(DB.students[sec]||[])).forEach(st=>alreadyIds.add(st.id)));
  const candidates=allExistingStudents().filter(st=>!alreadyIds.has(st.id));
  openModal(`<h3>Add individual student — ${code}</h3><div class="frm">
   ${candidates.length?`
   <div><label>Student (existing)</label><select id="ieStudent" style="width:100%">${candidates.map(st=>`<option value="${st.id}">${st.id} — ${st.name} (currently ${st.homeSection})</option>`).join('')}</select></div>
   <div><label>Section to enroll them in for ${code}</label><select id="ieSec" style="width:100%">${x.sections.length?x.sections.map(s=>`<option>${s}</option>`).join(''):'<option value="INTL">INTL</option>'}</select></div>
   <div class="note"><b>Automatic checks:</b> prerequisite completion · one-section-per-subject rule · section capacity.</div>`
   :'<div class="lock-note">Every existing student is already enrolled in this subject.</div>'}
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
   ${candidates.length?`<button class="btn btn-p" onclick="saveInstEnroll('${code}')">Enroll</button>`:''}</div></div>`);
}
function saveInstEnroll(code){
  const id=$('ieStudent').value, sec=$('ieSec').value;
  const student=allExistingStudents().find(st=>st.id===id);
  if(!student){ toast('Select a student.'); return; }
  if(sec==='INTL'){
    if(!DB.intl.some(s=>s.id===id)) DB.intl.push({id:student.id, name:student.name, tag:student.tag||'Irregular', subs:[[code,'INTL schedule']]});
  } else {
    DB.students[sec]=DB.students[sec]||[];
    if(!DB.students[sec].some(s=>s.id===id)) DB.students[sec].push({id:student.id,name:student.name,pcs:[0,0],pex:[0],cs:[0,0,0,0],ex:[0],fcs:[0,0],fex:[0]});
  }
  saveDB();
  closeModal(); instSubjectRosterSheet(code);
  toast(student.name+' enrolled to '+code+' ('+sec+').');
}
function instStuPop(id,name,evt){
  openPop(`<h4>${name} <span class="chip c-mut">${id}</span></h4>
  <div class="kv"><b>Standing</b>Enrolled in your section</div>
  <div class="pop-acts">
    <button class="btn btn-o btn-s" onclick="closePop();toast('Read-only academic record opened (prototype).')">View record</button>
  </div>`,evt,320);
}
