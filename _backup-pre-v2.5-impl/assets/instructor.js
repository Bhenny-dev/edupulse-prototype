/* ============================================================
   EduPulse — instructor.js
   Dashboard (redesigned), Consistency Checker, Grading Sheet.
   Syllabus Builder lives in topic-system.js; Course Content in
   content-system.js — both shared with Dean edit-mode / loaded
   here too since Instructor pages need them.
============================================================ */

/* ---- Dashboard ---- */
function nextTopicFor(code){
  const sy=DB.syllabi[code]; const packs=DB.packs[code]||{};
  const nonExam=sy.topics.filter(t=>!t.title.includes('EXAM'));
  return nonExam.find(t=>!topicHasGenPub(packs[t.no]))||nonExam[nonExam.length-1];
}
function syllabusProgress(code){
  const sy=DB.syllabi[code]; const packs=DB.packs[code]||{};
  const nonExam=sy.topics.filter(t=>!t.title.includes('EXAM'));
  const done=nonExam.filter(t=>topicHasGenPub(packs[t.no])).length;
  const pct=nonExam.length?Math.round(done/nonExam.length*100):0;
  return {done,total:nonExam.length,pct};
}
function progressLabel(pct){
  if(pct>=100) return 'Complete';
  if(pct>=70) return 'Nearing completion';
  if(pct>=30) return 'Midway through the term';
  return 'Early in the term';
}
function sectionsByYear(){
  const byYear={};
  myAssignments().forEach(x=>{
    const c=DB.curriculum.find(k=>k.code===x.code);
    (byYear[c.year]=byYear[c.year]||[]).push({code:x.code,title:c.title,sections:x.sections});
  });
  return byYear;
}
const YEAR_ORDER=['1st Yr','2nd Yr','3rd Yr','4th Yr'];
function insDash(){
  const assignments=myAssignments();
  const totalTopics=assignments.reduce((a,x)=>a+DB.syllabi[x.code].topics.length,0);
  const pendingFindings=DB.checkFindings.findings.filter(f=>!f.resolved).length;
  const allSections=new Set(assignments.flatMap(x=>x.sections));
  const byYear=sectionsByYear();
  view().innerHTML=`
  <div class="grid g4">
    <div class="card stat"><div class="num">${assignments.length}</div><div class="lbl">Subjects assigned by the Dean</div></div>
    <div class="card stat"><div class="num">${totalTopics}</div><div class="lbl">Topics across your subjects</div></div>
    <div class="card stat"><div class="num">${pendingFindings}</div><div class="lbl">Consistency finding${pendingFindings===1?'':'s'} pending</div></div>
    <div class="card stat"><div class="num">${allSections.size}</div><div class="lbl">Sections handled (Yr 1–4)</div></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Classes & sections handled — by year level</h3>
    ${YEAR_ORDER.filter(y=>byYear[y]).map(y=>`
    <div class="year-block"><div class="yh">${y}</div>
      ${byYear[y].map(s=>`<div class="sec-item"><div class="tic" style="background:var(--pri-l)">📘</div>
        <div><b>${s.code} — ${s.title}</b><small>Sections: ${s.sections.join(', ')}</small></div></div>`).join('')}
    </div>`).join('')||'<div class="lock-note">No subjects assigned yet.</div>'}
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>What's next</h3>
      ${assignments.map(x=>{const t=nextTopicFor(x.code); if(!t) return '';
        return `<div class="sec-item">
          <div class="tic" style="background:var(--pri-l)">T${t.no}</div>
          <div><b>${x.code} — ${t.title}</b><small>${t.weeks} · ${t.items.slice(0,4).map(it=>PLAN_ICON[it.k]||'•').join(' ')}</small></div>
          <div class="acts"><button class="btn btn-o btn-s" onclick="location.href='content.html?code='+encodeURIComponent('${x.code}')+'&topic=${t.no}'">View</button></div>
        </div>`;}).join('')}
    </div>
    <div class="card"><h3>Syllabus progress <span class="ai-badge">GENERATED CONTENT</span></h3>
      ${assignments.map(x=>{const p=syllabusProgress(x.code);
        return `<div style="margin-bottom:12px">
          <div class="topic-row" style="margin-bottom:3px"><div class="tn">${x.code}</div><div class="bar"><i style="width:${p.pct}%;background:${p.pct>=70?'var(--ok)':p.pct>=30?'var(--warn)':'var(--pri)'}"></i></div><div class="pv">${p.pct}%</div></div>
          <div class="lock-note">${p.done} / ${p.total} topics delivered — ${progressLabel(p.pct)}</div>
        </div>`;}).join('')}
      <button class="btn btn-o btn-s" onclick="location.href='content.html'">Open Course Content →</button>
    </div>
  </div>`;
}

