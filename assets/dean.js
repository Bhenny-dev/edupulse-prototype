/* ============================================================
   EduPulse — dean.js
   Dean role: Dashboard, Academic Settings, Curriculum, Instructor
   Assignment, Students & Enrollment.
   Syllabi need no Dean approval — just view/edit, via Curriculum's
   "Open syllabus (Dean edit)", which reuses topic-system.js's
   openSyllabusSheet(...,true).
============================================================ */
/* Dashboard = an at-a-glance overview of what the Dean manages — faculty,
   students/sections, and courses (with real syllabus-built status, not a
   Draft/Submitted/Approved workflow that doesn't exist for syllabi). */
function deanDash(){
  const totalStudents=Object.values(DB.students).reduce((n,arr)=>n+arr.length,0);
  const withSyllabus=DB.curriculum.filter(c=>DB.syllabi[c.code]).length;
  view().innerHTML=`
  <div class="grid g4">
    <div class="card stat"><div class="num">${DB.curriculum.length}</div><div class="lbl">Curriculum subjects (BSIT)</div></div>
    <div class="card stat"><div class="num">${DB.instructors.length}</div><div class="lbl">Faculty on roster</div></div>
    <div class="card stat"><div class="num">${withSyllabus} / ${DB.curriculum.length}</div><div class="lbl">Subjects with a syllabus built</div></div>
    <div class="card stat"><div class="num">${totalStudents}</div><div class="lbl">Enrolled students</div></div>
  </div>
  <div class="grid g3" style="margin-top:18px">
    <div class="card"><h3>👨‍🏫 Faculty</h3>
      ${DB.instructors.map(f=>{const subs=DB.curriculum.filter(c=>c.instructor===f.name);
        return `<div class="sec-item click" onclick="facultySheet('${f.name.replace(/'/g,"\\'")}')">
        <div class="tic" style="background:var(--pri-l)">👨‍🏫</div>
        <div><b>${f.name}</b><small>${f.title} · ${subs.length} subject${subs.length===1?'':'s'}</small></div></div>`;}).join('')}
      <button class="btn btn-o btn-s" style="margin-top:6px" onclick="location.href='assign.html'">Manage assignments →</button>
    </div>
    <div class="card"><h3>🧑‍🤝‍🧑 Students & Sections</h3>
      ${CIT_SECTIONS.map(yr=>{const secs=yr.secs.map(s=>s[0]); const total=secs.reduce((n,sec)=>n+(DB.students[sec]||[]).length,0);
        return `<div class="sec-item click" onclick="location.href='students.html'">
        <div class="tic" style="background:var(--ok-l)">🎓</div>
        <div><b>${yr.year}</b><small>${secs.length} sections · ${total} students</small></div></div>`;}).join('')}
      <button class="btn btn-o btn-s" style="margin-top:6px" onclick="location.href='students.html'">Manage enrollment →</button>
    </div>
    <div class="card"><h3>📚 Courses & Syllabus</h3>
      ${CIT_SECTIONS.map(yr=>{const subs=DB.curriculum.filter(c=>c.year===yr.year); const built=subs.filter(c=>DB.syllabi[c.code]).length;
        return `<div class="sec-item click" onclick="location.href='curriculum.html'">
        <div class="tic" style="background:var(--pri-l)">📘</div>
        <div><b>${yr.year}</b><small>${subs.length} subjects · ${built} with a syllabus built</small></div></div>`;}).join('')}
      <button class="btn btn-o btn-s" style="margin-top:6px" onclick="location.href='curriculum.html'">Manage curriculum →</button>
    </div>
  </div>
  <div class="card" style="margin-top:18px"><h3>College attention points <span class="ai-badge">SCORE-BASED</span></h3>
    <div class="note-warn note">IT-NET31 · BSIT 3A — “Subnetting” is the lowest-mastery topic this term. Instructor prompted to post a recap or re-quiz.</div>
    <div class="note">IT-GAME-EL42 (4th Yr elective) has no assigned instructor.</div>
    <div class="note">1 student (BSIT 3A) missed the Finals practical (PE2) in IT-NET31.</div>
  </div>`;
}
/* Academic Settings = only what the paper (1.2 Project Context) assigns the
   Dean here: "configures the college-wide grading term scheme (Midterm and
   Finals)" — a term-scheme form and a preview of what it controls. Scoring-
   sheet mechanics (Hi/Lo/Avg, Completed/Missed, the no-term-grade-
   computation disclaimer) are the Instructor's own Score Visualization
   feature (1.4) and are explained there, not duplicated on this settings
   page — this page is scoped to the one setting the Dean actually owns. */
