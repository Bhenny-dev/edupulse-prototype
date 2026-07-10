/* ============================================================
   EduPulse — dean.js
   Dean role: Dashboard, Academic Settings, Curriculum, Instructor
   Assignment, Students & Enrollment, Oversight.
   Syllabi need no Dean approval — just view/edit, via Curriculum's
   "Open syllabus (Dean edit)", which reuses topic-system.js's
   openSyllabusSheet(...,true).
============================================================ */
function deanDash(){
  view().innerHTML=`
  <div class="grid g4">
    <div class="card stat"><div class="num">${DB.curriculum.length}</div><div class="lbl">Curriculum subjects (BSIT)</div></div>
    <div class="card stat"><div class="num">${DB.instructors.length}</div><div class="lbl">Faculty on roster</div></div>
    <div class="card stat"><div class="num">${DB.curriculum.filter(c=>c.sylStatus==='Approved').length} / ${DB.curriculum.length}</div><div class="lbl">Syllabi approved & published</div></div>
    <div class="card stat"><div class="num">128</div><div class="lbl">Enrolled students</div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h3>Syllabus pipeline</h3>
      ${DB.curriculum.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
        <div><b style="font-size:13px">${c.code}</b><div style="font-size:11.5px;color:var(--mut)">${c.title} · ${c.instructor}</div></div>${sylChip(c.sylStatus)}</div>`).join('')}
    </div>
    <div class="card"><h3>College attention points <span class="ai-badge">PRESCRIPTIVE</span></h3>
      <div class="note-warn note">GE EELECT-IT · BSIT 1A — “Network devices & topologies” mastery at 52%. Instructor prompted to post a recap or re-quiz.</div>
      <div class="note">CC-COMPROG12 syllabus submitted by Prof. Santos — open via Curriculum → Manage to view or edit.</div>
      <div class="note">PF-WEBDEV22 has no assigned instructor for 2nd Sem.</div>
      <div class="note">1 student (BSIT 1A) has an overdue activity in CC-COMPROG11.</div>
    </div>
  </div>`;
}
function deanSettings(){
  view().innerHTML=`
  <div class="grid g2">
  <div class="card"><h3>EduPulse grading sheet ${chip('College-wide behavior','c-teal')}</h3>
    <p style="font-size:13px;color:var(--mut);margin-bottom:12px">Every instructor grading sheet records the scores of the <b>graded activities given in EduPulse</b>, organized by student, subject, section, and semester. Grade encoding stays instructor-exclusive.</p>
    <div class="note">Per activity, the sheet computes the <b>highest score, lowest score, and class average</b> as soon as individual scores are updated.</div>
    <div class="note" style="margin-top:8px"><b>Future improvement:</b> export / integration with the official KCP grading sheet and its institutional term-grade computation.</div>
  </div>
  <div class="card"><h3>Academic term setup</h3>
    <div class="frm">
      <div class="row"><div><label>Academic year</label><input value="${DB.config.ay}" style="width:100%"></div>
      <div><label>Semester</label><select style="width:100%"><option${DB.config.sem==='1st Semester'?' selected':''}>1st Semester</option><option>2nd Semester</option></select></div></div>
      <div class="row"><div><label>Total weeks</label><input type="number" value="${DB.config.weeks}" style="width:100%"></div>
      <div><label>Midterm exam week</label><input type="number" value="${DB.config.midWk}" style="width:100%"></div></div>
      <div><label>Final exam week</label><input type="number" value="${DB.config.finWk}" style="width:100%"></div>
      <button class="btn btn-p" onclick="toast('Academic settings saved — applied to all roles (versioned in audit trail).')">Save settings</button>
    </div>
  </div></div>
  <div class="card" style="margin-top:18px"><h3>Effect preview</h3>
    <table class="tb"><tr><th>Where</th><th>What everyone now sees</th></tr>
    <tr><td>Instructor · Grading Sheet</td><td>Graded-activity columns per subject & section, with Hi / Lo / Class Average per activity</td></tr>
    <tr><td>Instructor · Syllabus</td><td>Exam rows per term: ${schemeTerms().map(t=>t+' Exam').join(' · ')} (official KCP syllabus format)</td></tr>
    <tr><td>Student · My Scores</td><td>Per-activity records with total score and running average — own row only</td></tr></table>
  </div>`;
}
function deanCurr(){
  view().innerHTML=`
  <div class="card">
    <h3>BSIT Curriculum <button class="btn btn-p btn-s" onclick="currModal()">+ Add subject</button></h3>
    <table class="tb"><tr><th>Code</th><th>Title</th><th>Year/Sem</th><th>Units</th><th>Prerequisites</th><th>Class.</th><th></th></tr>
    ${DB.curriculum.map((c,i)=>`<tr><td><b>${c.code}</b></td><td>${c.title}</td><td>${c.year} · ${c.sem}</td><td>${c.units}</td>
      <td>${c.prereq.length?c.prereq.map(p=>chip(p,'c-teal')).join(' '):chip('None','c-mut')}</td><td>${c.cls}</td>
      <td><button class="btn btn-o btn-s" onclick="event.stopPropagation();currPop(${i},event)">Manage ▾</button></td></tr>`).join('')}
    </table>
    <div class="note" style="margin-top:12px"><b>Prerequisite rule:</b> enrollment and assignment are gated by prerequisites; all changes are versioned with an audit trail.</div>
  </div>`;
}
function currPop(i,evt){
  const c=DB.curriculum[i];
  openPop(`<h4>${c.code} ${sylChip(c.sylStatus)}</h4>
  <div class="kv"><b>Title</b>${c.title}</div>
  <div class="kv"><b>Prerequisites</b>${c.prereq.join(', ')||'None'}</div>
  <div class="kv"><b>Instructor / sections</b>${c.instructor} · ${c.sections.join(', ')||'—'}</div>
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();currModal(${i})">✎ Edit subject</button>
    <button class="btn btn-o btn-s" onclick="closePop();courseInfoPopFor('${c.code}',event)">ℹ️ Course info</button>
    <button class="btn btn-o btn-s" onclick="closePop();assignModal('${c.code}')">Assign instructor</button>
    ${DB.syllabi[c.code]?`<button class="btn btn-o btn-s" onclick="closePop();openSyllabusSheet('${c.code}',true)">Open syllabus (Dean edit)</button>`:''}
    <button class="btn btn-d btn-s" onclick="closePop();archiveSubjectModal('${c.code}')">Archive</button>
  </div>`,evt,380);
}
function courseInfoPopFor(code,evt){
  const c=DB.curriculum.find(k=>k.code===code);
  openPop(`<h4>Course info — ${code}</h4>
  <div class="kv"><b>Course description</b>${c.desc||'Not yet documented for this subject.'}</div>
  <div class="kv"><b>Specifications</b><ul style="margin:4px 0 0 16px;padding:0">${(c.specs||['Not yet documented for this subject.']).map(s=>`<li style="margin-bottom:3px">${s}</li>`).join('')}</ul></div>
  <div class="kv"><b>Grading formula <span class="chip c-mut">college-wide</span></b><span style="white-space:pre-line">${DB.policy.grading}</span></div>
  <div class="kv"><b>Course policy <span class="chip c-mut">college-wide</span></b><ul style="margin:4px 0 0 16px;padding:0">${DB.policy.rules.map(r=>`<li style="margin-bottom:3px">${r}</li>`).join('')}</ul></div>
  <div class="kv"><b>References</b>${(c.refs||['Not yet documented for this subject.']).map(r=>`<div style="margin-bottom:2px">${r}</div>`).join('')}</div>
  `,evt,460);
}
function currModal(i){
  const c = i!==undefined?DB.curriculum[i]:{code:'',title:'',units:3,hours:54,year:'1st Yr',sem:'1st Sem',prereq:[],cls:'Major'};
  openModal(`<h3>${i!==undefined?'Edit':'Add'} curriculum subject</h3>
  <div class="frm">
    <div class="row"><div><label>Subject code</label><input value="${c.code}" style="width:100%"></div>
    <div><label>Classification</label><select style="width:100%"><option${c.cls==='Major'?' selected':''}>Major</option><option${c.cls==='Minor'?' selected':''}>Minor</option></select></div></div>
    <div><label>Title</label><input value="${c.title}" style="width:100%"></div>
    <div class="row"><div><label>Units</label><input type="number" value="${c.units}" style="width:100%"></div><div><label>Hours</label><input type="number" value="${c.hours}" style="width:100%"></div></div>
    <div class="row"><div><label>Year level</label><select style="width:100%"><option>1st Yr</option><option>2nd Yr</option><option>3rd Yr</option><option>4th Yr</option></select></div>
    <div><label>Semester</label><select style="width:100%"><option>1st Sem</option><option>2nd Sem</option></select></div></div>
    <div><label>Prerequisite subjects (Dean-controlled gate)</label>
      <select multiple style="width:100%;height:88px">${DB.curriculum.map(x=>`<option${c.prereq.includes(x.code)?' selected':''}>${x.code} — ${x.title}</option>`).join('')}</select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="closeModal();toast('Curriculum saved (versioned).')">Save (versioned)</button></div>
  </div>`);
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
  <div class="note" style="margin-top:18px"><b>Rules enforced:</b> instructors carry the subject load set by the Dean (sections filled by block rosters or INTL enrollment); a student joins only one section per subject.</div>`;
}
function facultySheet(name){
  const f=DB.instructors.find(x=>x.name===name);
  const subs=DB.curriculum.filter(c=>c.instructor===name);
  openSheet('👨‍🏫', name, `${f.title} · ${f.dept} · ${f.id} · ${f.email}`, `
  <div class="kv"><b>Subjects assigned (${subs.length})</b></div>
  ${subs.length?subs.map(c=>`<div class="sec-item">
    <div class="tic" style="background:var(--pri-l)">📘</div>
    <div><b>${c.code} — ${c.title}</b><small>${c.year} · ${c.sem} · sections: ${c.sections.join(', ')||'—'}</small></div>
    <div class="acts">${sylChip(c.sylStatus)}<button class="btn btn-o btn-s" onclick="closeSheet();assignModal('${c.code}')">Change…</button></div></div>`).join('')
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
  <div class="note" style="margin-top:0"><b>Roster-based sectioning:</b> students are rostered into <b>block sections</b> — enrolling the roster assigns every student in it to the section's subjects and instructors at once (not individually). Students without a block belong to the <b>INTL (International / Irregular)</b> roster and are enrolled per subject around their own schedules.</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px">
    <button class="btn btn-p btn-s" onclick="registerRosterModal()">Register roster / section</button>
    <button class="btn btn-o btn-s" onclick="registerAccountModal()">Register account</button>
  </div>
  <div class="grid g3">
    ${['BSIT 1A','BSIT 1B','BSIT 2A'].map(sec=>`
    <div class="card click" onclick="rosterSheet('${sec}')">
      <h3>🧑‍🤝‍🧑 ${sec} — Block Section</h3>
      <div class="kpi" style="margin-top:0">
        <div class="k"><b>${DB.students[sec].length}</b><small>Rostered</small></div>
        <div class="k"><b>${DB.curriculum.filter(c=>c.sections.includes(sec)).length}</b><small>Subjects</small></div>
      </div>
      <div class="lock-note">One roster → all subjects & instructors of ${sec}. Tap to manage.</div>
    </div>`).join('')}
    <div class="card click" onclick="intlSheet()">
      <h3>🌐 INTL — International / Irregular</h3>
      <div class="kpi" style="margin-top:0">
        <div class="k"><b>${DB.intl.length}</b><small>Students</small></div>
        <div class="k"><b>—</b><small>No block</small></div>
      </div>
      <div class="lock-note">No block section — enrolled per subject with an individual (cluttered) schedule. Tap to manage.</div>
    </div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Enrollment rules</h3>
   <table class="tb">
    <tr><td>Block roster enrollment</td><td>One action assigns the whole roster to a subject section and its instructor — never student-by-student.</td></tr>
    <tr><td>INTL enrollment</td><td>Per student, per subject: either joins a block section's schedule or an INTL slot.</td></tr>
    <tr><td>Always enforced</td><td>Curriculum prerequisites · one section per subject per student · section capacity.</td></tr>
   </table></div>`;
}
function rosterSheet(sec){
  const subjects=DB.curriculum.filter(c=>c.sections.includes(sec));
  openSheet('🧑‍🤝‍🧑', sec+' — Block Section Roster', 'One roster → all subjects & instructors of this section', `
  <div class="grid g2">
   <div class="card"><h3>Rostered students (${DB.students[sec].length}) <button class="btn btn-p btn-s" onclick="addToRosterModal('${sec}')">+ Add to roster</button></h3>
    ${DB.students[sec].map(st=>`<div class="sec-item click" onclick="stuPop('${st.id}','${st.name}',event)">
      <div class="tic" style="background:var(--pri-l)">🎓</div>
      <div><b>${st.name}</b><small>${st.id} · BSIT 1 · rostered in ${sec}</small></div>
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
function intlSheet(){
  openSheet('🌐', 'INTL — International / Irregular Roster', 'Students without a block section · per-subject individual schedules', `
  <div class="note" style="margin-top:0">INTL students have <b>no block section</b>: schedules are built subject-by-subject — attending some classes with block sections and others in INTL slots.</div>
  ${DB.intl.map(st=>`<div class="sec-item">
    <div class="tic" style="background:var(--warn-l)">🌐</div>
    <div><b>${st.name}</b> <span class="chip c-mut">${st.tag}</span><small>${st.id} · individual schedule:</small>
      <div class="subtopics" style="margin:7px 0 0">${st.subs.map(x=>`<span class="st">${x[0]} — ${x[1]}</span>`).join('')}</div></div>
    <div class="acts"><button class="btn btn-p btn-s" onclick="intlEnrollModal('${st.name}')">+ Enroll to subject…</button></div></div>`).join('')}
  <button class="btn btn-o" style="margin-top:6px" onclick="intlEnrollModal('')">+ Add student to INTL roster</button>`);
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
function intlEnrollModal(name){
  openModal(`<h3>INTL individual enrollment</h3><div class="frm">
   <div><label>Student</label><input value="${name}" placeholder="Search student ID / name" style="width:100%"></div>
   <div><label>Subject</label><select style="width:100%">${DB.curriculum.map(c=>`<option>${c.code} — ${c.title}</option>`).join('')}</select></div>
   <div><label>Schedule slot</label><select style="width:100%"><option>Attend with BSIT 1A</option><option>Attend with BSIT 1B</option><option selected>INTL schedule (own slot)</option></select></div>
   <div class="note-warn note">INTL students are enrolled per subject; the system checks prerequisites, duplicate sections, and schedule clashes across their individual timetable.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('INTL enrollment saved — schedule checked for clashes.')">Enroll</button></div></div>`);
}
function stuPop(id,name,evt){
  openPop(`<h4>${name} <span class="chip c-mut">${id}</span></h4>
  <div class="kv"><b>Standing</b>Regular · BSIT 1 · ${DB.config.sem}</div>
  <div class="kv"><b>Alerts</b>1 overdue activity (CC-COMPROG11)</div>
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();enrollModal('${name}')">Enroll to subject…</button>
    <button class="btn btn-o btn-s" onclick="closePop();moveSectionModal()">Move section</button>
    <button class="btn btn-o btn-s" onclick="closePop();toast('Read-only academic record opened (prototype).')">View record</button>
  </div>`,evt,360);
}
function enrollModal(name){
  openModal(`<h3>Enroll student</h3><div class="frm">
   <div><label>Student</label><input value="${name||''}" placeholder="Search student ID / name" style="width:100%"></div>
   <div><label>Subject</label><select style="width:100%">${DB.curriculum.map(c=>`<option>${c.code} — ${c.title}</option>`).join('')}</select></div>
  <div><label>Section</label><select style="width:100%">${ROSTER_CHOICES.map(r=>`<option>${r.label} · ${r.kind}</option>`).join('')}</select></div>
   <div class="note"><b>Automatic checks:</b> prerequisite completion · one-section-per-subject rule · section capacity.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Enrollment saved — checks passed.')">Enroll</button></div></div>`);
}
function deanOver(){
  view().innerHTML=`
  <div class="grid g2">
    <div class="card"><h3>Class performance by subject</h3>
      ${[['GE EELECT-IT · 1A',74],['GE EELECT-IT · 1B',71],['CC-COMPROG11 · 1A',66],['CC-COMPROG11 · 1B',69]].map(x=>`
      <div class="topic-row"><div class="tn">${x[0]}</div><div class="bar"><i style="width:${x[1]}%;background:${x[1]<70?'var(--warn)':'var(--pri)'}"></i></div><div class="pv">${x[1]}%</div></div>`).join('')}
      <div class="lock-note" style="margin-top:8px">Average of recorded graded-activity scores (view-only — grade encoding is instructor-exclusive).</div>
    </div>
    <div class="card"><h3>Audit trail (privileged actions)</h3>
      <table class="tb">
      <tr><td>Dean set academic term: ${DB.config.sem}, AY ${DB.config.ay}</td><td class="lock-note">today</td></tr>
      <tr><td>Prof. Alvarez accepted AI consistency prescription (T3 quiz)</td><td class="lock-note">today 09:41</td></tr>
      <tr><td>Auto-recorded: Short Quiz T1 scores → BSIT 1A grading sheet</td><td class="lock-note">today 09:10</td></tr>
      <tr><td>Prof. Santos submitted CC-COMPROG12 syllabus</td><td class="lock-note">yesterday</td></tr>
      <tr><td>Dean updated prerequisite: CC-DATSTRUC21 ← CC-COMPROG12</td><td class="lock-note">Jun 30</td></tr>
      </table></div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Reports</h3>
   <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn btn-o" onclick="toast('Prototype: exports subject performance report (PDF).')">📄 Subject performance report</button>
    <button class="btn btn-o" onclick="toast('Prototype: exports syllabus compliance report (PDF).')">📄 Syllabus compliance report</button>
    <button class="btn btn-o" onclick="toast('Prototype: exports grade summary per section (CSV).')">📄 Grade summary (CSV)</button>
   </div></div>`;
}
function archiveSubjectModal(code){
  openModal(`<h3>Archive subject — ${code}?</h3>
  <p style="font-size:13.5px;margin-bottom:12px">Archiving removes ${code} from active offerings; history, syllabi, and records are retained. This action is audit-logged.</p>
  <div style="display:flex;gap:8px;justify-content:flex-end">
    <button class="btn btn-o" onclick="closeModal()">Cancel</button>
    <button class="btn btn-d" onclick="closeModal();toast('Subject archived (audit-logged).')">Archive</button></div>`);
}
function moveSectionModal(){
  openModal(`<h3>Move section</h3><div class="frm">
   <div><label>Subject</label><select style="width:100%"><option>GE EELECT-IT (current: 1A)</option><option>CC-COMPROG11 (current: 1A)</option></select></div>
   <div><label>New section</label><select style="width:100%"><option>BSIT 1B</option></select></div>
   <div class="note-warn note">Rule: one section per subject — moving replaces the current section.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="closeModal();toast('Section updated.')">Move</button></div></div>`);
}
