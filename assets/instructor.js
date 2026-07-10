/* ============================================================
   EduPulse — instructor.js
   Dashboard (redesigned), Consistency Checker, Score Visualization.
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
/* Single flow, no redundant buttons: each unresolved finding shows ONE "View
   & resolve" action. It opens the real content (checkerViewPop) — same
   file/quiz a student would see — with the flagged part marked in place and
   the AI suggestion + all three resolution actions right there. Nothing else
   duplicates Accept/Edit/Keep at the list level, and there's no separate
   "inspect first" popover to click through before you can act. */
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
      ${f.sev==='warning'?`<button class="btn btn-p btn-s" onclick="checkerViewPop(${i})">👁 View & resolve</button>`:''}`}
    </div>`).join('')}
    <div class="lock-note">Every decision is logged to the audit trail. The AI never changes published content on its own.</div>
  </div>`;
}
/* Opens directly on the real content (real quiz items, or the real slide/
   paragraph list a section's generated file is built from — same parser
   filegen.js uses, so this is never a mocked-up snippet) with the specific
   flagged part marked in place, and the AI suggestion + resolution actions
   right after it — one popover, one pass, nothing to click through first. */
async function checkerViewPop(i){
  const f=DB.checkFindings.findings[i];
  let contentHtml, fileHtml='';
  if(f.quizId){
    const q=DB.quizzes[f.quizId];
    contentHtml=`<div class="lock-note" style="margin:2px 0 8px">${q.course} · ${q.items.length} items · real quiz content (✓ marks the correct option)</div>
      ${q.items.map((it,ii)=>`<div class="kv" style="margin-top:8px"><b>Item ${ii+1} — ${it.topic}</b>${it.stem}
        <div style="margin-top:4px;font-size:12px;color:#3A4160">${it.opts.map((o,oi)=>`${oi===it.ans?'<b style="color:var(--ok)">✓ '+o+'</b>':'• '+o}`).join('<br>')}</div></div>`).join('')}
      <div class="note-warn note" style="margin-top:10px">⚑ Flagged: none of the ${q.items.length} items above cover the newly added Mobile OS subtopic.</div>`;
  } else if(f.si!==undefined){
    const sec=DB.packs[f.code][f.tno].secs[f.si];
    if(sec.t==='ppt'){
      const titles=parsePreviewToSlideTitles(sec.preview);
      contentHtml=`<div class="lock-note" style="margin:2px 0 8px">${f.code} · Topic ${f.tno} · ${titles.length} slides · real presentation content</div>
        <div class="grid g2">${titles.map((t,ti)=>{
          const flagged=/summary/i.test(t);
          return `<div class="card" style="text-align:center;padding:16px 10px;${flagged?'border:1.5px solid var(--warn);background:rgba(242,174,42,.1)':''}">
            <div class="lock-note" style="margin-bottom:5px">Slide ${ti+1}${flagged?' ⚑':''}</div><b style="font-size:13px">${t}</b></div>`;
        }).join('')}</div>
        <div class="note-warn note" style="margin-top:10px">⚑ Flagged (⚑ slide above): still maps only to the old subtopic list — doesn't mention Mobile OS.</div>`;
    } else {
      const paras=parsePreviewToParagraphs(sec.preview);
      contentHtml=`<div class="lock-note" style="margin:2px 0 8px">${f.code} · Topic ${f.tno} · real document content</div>
        ${paras.map(p=>`<div class="kv" style="margin-top:8px">${p.heading?`<b>${p.heading}</b>`:''}${p.body}</div>`).join('')}
        <div class="note-warn note" style="margin-top:10px">⚑ ${f.issue}</div>`;
    }
    /* Build the SAME real file this section opens as from Course Content
       (filegen.js — single source of truth is `sec.preview`), so the
       Checker offers actual proof, not just an HTML approximation. */
    try{
      const c=DB.curriculum.find(x=>x.code===f.code);
      const topic=DB.syllabi[f.code].topics.find(x=>x.no===f.tno);
      const fctx=sectionFileCtx(sec,{courseCode:f.code,courseTitle:c.title,topicNo:f.tno,topicTitle:topic.title});
      let blob,ext;
      if(sec.t==='ppt'){ blob=await buildPptxBlob(fctx); ext='pptx'; }
      else { const fmt=DOC_BUILDERS[sec.format]?sec.format:'word'; blob=await DOC_BUILDERS[fmt].build(fctx); ext=DOC_BUILDERS[fmt].ext; }
      setDownloadHandler(blob,slugify(sec.label)+'.'+ext);
      fileHtml=`<div class="note-ai note" style="margin-top:10px">This is the real, downloadable <b>.${ext}</b> this section opens as in Course Content — not a mock-up.</div>
        <div class="pop-acts" style="margin-top:8px"><button class="btn btn-o btn-s" onclick="__filegenDownload()">⬇ Download real file (.${ext})</button></div>`;
    }catch(e){ console.error(e); }
  } else {
    contentHtml=`<div class="lock-note">This finding is about the syllabus plan only — no generated file to view.</div>`;
  }
  openPop(`<h4>${f.item}</h4>
  <div style="max-height:42vh;overflow:auto;margin:6px 0">${contentHtml}</div>
  ${fileHtml}
  <div class="note-ai note" style="margin-top:12px"><b>AI suggestion:</b> ${f.rx}</div>
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();resolveFinding(${i},'Accepted — AI prescription applied ✓')">✓ Accept suggestion</button>
    <button class="btn btn-o btn-s" onclick="closePop();manualEditModal(${i})">✎ Edit manually</button>
    <button class="btn btn-o btn-s" onclick="closePop();resolveFinding(${i},'Kept as is — no changes')">Keep as is</button>
  </div>`,null,640);
}
function manualEditModal(i){
  const f=DB.checkFindings.findings[i];
  const sec=f.si!==undefined?DB.packs[f.code][f.tno].secs[f.si]:null;
  openModal(`<h3>Manual edit — ${f.item}</h3>
  <div class="lock-note" style="margin-bottom:8px">${sec?sec.label:f.item} · editable draft loaded below</div>
  <div class="frm">
    <div><label>Content (editable draft — same text the real file is built from)</label><textarea id="mePreview" rows="6" style="width:100%">${sec?sec.preview:'Quiz items are edited from the quiz\'s own section — use "Open real quiz" to review items, then Edit on that section.'}</textarea></div>
    <div class="note-ai note">Reference — AI prescription: ${f.rx}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveManualEdit(${i})">Save my edit</button></div>
  </div>`);
}
/* Persists the manual edit to the section's own `preview` — the same
   single-source-of-truth field filegen.js reads, so fixing it here actually
   changes the real .pptx/.docx the section opens as, not just the checker's log. */