function deanSettings(){
  view().innerHTML=`
  <div class="card"><h3>Academic term setup <span class="chip c-mut">Midterm · Finals — labels only</span></h3>
    <div class="frm">
      <div class="row"><div><label>Academic year</label><input value="${DB.config.ay}" style="width:100%"></div>
      <div><label>Semester</label><select style="width:100%"><option${DB.config.sem==='1st Semester'?' selected':''}>1st Semester</option><option>2nd Semester</option></select></div></div>
      <div class="row"><div><label>Total weeks</label><input type="number" value="${DB.config.weeks}" style="width:100%"></div>
      <div><label>Midterm exam week</label><input type="number" value="${DB.config.midWk}" style="width:100%"></div></div>
      <div><label>Final exam week</label><input type="number" value="${DB.config.finWk}" style="width:100%"></div>
      <div class="lock-note">Sets the college-wide term scheme only — grouping and labels for the syllabus and the scoring sheet. No term-grade (MG/TFG/FG) computation; that stays a future integration with the official KCP grading sheet.</div>
      <button class="btn btn-p" onclick="toast('Academic settings saved — applied to all roles.')">Save settings</button>
    </div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Effect preview</h3>
    <table class="tb"><tr><th>Where</th><th>What everyone now sees</th></tr>
    <tr><td>Instructor · Score Visualization</td><td>Activity columns grouped by term (${schemeLabel()})</td></tr>
    <tr><td>Instructor · Syllabus</td><td>Exam rows per term: ${schemeTerms().map(t=>t+' Exam').join(' · ')} (official KCP syllabus format)</td></tr>
    <tr><td>Student · My Scores</td><td>Activity records grouped under the same term labels — own row only</td></tr></table>
  </div>`;
}
function deanCurr(){
  view().innerHTML=`
  <div class="card">
    <h3>BSIT Curriculum <button class="btn btn-p btn-s" onclick="currModal()">+ Add subject</button></h3>
    <table class="tb"><tr><th>Code</th><th>Title</th><th>Year/Sem</th><th>Units</th><th>Prerequisites</th><th>Class.</th><th></th></tr>
    ${DB.curriculum.map((c,i)=>`<tr><td><b>${c.code}</b></td><td>${c.title}</td><td>${c.year} · ${c.sem}</td><td>${c.units}</td>
      <td>${c.prereq.length?c.prereq.map(p=>chip(p,'c-teal')).join(' '):chip('None','c-mut')}</td><td>${c.cls}</td>
      <td><button class="btn btn-o btn-s" onclick="event.stopPropagation();currPop(${i})">Manage ▾</button></td></tr>`).join('')}
    </table>
    <div class="note" style="margin-top:12px"><b>Prerequisite rule:</b> enrollment and assignment are gated by prerequisites.</div>
  </div>`;
}
function currPop(i){
  const c=DB.curriculum[i];
  openPop(`<h4>${c.code} ${sylChip(c.code)}</h4>
  <div class="kv"><b>Title</b>${c.title}</div>
  <div class="kv"><b>Prerequisites</b>${c.prereq.join(', ')||'None'}</div>
  <div class="kv"><b>Instructor / sections</b>${c.instructor} · ${c.sections.join(', ')||'—'}</div>
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();currModal(${i})">✎ Edit subject</button>
    <button class="btn btn-o btn-s" onclick="closePop();assignModal('${c.code}')">Assign instructor</button>
    ${DB.syllabi[c.code]?`<button class="btn btn-o btn-s" onclick="closePop();openSyllabusSheet('${c.code}',true)">Open syllabus (Dean edit)</button>`:''}
    <button class="btn btn-d btn-s" onclick="closePop();archiveSubjectModal('${c.code}')">Archive</button>
  </div>`,null,380);
}
function currModal(i){
  const c = i!==undefined?DB.curriculum[i]:{code:'',title:'',units:3,hours:54,year:'1st Yr',sem:'1st Sem',prereq:[],cls:'Major',desc:'',specs:[],refs:[]};
  openModal(`<h3>${i!==undefined?'Edit':'Add'} curriculum subject</h3>
  <div class="frm">
    <div class="item-grp-h">Subject details</div>
    <div class="row"><div><label>Subject code${i!==undefined?' <span class="chip c-mut">fixed once created</span>':''}</label><input id="cmCode" value="${c.code}" style="width:100%"${i!==undefined?' disabled':''}></div>
    <div><label>Classification</label><select id="cmCls" style="width:100%"><option${c.cls==='Major'?' selected':''}>Major</option><option${c.cls==='Minor'?' selected':''}>Minor</option></select></div></div>
    <div><label>Title</label><input id="cmTitle" value="${c.title}" style="width:100%"></div>
    <div class="row"><div><label>Units</label><input id="cmUnits" type="number" value="${c.units}" style="width:100%"></div><div><label>Hours</label><input id="cmHours" type="number" value="${c.hours}" style="width:100%"></div></div>
    <div class="row"><div><label>Year level</label><select id="cmYear" style="width:100%">${['1st Yr','2nd Yr','3rd Yr','4th Yr'].map(y=>`<option${c.year===y?' selected':''}>${y}</option>`).join('')}</select></div>
    <div><label>Semester</label><select id="cmSem" style="width:100%">${['1st Sem','2nd Sem'].map(s=>`<option${c.sem===s?' selected':''}>${s}</option>`).join('')}</select></div></div>
    <div><label>Prerequisite subjects (Dean-controlled gate)</label>
      <select id="cmPrereq" multiple style="width:100%;height:88px">${DB.curriculum.filter(x=>x.code!==c.code).map(x=>`<option value="${x.code}"${c.prereq.includes(x.code)?' selected':''}>${x.code} — ${x.title}</option>`).join('')}</select></div>

    <div class="item-grp-h">Course info <span class="chip c-mut">shown to students &amp; instructors</span></div>
    <div><label>Course description</label><textarea id="cmDesc" rows="3" style="width:100%" placeholder="Not yet documented for this subject.">${c.desc||''}</textarea></div>
    <div><label>Specifications <span class="chip c-mut">one per line</span></label><textarea id="cmSpecs" rows="3" style="width:100%" placeholder="One specification per line…">${(c.specs||[]).join('\n')}</textarea></div>
    <div><label>References <span class="chip c-mut">one per line</span></label><textarea id="cmRefs" rows="3" style="width:100%" placeholder="One reference per line…">${(c.refs||[]).join('\n')}</textarea></div>
    <div class="kv"><b>Grading formula <span class="chip c-mut">official KCP syllabus · college-wide · not computed in EduPulse</span></b><span style="white-space:pre-line">${DB.policy.grading}</span></div>
    <div class="kv"><b>Course policy <span class="chip c-mut">college-wide · set once for all subjects</span></b><ul style="margin:4px 0 0 16px;padding:0">${DB.policy.rules.map(r=>`<li style="margin-bottom:3px">${r}</li>`).join('')}</ul></div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveCurrModal(${i})">Save (versioned)</button></div>
  </div>`);
}
function saveCurrModal(i){
  const code=$('cmCode').value.trim();
  if(!code){ toast('Subject code is required.'); return; }
  const specs=$('cmSpecs').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const refs=$('cmRefs').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const fields={
    code, title:$('cmTitle').value.trim(),
    units:Math.max(0,parseInt($('cmUnits').value,10)||0), hours:Math.max(0,parseInt($('cmHours').value,10)||0),
    year:$('cmYear').value, sem:$('cmSem').value, cls:$('cmCls').value,
    prereq:[...$('cmPrereq').selectedOptions].map(o=>o.value),
    desc:$('cmDesc').value.trim(), specs, refs
  };
  if(i!==undefined) Object.assign(DB.curriculum[i],fields);
  else DB.curriculum.push({...fields, instructor:'— unassigned —', sections:[]});
  saveDB(); closeModal(); deanCurr();
  toast('Curriculum saved (versioned).');
}
/* Faculty-roster-rooted Instructor Assignment: tap a faculty member to see
   their current subject load and assign them a new subject. A subject's
   "Assign instructor" (from Curriculum) reassigns the other way round —
   both flows share the same real mutation, applyInstructorAssignment(). */