/* ---- Consistency Checker ---- */
function insCheck(){
  const cf=DB.checkFindings;
  view().innerHTML=`
  <div class="card"><h3>AI Consistency Checker — ${myAssignments()[0].code} <span class="ai-badge">EduPulse-CHECK v1</span></h3>
    <div class="note-ai note"><b>Detected edit:</b> ${cf.edit}</div>
    ${cf.findings.map((f,i)=>`
    <div class="rv-item" id="find-${i}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b style="font-size:13.5px">${f.item}</b>
        ${f.resolved?chip(f.resolution||'Resolved','c-ok'):(f.sev==='warning'?chip('Inconsistency','c-warn'):chip('Consistent','c-ok'))}
      </div>
      ${f.resolved?'':`
      <div style="font-size:13px;margin-bottom:4px"><b>Issue:</b> ${f.issue}</div>
      <div style="font-size:13px;margin-bottom:10px"><b>AI prescription:</b> ${f.rx}</div>
      ${f.sev==='warning'?`<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p btn-s" onclick="resolveFinding(${i},'Accepted — AI prescription applied ✓')">✓ Accept prescription</button>
        <button class="btn btn-o btn-s" onclick="manualEditPop(${i},event)">✎ Edit manually — inspect file first</button>
        <button class="btn btn-o btn-s" onclick="resolveFinding(${i},'Kept as is — no changes')">Keep as is</button></div>`:''}`}
    </div>`).join('')}
    <div class="lock-note">Every decision is logged to the audit trail. The AI never changes published content on its own.</div>
  </div>`;
}
function manualEditPop(i,evt){
  const f=DB.checkFindings.findings[i];
  openPop(`<h4>Inspect before editing <span class="chip c-warn">Manual review</span></h4>
  <div class="kv"><b>Affected file</b>${f.file.name}</div>
  <div class="kv"><b>Flagged part (highlighted)</b>scan the file to judge whether the AI suggestion truly applies</div>
  <div class="file-view" style="max-height:200px">${f.file.html}</div>
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();resolveFinding(${i},'AI suggestion applied after manual inspection ✓')">Apply AI suggestion</button>
    <button class="btn btn-o btn-s" onclick="closePop();manualEditModal(${i})">✎ Edit the flagged part myself</button>
    <button class="btn btn-o btn-s" onclick="closePop();resolveFinding(${i},'Inspected — kept as is')">Not applicable — keep as is</button>
  </div>`,evt,520);
}
function manualEditModal(i){
  const f=DB.checkFindings.findings[i];
  openModal(`<h3>Manual edit — ${f.item}</h3>
  <div class="lock-note" style="margin-bottom:8px">${f.file.name} · flagged part loaded below</div>
  <div class="frm">
    <div><label>Flagged content (edit directly)</label><textarea rows="5" style="width:100%">${f.item.startsWith('Quiz')?'Item 9. Which of the following manages hardware resources?\nA. Operating system ✓  B. Spreadsheet  C. Compiler icon  D. Manual':'S8 Operating Systems Overview — Windows / Linux / macOS'}</textarea></div>
    <div class="note-ai note">Reference — AI prescription: ${f.rx}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="closeModal();resolveFinding(${i},'Edited manually ✓')">Save my edit</button></div>
  </div>`);
}
function resolveFinding(i,msg){
  DB.checkFindings.findings[i].resolved=true;
  DB.checkFindings.findings[i].resolution=msg;
  saveDB();
  insCheck();
  toast('Decision logged to the audit trail.');
}