function saveManualEdit(i){
  const f=DB.checkFindings.findings[i];
  if(f.si!==undefined){
    const sec=DB.packs[f.code][f.tno].secs[f.si];
    const el=$('mePreview');
    if(el) sec.preview=el.value;
    saveDB();
  }
  closeModal(); resolveFinding(i,'Edited manually ✓');
}
function resolveFinding(i,msg){
  DB.checkFindings.findings[i].resolved=true;
  DB.checkFindings.findings[i].resolution=msg;
  saveDB();
  insCheck();
  toast('Decision logged to the audit trail.');
}
/* ---- Score Visualization (EduPulse scoring sheet) ---- */
function gradeLegendHtml(){
  return `<details class="legend"><summary>What do Q# / A# / PE# / EX# · Hi / Lo / Avg · Completed / Missed mean?</summary>
   <div class="legend-grid">${GRADE_LEGEND.map(g=>`<div><b>${g.abbr}</b>${g.full} — ${g.note}</div>`).join('')}</div>
  </details>`;
}
/* Cards first (one per assigned subject), matching the app's card → page-modal
   pattern; tapping a card opens that subject's sheet with section tabs kept
   inside it (openGradingSheet), so switching BSIT 1A ↔ 1B stays a toggle
   within the subject instead of a second row of top-level tabs. */