function deanAssign(){
  const unassigned=DB.curriculum.filter(c=>c.instructor==='— unassigned —');
  view().innerHTML=`
  <div class="note" style="margin-top:0">Faculty roster — tap an instructor to see their current subject load and assign them a new subject. Instructors may carry more than one subject.</div>
  <div class="grid g3">
  ${DB.instructors.map(f=>{
    const subs=DB.curriculum.filter(c=>c.instructor===f.name);
    return `<div class="card click" onclick="facultySheet('${f.name.replace(/'/g,"\\'")}')">
      <h3>👨‍🏫 ${f.name}</h3>
      <div class="lock-note" style="margin-bottom:8px">${f.title} · ${f.dept}</div>
      <div class="kpi" style="margin:0"><div class="k"><b>${subs.length}</b><small>Subject${subs.length===1?'':'s'}</small></div></div>
      <div class="lock-note" style="margin-top:8px">${subs.length?subs.map(c=>c.code).join(', '):'No subjects assigned yet'}</div>
    </div>`;}).join('')}
  </div>
  ${unassigned.length?`<div class="card" style="margin-top:18px"><h3>Unassigned subjects <span class="chip c-warn">${unassigned.length}</span></h3>
  ${unassigned.map(c=>`<div class="sec-item"><div class="tic" style="background:var(--warn-l)">⚠️</div>
    <div><b>${c.code} — ${c.title}</b><small>${c.year} · ${c.sem}</small></div>
    <div class="acts"><button class="btn btn-o btn-s" onclick="assignModal('${c.code}')">Assign…</button></div></div>`).join('')}
  </div>`:''}
  <div class="note" style="margin-top:18px"><b>Rules enforced:</b> instructors carry the subject load set by the Dean (sections filled by block rosters); a student joins only one section per subject.</div>`;
}
function facultySheet(name){
  const f=DB.instructors.find(x=>x.name===name);
  const subs=DB.curriculum.filter(c=>c.instructor===name);
  openSheet('👨‍🏫', name, `${f.title} · ${f.dept} · ${f.id} · ${f.email}`, `
  <div class="kv"><b>Subjects assigned (${subs.length})</b></div>
  ${subs.length?subs.map(c=>`<div class="sec-item">
    <div class="tic" style="background:var(--pri-l)">📘</div>
    <div><b>${c.code} — ${c.title}</b><small>${c.year} · ${c.sem} · sections: ${c.sections.join(', ')||'—'}</small></div>
    <div class="acts">${sylChip(c.code)}<button class="btn btn-o btn-s" onclick="closeSheet();assignModal('${c.code}')">Change…</button></div></div>`).join('')
   :'<div class="lock-note">No subjects assigned yet.</div>'}
  <button class="btn btn-p" style="margin-top:10px" onclick="assignNewToInstructorModal('${name.replace(/'/g,"\\'")}')">+ Assign a new subject to ${name}</button>
  `);
}
function assignNewToInstructorModal(name){
  openModal(`<h3>Assign a subject to ${name}</h3><div class="frm">
    <div><label>Subject</label><select id="anSubject" style="width:100%">${DB.curriculum.map(c=>`<option value="${c.code}">${c.code} — ${c.title} (currently: ${c.instructor})</option>`).join('')}</select></div>
    <div><label>Sections / roster</label>
    <select id="anSections" multiple style="width:100%;height:118px">${ROSTER_CHOICES.map(r=>`<option value="${r.code}">${r.label} · ${r.kind}</option>`).join('')}</select></div>
    <div class="note">Instructors may carry more than one subject. Assigning a subject already taught by someone else moves it off that instructor's load.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
    <button class="btn btn-p" onclick="saveAssignToInstructor('${name.replace(/'/g,"\\'")}')">Save assignment</button></div>
  </div>`);
}
function saveAssignToInstructor(name){
  const code=$('anSubject').value;
  const sections=[...$('anSections').selectedOptions].map(o=>o.value);
  applyInstructorAssignment(code,name,sections);
  closeModal(); facultySheet(name);
  toast(code+' assigned to '+name+'.');
}
/* Shared mutation used by both assignment flows above: sets the subject's
   instructor + sections, and keeps the hardcoded logged-in instructor's
   (ME, in core.js) session-scoped DB.assignments list in sync so Instructor
   pages immediately reflect the change. */