/* ---- Grading ---- */
function gradeLegendHtml(){
  return `<details class="legend"><summary>What do Q# / A# / PE# / EX# / Hi / Lo / Avg mean?</summary>
   <div class="legend-grid">${GRADE_LEGEND.map(g=>`<div><b>${g.abbr}</b>${g.full} — ${g.note}</div>`).join('')}</div>
  </details>`;
}
function insGrading(){
  if(!(window._gsub&&myAssignments().some(x=>x.code===window._gsub))) window._gsub=myAssignments()[0].code;
  const gsub=window._gsub;
  const subjTabs=`<div class="tabs">${myAssignments().map(x=>`<button class="tab ${x.code===gsub?'on':''}" onclick="window._gsub='${x.code}';insGrading()">${x.code}</button>`).join('')}</div>`;
  const head=gradeLegendHtml()+`<div class="note" style="margin-top:0"><b>EduPulse grading sheet — ${DB.config.sem}, AY ${DB.config.ay}.</b> Records the scores of the graded activities you give in EduPulse, per subject and section. The <b>highest score, lowest score, and class average</b> of each activity are computed as soon as the individual scores are updated. <span style="color:var(--mut)">Official KCP grading-sheet integration is a planned future improvement.</span></div>`+subjTabs;
  const secList=gradeSections(gsub);
  if(!secList.length){
    view().innerHTML=head+`<div class="card"><h3>${gsub} — Grading Sheet ${chip('Instructor-exclusive','c-teal')}</h3>
    <div class="note">No recorded activities for ${gsub} yet this semester. Columns are created automatically when you publish graded activities; roster-enrolled class lists are already loaded (${myAssignments().find(x=>x.code===gsub).sections.join(' · ')}).</div></div>`;
    return;
  }
  const sec = secList.includes(window._gsec)?window._gsec:secList[0];
  view().innerHTML=head+`
  <div class="tabs">${secList.map(x=>`<button class="tab ${x===sec?'on':''}" onclick="window._gsec='${x}';insGrading()">${x}</button>`).join('')}</div>
  ${activityTable(gsub,sec)}`;
}
function activityTable(code,sec){
  const acts=gradedActivities();
  const rows=gradeRows(code,sec);
  const stats=acts.map(a=>actStats(rows,a));
  return `<div class="card"><h3>Graded Activities — ${sec} · ${code} · ${DB.config.sem} ${chip('Instructor-exclusive','c-teal')}</h3>
  <div class="gr-tb"><table>
    <tr><th>Student ID</th><th class="nm">Name</th>${acts.map(a=>`<th>${a.k}<br><small>/${a.max}</small></th>`).join('')}<th>Total<br><small>/${acts.reduce((t,a)=>t+a.max,0)}</small></th><th>%</th></tr>
    ${rows.map(s=>{const o=studentOverall(s);
      return `<tr><td>${s.id}</td><td style="text-align:left">${s.name}</td>
      ${acts.map((a,ai)=>`<td>${ai===0?`<span title="Auto-recorded from Short Quiz T1">${actVal(s,a)} <small style="color:var(--ai)">⚡</small></span>`:`<input value="${actVal(s,a)}">`}</td>`).join('')}
      <td><b>${o.tot}</b></td><td><b style="color:${o.pct<75?'var(--bad)':'var(--navy)'}">${o.pct.toFixed(1)}%</b></td></tr>`;}).join('')}
    <tr style="border-top:2px solid var(--line)"><td></td><td style="text-align:left"><b>Highest score</b></td>${stats.map(st=>`<td><b style="color:var(--ok)">${st.hi}</b></td>`).join('')}<td></td><td></td></tr>
    <tr><td></td><td style="text-align:left"><b>Lowest score</b></td>${stats.map(st=>`<td><b style="color:var(--bad)">${st.lo}</b></td>`).join('')}<td></td><td></td></tr>
    <tr><td></td><td style="text-align:left"><b>Class average</b></td>${stats.map(st=>`<td><b>${st.avg.toFixed(1)}</b></td>`).join('')}<td></td><td></td></tr>
  </table></div>
  <div class="note" style="margin-top:10px">⚡ = auto-recorded from a published graded activity. Highest / lowest / class average recompute whenever individual scores are updated. Students see their own row only, each score linked to the graded activity.</div></div>`;
}