function insGrading(){
  view().innerHTML=`
  <div class="note" style="margin-top:0"><b>EduPulse scoring sheet — ${DB.config.sem}, AY ${DB.config.ay}.</b> Records the scores students obtain in the activities you post within EduPulse, grouped by term (${schemeLabel()}); auto-recorded scores are pre-filled and <b>every score is editable by the instructor</b> (override auto-scores or enter results from activities done outside the system). Open a subject to view its sheet.</div>
  ${myAssignments().map(x=>{
    const c=DB.curriculum.find(k=>k.code===x.code);
    const secList=gradeSections(x.code);
    const totalStudents=secList.reduce((n,sec)=>n+gradeRows(x.code,sec).length,0);
    return `<div class="card click subj-card" onclick="openGradingSheet('${x.code}')">
    <div class="sc-ic">📊</div>
    <div style="flex:1"><b>${x.code} — ${c.title}</b><small>sections ${x.sections.join(', ')} · ${totalStudents} student(s) · ${secList.length?gradedActivities().length+' activities recorded':'no recorded activities yet'}</small></div>
    <span class="chip c-mut">Open sheet →</span>
  </div>`;}).join('')}`;
}
function openGradingSheet(code){
  if(code) window._gsub=code;
  if(!(window._gsub&&myAssignments().some(x=>x.code===window._gsub))) window._gsub=myAssignments()[0].code;
  const gsub=window._gsub;
  const c=DB.curriculum.find(k=>k.code===gsub);
  const sub=`Score Visualization · ${DB.config.sem}, AY ${DB.config.ay}`;
  const secList=gradeSections(gsub);
  if(!secList.length){
    openSheet('📊', gsub+' — '+c.title, sub, `
    <div class="note" style="margin-top:0">No recorded activities for ${gsub} yet this semester. Columns appear automatically once students answer the activities you post; roster-enrolled class lists are already loaded (${myAssignments().find(x=>x.code===gsub).sections.join(' · ')}).</div>`);
    return;
  }
  const sec = secList.includes(window._gsec)?window._gsec:secList[0];
  window._gsec=sec;
  openSheet('📊', gsub+' — '+c.title, sub, gradeLegendHtml()+`
  <div class="tabs">${secList.map(x=>`<button class="tab ${x===sec?'on':''}" onclick="window._gsec='${x}';openGradingSheet()">${x}</button>`).join('')}</div>
  ${activityTable(gsub,sec)}`, 1320);
}
function activityTable(code,sec){
  const acts=gradedActivities();
  const rows=gradeRows(code,sec);
  const stats=acts.map(a=>actStats(rows,a));
  // term-group header (Midterm / Finals labels only — no term-grade computation)
  const terms=[]; acts.forEach(a=>{const last=terms[terms.length-1]; if(last&&last.term===a.term) last.span++; else terms.push({term:a.term,span:1});});
  const cell=(s,a,ai)=>{
    const auto = a.key==='cs'&&a.i===0; // first quiz column originates from a submitted quiz (auto-recorded, still editable)
    const miss = actMissed(s,a);
    const tip = miss?'Missed — type a score to record it manually (e.g., a rubric-guided activity submitted outside the system)':(auto?'Auto-recorded from a submitted quiz — you can override it':'Recorded from the posted activity — editable');
    return `<td class="${miss?'miss-cell':''}"><input class="score-cell" style="width:54px;text-align:center" type="number" min="0" max="${a.max}" step="0.5" value="${miss?'':actVal(s,a)}" placeholder="${miss?'—':''}" title="${tip}" onchange="editScore('${code}','${sec}','${s.id}','${a.key}',${a.i},${a.max},this)">${miss?'<small style="color:var(--bad)"> missed</small>':''}</td>`;
  };
  return `<div class="card"><h3>EduPulse Scoring Sheet — ${sec} · ${code} · ${DB.config.sem} ${chip('Instructor-exclusive · editable','c-teal')}</h3>
  <div class="gr-tb"><table>
    <tr><th></th><th class="nm"></th>${terms.map(t=>`<th colspan="${t.span}" style="text-align:center;border-bottom:2px solid var(--pri)">${t.term}</th>`).join('')}<th></th><th></th></tr>
    <tr><th>Student ID</th><th class="nm">Name</th>${acts.map(a=>`<th>${a.k}<br><small>/${a.max}</small></th>`).join('')}<th>Total<br><small>/${acts.reduce((t,a)=>t+a.max,0)}</small></th><th>%</th></tr>
    ${rows.map(s=>{const o=studentOverall(s);
      return `<tr><td>${s.id}</td><td style="text-align:left">${s.name}</td>
      ${acts.map((a,ai)=>cell(s,a,ai)).join('')}
      <td><b>${o.tot}</b></td><td><b style="color:${o.pct<75?'var(--bad)':'var(--navy)'}">${o.pct.toFixed(1)}%</b></td></tr>`;}).join('')}
    <tr style="border-top:2px solid var(--line)"><td></td><td style="text-align:left"><b>Highest score</b></td>${stats.map(st=>`<td><b style="color:var(--ok)">${st.hi}</b></td>`).join('')}<td></td><td></td></tr>
    <tr><td></td><td style="text-align:left"><b>Lowest score</b></td>${stats.map(st=>`<td><b style="color:var(--bad)">${st.lo}</b></td>`).join('')}<td></td><td></td></tr>
    <tr><td></td><td style="text-align:left"><b>Class average</b></td>${stats.map(st=>`<td><b>${st.avg.toFixed(1)}</b></td>`).join('')}<td></td><td></td></tr>
  </table></div></div>`;
}
/* Instructor edit/override of any score cell. The score lives directly in the
   student record (s[a.key][a.i]), so writing it back persists and every stat
   (Hi/Lo/Avg, per-student total & %) recomputes on the next render. Entering a
   score for a Missed activity also clears its Missed flag (now recorded — e.g.,
   a rubric-guided activity scored manually outside the system). */
function editScore(code,sec,sid,akey,ai,max,el){
  const rows=gradeRows(code,sec);
  const s=rows.find(x=>String(x.id)===String(sid));
  if(!s){ return; }
  let v=parseFloat(el.value);
  if(el.value===''||isNaN(v)){ return; }
  v=Math.max(0,Math.min(max,Math.round(v*2)/2));
  if(!Array.isArray(s[akey])) s[akey]=[];
  s[akey][ai]=v;
  if(Array.isArray(s.missed)){
    const act=gradedActivities().find(a=>a.key===akey&&a.i===ai);
    if(act) s.missed=s.missed.filter(m=>m!==act.k);
  }
  saveDB();
  openGradingSheet();
  toast('Score updated — statistics recomputed.');
}