function applyInstructorAssignment(code,instructorName,sections){
  const c=DB.curriculum.find(x=>x.code===code);
  const oldInstructor=c.instructor;
  c.instructor=instructorName; c.sections=sections;
  if(oldInstructor===ME && instructorName!==ME){
    DB.assignments[ME]=(DB.assignments[ME]||[]).filter(a=>a.code!==code);
  }
  if(instructorName===ME){
    const list=DB.assignments[ME]=DB.assignments[ME]||[];
    const existing=list.find(a=>a.code===code);
    if(existing) existing.sections=sections; else list.push({code,sections});
  }
  saveDB();
}
function assignModal(code){
  const c=DB.curriculum.find(x=>x.code===code);
  openModal(`<h3>Assign instructor — ${c.code}</h3>
  <div class="frm">
    <div><label>Instructor (currently: ${c.instructor})</label>
    <select id="amInstructor" style="width:100%">${DB.instructors.map(f=>`<option${f.name===c.instructor?' selected':''} value="${f.name}">${f.name} — ${f.title}</option>`).join('')}</select></div>
    <div class="note">Instructors may carry more than one subject; reassigning moves this subject off its current instructor's load.</div>
    <div><label>Sections / roster</label>
    <select id="amSections" multiple style="width:100%;height:118px">${ROSTER_CHOICES.map(r=>`<option${c.sections.includes(r.code)?' selected':''} value="${r.code}">${r.label} · ${r.kind}</option>`).join('')}</select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="saveAssignModal('${code}')">Save assignment</button></div>
  </div>`);
}
function saveAssignModal(code){
  const name=$('amInstructor').value;
  const sections=[...$('amSections').selectedOptions].map(o=>o.value);
  applyInstructorAssignment(code,name,sections);
  closeModal();
  toast(code+' assigned to '+name+'.');
  setTimeout(()=>location.reload(),450);
}
function deanStudents(){
  view().innerHTML=`
  <div class="note" style="margin-top:0"><b>Roster-based sectioning:</b> students are rostered into <b>block sections</b> — enrolling the roster assigns every student in it to the section's subjects and instructors at once (not individually).</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px">
    <button class="btn btn-p btn-s" onclick="registerRosterModal()">Register roster / section</button>
    <button class="btn btn-o btn-s" onclick="registerAccountModal()">Register account</button>
  </div>
  ${CIT_SECTIONS.map(yr=>`
   <div class="item-grp-h">${yr.year} — batch ${yr.batch}</div>
   <div class="grid g3">
    ${yr.secs.map(([sec])=>`
    <div class="card click" onclick="rosterSheet('${sec}')">
      <h3>🧑‍🤝‍🧑 ${sec} — Block Section</h3>
      <div class="kpi" style="margin-top:0">
        <div class="k"><b>${(DB.students[sec]||[]).length}</b><small>Rostered</small></div>
        <div class="k"><b>${DB.curriculum.filter(c=>c.sections.includes(sec)).length}</b><small>Subjects</small></div>
      </div>
      <div class="lock-note">One roster → all subjects & instructors of ${sec}. Tap to manage.</div>
    </div>`).join('')}
   </div>`).join('')}
  <div class="card" style="margin-top:18px"><h3>Enrollment rules</h3>
   <table class="tb">
    <tr><td>Block roster enrollment</td><td>One action assigns the whole roster to a subject section and its instructor — never student-by-student.</td></tr>
    <tr><td>Always enforced</td><td>Curriculum prerequisites · one section per subject per student · section capacity.</td></tr>
   </table></div>`;
}
function rosterSheet(sec){
  const subjects=DB.curriculum.filter(c=>c.sections.includes(sec));
  openSheet('🧑‍🤝‍🧑', sec+' — Block Section Roster', 'One roster → all subjects & instructors of this section', `
  <div class="grid g2">
   <div class="card"><h3>Rostered students (${DB.students[sec].length}) <button class="btn btn-p btn-s" onclick="addToRosterModal('${sec}')">+ Add to roster</button></h3>
    ${DB.students[sec].map(st=>`<div class="sec-item click" onclick="stuPop('${st.id}','${st.name.replace(/'/g,"\\'")}','${sec}',event)">
      <div class="tic" style="background:var(--pri-l)">🎓</div>
      <div><b>${st.name}</b><small>${st.id} · rostered in ${sec}</small></div>
      <div class="acts"><span class="chip c-mut">Manage ▾</span></div></div>`).join('')}
   </div>
   <div class="card"><h3>Subjects auto-assigned via this roster</h3>
    ${subjects.map(c=>`<div class="sec-item">
      <div class="tic" style="background:var(--ok-l)">📘</div>
      <div><b>${c.code} — ${c.title}</b><small>${c.instructor} · whole roster enrolled as one action</small></div>
      <div class="acts">${chip('Roster-enrolled','c-ok')}</div></div>`).join('')}
    <button class="btn btn-p btn-s" onclick="applyRosterModal('${sec}')">Apply roster to another subject…</button>
    <div class="lock-note" style="margin-top:8px">Prerequisite and one-section-per-subject checks run for every rostered student before enrollment is applied.</div>
   </div>
  </div>`);
}
function applyRosterModal(sec){
  openModal(`<h3>Apply roster ${sec} to a subject</h3><div class="frm">
  <div><label>Subject</label><select style="width:100%">${DB.curriculum.map(c=>`<option>${c.code} — ${c.title} (${c.instructor})</option>`).join('')}</select></div>
  <div><label>Roster / section</label><select style="width:100%">${ROSTER_CHOICES.map(r=>`<option${r.code===sec?' selected':''}>${r.label} · ${r.kind}</option>`).join('')}</select></div>
   <div class="note"><b>One action, whole roster:</b> all ${DB.students[sec].length} rostered students are enrolled to this subject's ${sec} class and its instructor — prerequisite and duplicate-section checks run per student.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Roster applied — ${sec} enrolled as one batch.')">Apply roster</button></div></div>`);
}
function addToRosterModal(sec){
  openModal(`<h3>Add student to roster — ${sec}</h3><div class="frm">
  <div><label>Student</label><select style="width:100%">${Object.values(DB.students).flat().map(st=>`<option>${st.id} — ${st.name}</option>`).join('')}</select></div>
  <div><label>Roster / section</label><select style="width:100%">${ROSTER_CHOICES.map(r=>`<option${r.code===sec?' selected':''}>${r.label} · ${r.kind}</option>`).join('')}</select></div>
   <div class="note">Joining the roster enrolls the student into <b>all</b> subjects already assigned to ${sec} (checks run per subject).</div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Student added to ${sec} roster and enrolled to its subjects.')">Add & enroll</button></div></div>`);
}
function registerRosterModal(){
  openModal(`<h3>Register roster / section</h3><div class="frm">
  <div><label>Subject</label><select style="width:100%">${DB.curriculum.map(c=>`<option>${c.code} — ${c.title} (${c.instructor})</option>`).join('')}</select></div>
  <div><label>Roster / section</label><select style="width:100%">${ROSTER_CHOICES.map(r=>`<option>${r.label} · ${r.kind}</option>`).join('')}</select></div>
  <div class="note">Only the Dean can register a roster to a subject because the selection changes the schedule for every student in that roster.</div>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Roster/section registration saved and schedules updated.')">Save registration</button></div></div>`);
}
function registerAccountModal(){
  openModal(`<h3>Register account — Dean only</h3><div class="frm">
  <div><label>Account type</label><select style="width:100%"><option selected>Student account</option><option>Instructor account</option></select></div>
  <div><label>Roster / section</label><select style="width:100%">${ROSTER_CHOICES.map(r=>`<option>${r.label} · ${r.kind}</option>`).join('')}</select></div>
  <div><label>Target subject schedule</label><select style="width:100%">${DB.curriculum.map(c=>`<option>${c.code} — ${c.title}</option>`).join('')}</select></div>
  <div class="note-warn note">Account registration is restricted to the Dean / admin because roster placement affects timetables, subject loads, and student schedules.</div>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Account registered and schedule-linked.')">Register account</button></div></div>`);
}
function stuPop(id,name,sec,evt){
  openPop(`<h4>${name} <span class="chip c-mut">${id}</span></h4>
  <div class="kv"><b>Standing</b>Regular · ${sec} · ${DB.config.sem}</div>
  <div class="kv"><b>Alerts</b>No outstanding enrollment or prerequisite flags.</div>
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();enrollModal('${name}')">Enroll to subject…</button>
    <button class="btn btn-o btn-s" onclick="closePop();moveSectionModal()">Move section</button>
    <button class="btn btn-o btn-s" onclick="closePop();viewRecordPop('${id}','${name.replace(/'/g,"\\'")}','${sec}',event)">View record</button>
  </div>`,evt,360);
}
/* Read-only academic record — pulled from the SAME scoring-sheet data the
   instructor's Score Visualization computes (gradeRows/studentOverall/
   actMissed), not a fabricated summary, so Dean and Instructor always agree. */
function viewRecordPop(id,name,sec,evt){
  const subjects=DB.curriculum.filter(c=>c.sections.includes(sec));
  const acts=gradedActivities();
  const rows=subjects.map(c=>{
    const row=gradeRows(c.code,sec).find(s=>s.id===id);
    if(!row) return {code:c.code,title:c.title,recorded:false};
    const o=studentOverall(row);
    const missedCount=acts.filter(a=>actMissed(row,a)).length;
    return {code:c.code,title:c.title,recorded:true,o,missedCount,total:acts.length};
  });
  openPop(`<h4>${name} — Academic record <span class="chip c-mut">${id}</span></h4>
  <div class="kv"><b>Standing</b>Regular · ${sec} · ${DB.config.sem}</div>
  <div class="kv"><b>Scoring-sheet record, per subject <span class="chip c-mut">read-only · same as Instructor's sheet</span></b></div>
  ${rows.length?rows.map(r=>`<div class="sec-item" style="margin-bottom:8px">
    <div class="tic" style="background:${r.recorded?(r.o.pct<75?'var(--warn-l)':'var(--ok-l)'):'rgba(23,26,63,.06)'}">${r.recorded?(r.o.pct<75?'⚠️':'✅'):'—'}</div>
    <div><b>${r.code} — ${r.title}</b><small>${r.recorded?`${r.o.tot}/${r.o.max} (${r.o.pct.toFixed(1)}%) · ${r.total-r.missedCount}/${r.total} activities completed`:'No recorded activities yet'}</small></div>
  </div>`).join(''):'<div class="lock-note">No subjects roster-enrolled for this section.</div>'}
  <div class="pop-acts"><button class="btn btn-o btn-s" onclick="closePop()">Close</button></div>
  `,evt,400);
}
function enrollModal(name){
  openModal(`<h3>Enroll student</h3><div class="frm">
   <div><label>Student</label><input value="${name||''}" placeholder="Search student ID / name" style="width:100%"></div>
   <div><label>Subject</label><select style="width:100%">${DB.curriculum.map(c=>`<option>${c.code} — ${c.title}</option>`).join('')}</select></div>
  <div><label>Section</label><select style="width:100%">${ROSTER_CHOICES.map(r=>`<option>${r.label} · ${r.kind}</option>`).join('')}</select></div>
   <div class="note"><b>Automatic checks:</b> prerequisite completion · one-section-per-subject rule · section capacity.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Enrollment saved — checks passed.')">Enroll</button></div></div>`);
}
function archiveSubjectModal(code){
  openModal(`<h3>Archive subject — ${code}?</h3>
  <p style="font-size:13.5px;margin-bottom:12px">Archiving removes ${code} from active offerings; history, syllabi, and records are retained.</p>
  <div style="display:flex;gap:8px;justify-content:flex-end">
    <button class="btn btn-o" onclick="closeModal()">Cancel</button>
    <button class="btn btn-d" onclick="closeModal();toast('Subject archived.')">Archive</button></div>`);
}
function moveSectionModal(){
  openModal(`<h3>Move section</h3><div class="frm">
   <div><label>Subject</label><select style="width:100%"><option>IT-NET31 (current: 3A)</option><option>IT-SEC31 (current: 3A)</option></select></div>
   <div><label>New section</label><select style="width:100%"><option>BSIT 3B</option></select></div>
   <div class="note-warn note">Rule: one section per subject — moving replaces the current section.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Section updated.')">Move</button></div></div>`);
}
