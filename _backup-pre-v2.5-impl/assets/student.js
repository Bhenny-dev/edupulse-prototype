/* ============================================================
   EduPulse — student.js
   Dashboard, My Subjects, My Scores, Quiz Reviews, My Progress Visualization.
   Secure quiz start/practice flows live in quiz-engine.js.
============================================================ */
function stuDash(){
  const ge=DB.stuSubjects[0];
  view().innerHTML=`
  <div class="grid g4">
    <div class="card stat"><div class="num">${DB.stuSubjects.length}</div><div class="lbl">Enrolled subjects (${DB.config.sem})</div></div>
    <div class="card stat"><div class="num">1</div><div class="lbl">Quiz open — due today 5 PM</div></div>
    <div class="card stat"><div class="num">78%</div><div class="lbl">Class standing to date</div></div>
    <div class="card stat"><div class="num" style="color:var(--warn)">1</div><div class="lbl">Missing activity (CC-COMPROG11)</div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h3>Open & locked activities</h3>
      <div class="sec-item click" onclick="matPop(0,1,2,event)">
        <div class="tic" style="background:var(--ok-l)">✅</div>
        <div><b>Short Quiz — Introduction to ICT</b><small>GE EELECT-IT · T1 · 15 min · MCQ · hidden-choice reveal</small></div>
        <div class="acts"><span class="chip c-ok">Open</span><span class="chip c-mut">Details ▾</span></div></div>
      <div class="sec-item locked"><div class="tic" style="background:var(--ok-l)">✅</div>
        <div><b>Quiz — Computer Hardware & Software</b><small>GE EELECT-IT · T3</small></div>
        <div class="acts">${chip('🔒 Requires: T3 Lecture Notes opened','c-mut')}</div></div>
      <div class="sec-item"><div class="tic" style="background:var(--warn-l)">⚠️</div>
        <div><b>Laboratory Exercise 2 — Variables & Types</b><small>CC-COMPROG11 · overdue Jul 1</small></div>
        <div class="acts">${chip('Missing','c-bad')}</div></div>
    </div>
    <div class="card"><h3>What to review first <span class="ai-badge">PRESCRIPTIVE</span></h3>
      ${ge.mastery.slice(0,3).map(t=>`<div class="topic-row"><div class="tn">${t.t} <small style="color:var(--mut)">(${t.w})</small></div>
      <div class="bar"><i style="width:${t.m}%;background:${t.m<60?'var(--bad)':t.m<75?'var(--warn)':'var(--ok)'}"></i></div><div class="pv">${t.m}%</div></div>`).join('')}
      <button class="btn btn-o btn-s" onclick="location.href='insights.html'">Open My Progress Visualization →</button>
    </div>
  </div>`;
}
/* ---- My Subjects: subject cards → page modal with instructor's syllabus & materials ---- */
function stuSubjects(){
  view().innerHTML=`
  <div class="note" style="margin-top:0">Start from an enrolled subject — a page opens with the <b>syllabus your instructor posted</b>; every material opens in a popover (no dropdowns).</div>
  ${DB.stuSubjects.map((s,i)=>`
  <div class="card click subj-card" onclick="subjectSheet(${i})">
    <div class="sc-ic">📗</div>
    <div style="flex:1"><b>${s.code} — ${s.title}</b><small>${s.instr} · Section ${s.section} <i>(one section per subject)</i></small>
      <div class="bar" style="margin-top:7px;max-width:320px"><i style="width:${s.prog}%;background:linear-gradient(90deg,#4E6BFF,#3D5AF1)"></i></div></div>
    ${s.missing.length?chip(s.missing.length+' missing','c-bad'):chip('On track','c-ok')}
    <span class="chip c-mut">Open →</span>
  </div>`).join('')}`;
}
function subjectSheet(i){
  const s=DB.stuSubjects[i]; const sy=DB.syllabi[s.code]; const packs=DB.packs[s.code]||{};
  openSheet('📗', s.code+' — '+s.title, `${s.instr} · Section ${s.section} · syllabus as posted by your instructor`, `
   ${s.missing.length?`<div class="note-warn note" style="margin-top:0"><b>Missing:</b> ${s.missing.map(m=>m.label+' ('+m.due+')').join('; ')}</div>`:''}
   ${sy.topics.filter(t=>!t.title.includes('EXAM')).map(t=>{
     const p=packs[t.no]; const pub=topicHasGenPub(p)?p.secs.filter(x=>x.pub):[];
     return `<div class="week"><div class="week-h" onclick="this.nextElementSibling.classList.toggle('hidden')">
       <div class="wno">T${t.no}</div>
       <div style="flex:1"><b>${t.title}</b><small>${t.weeks} · ${topicSubtopics(t).map(x=>x.n).join(' · ')}</small></div>
       ${pub.length?chip(pub.length+' materials','c-ok'):chip('Not yet posted','c-mut')}
     </div>
     <div class="week-b ${t.no>1?'hidden':''}">
       ${pub.length? pub.map((m,mi)=>`<div class="sec-item click" onclick="matPop(${i},${t.no},${p.secs.indexOf(m)},event)">
          <div class="tic" style="background:${TICON[m.t][1]}">${TICON[m.t][0]}</div>
          <div><b>${m.label}</b><small>${m.sub}</small></div>
          <div class="acts"><span class="chip c-mut">Open ▾</span></div></div>`).join('')
       :'<div class="lock-note">Your instructor has not posted materials for this topic yet.</div>'}
     </div></div>`;}).join('')}`);
}
function matPop(si,tno,mi,evt){
  const s=DB.stuSubjects[si]; const m=DB.packs[s.code][tno].secs[mi];
  const kind={notes:'Lecture notes',ppt:'Presentation',quiz:'Quiz',act:'Activity guide',file:'File'}[m.t]||'Material';
  openPop(`<h4>${TICON[m.t][0]} ${m.label}</h4>
  <div class="kv"><b>Type</b>${kind} · ${m.sub}</div>
  <div class="kv"><b>Preview</b><span style="white-space:pre-line;font-size:12px;color:#3A4160">${(m.preview||'—').slice(0,240)}${m.preview&&m.preview.length>240?'…':''}</span></div>
  <div class="pop-acts">
    ${m.t==='quiz'?`<button class="btn btn-p btn-s" onclick="closePop();preQuiz('${m.quizId}')">▶ Start quiz (secure mode)</button>`
     :(m.url||m.html)?`<button class="btn btn-p btn-s" onclick="openSection(DB.packs['${s.code}'][${tno}].secs[${mi}])">📖 Open ${kind.toLowerCase()}</button>`
     :`<button class="btn btn-p btn-s" onclick="closePop();matReader('${s.code}',${tno},${mi})">📖 Open ${kind.toLowerCase()}</button>`}
    ${m.t==='ppt'?`<button class="btn btn-o btn-s" onclick="closePop();toast('Prototype: downloads the PPTX file.')">⬇ Download PPTX</button>`:''}
    ${m.t==='file'?`<button class="btn btn-o btn-s" onclick="closePop();toast('Prototype: downloads the file.')">⬇ Download</button>`:''}
  </div>`,evt,420);
}
function matReader(code,tno,mi){
  const m=DB.packs[code][tno].secs[mi];
  openModal(`<h3>${TICON[m.t][0]} ${m.label}</h3>
  <div class="lock-note" style="margin-bottom:10px">${m.sub} · reading view (prototype)</div>
  <div class="file-view" style="white-space:pre-line">${m.preview||'Content preview'}</div>
  <div style="display:flex;justify-content:space-between;margin-top:14px">
    <span class="lock-note" style="align-self:center">Opening this material is recorded (unlocks activities gated on it).</span>
    <button class="btn btn-p" onclick="closeModal();toast('Marked as opened — prerequisites updated.')">Done</button></div>`);
}
/* ---- My Scores: subject cards → page modal → record popovers ---- */
function stuScores(){
  view().innerHTML=`
  <div class="note" style="margin-top:0">Choose a subject — a page opens listing every graded activity recorded in EduPulse for ${DB.config.sem}, AY ${DB.config.ay}; tap a record for its detail and prescriptive analysis.</div>
  ${DB.stuSubjects.map((s,i)=>`
  <div class="card click subj-card" onclick="scoresSheet(${i})">
    <div class="sc-ic">🧾</div>
    <div style="flex:1"><b>${s.code} — ${s.title}</b><small>${s.records.length} recorded items · ${s.instr}</small></div>
    <span class="chip c-mut">Open →</span>
  </div>`).join('')}`;
}
function scoresSheet(i){
  const s=DB.stuSubjects[i];
  let termsHtml='';
  if(s.code==='GE EELECT-IT'){
    const me=DB.students['BSIT 1A'][4];
    const o=studentOverall(me);
    termsHtml=`<div class="kpi"><div class="k"><b>${s.records.length}</b><small>Recorded activities</small></div>
      <div class="k"><b>${o.tot} / ${o.max}</b><small>Total score</small></div>
      <div class="k" style="border-color:${o.pct>=75?'var(--ok)':'var(--bad)'}"><b style="color:${o.pct>=75?'var(--ok)':'var(--bad)'}">${o.pct.toFixed(1)}%</b><small>Running average</small></div></div>`;
  } else {
    termsHtml=`<div class="kpi"><div class="k"><b>${s.records.length}</b><small>Recorded activities</small></div><div class="k"><b>88.4%</b><small>Running average</small></div></div>`;
  }
  openSheet('🧾', s.code+' — My Scores', 'Transparent record — tap any item for detail & prescriptive analysis', `
   ${termsHtml}
   ${s.missing.length?`<div class="note-warn note"><b>Missing:</b> ${s.missing.map(m=>m.label+' ('+m.due+')').join('; ')} — missing items count as 0 until submitted.</div>`:''}
   ${s.records.map((r,ri)=>`<div class="sec-item click" onclick="recordPop(${i},${ri},event)">
     <div class="tic" style="background:${r.score/r.max>=.75?'var(--ok-l)':'var(--warn-l)'}">${r.comp.startsWith('Exam')?'🎓':'🧾'}</div>
     <div><b>${r.label}</b><small>${r.comp} · recorded ${r.auto?'automatically ⚡':'by instructor'}</small></div>
     <div class="acts">${chip(r.score+' / '+r.max, r.score/r.max>=.75?'c-ok':'c-warn')}<span class="chip c-mut">Detail ▾</span></div></div>`).join('')}
   <div class="note">Every score links to the graded activity — reference these records when consulting ${s.instr} about a grade.</div>`);
}
function recordPop(si,ri,evt){
  const s=DB.stuSubjects[si]; const r=s.records[ri];
  openPop(`<h4>${r.label} ${chip(r.score+' / '+r.max, r.score/r.max>=.75?'c-ok':'c-warn')}</h4>
  <div class="kv"><b>Component</b>${r.comp} · ${(r.score/r.max*100).toFixed(0)}% · recorded ${r.auto?'automatically on submission ⚡':'by '+s.instr}</div>
  <div class="kv"><b>Prescriptive analysis</b>${r.presc}</div>
  <div class="pop-acts">
    ${r.reviewId?`<button class="btn btn-p btn-s" onclick="closePop();closeSheet();reviewSheet(${si},'${r.reviewId}')">🔍 Review my answers</button>`:`<button class="btn btn-o btn-s" onclick="closePop();toast('Prototype: opens your graded submission.')">View graded work</button>`}
    <button class="btn btn-o btn-s" onclick="closePop();toast('Consultation note saved — bring this record to your instructor.')">Flag for consultation</button>
  </div>`,evt,420);
}
/* ---- Quiz Reviews: subject-rooted ---- */
function stuReviews(){
  view().innerHTML=`
  <div class="note" style="margin-top:0">Rooted per subject — open one to see the quizzes you answered, then review each item with prescriptive analysis.</div>
  ${DB.stuSubjects.map((s,i)=>`
  <div class="card click subj-card" onclick="reviewListSheet(${i})">
    <div class="sc-ic">🔍</div>
    <div style="flex:1"><b>${s.code} — ${s.title}</b><small>${s.reviews.length} released quiz review(s)</small></div>
    <span class="chip c-mut">Open →</span>
  </div>`).join('')}`;
}
function reviewListSheet(i){
  const s=DB.stuSubjects[i];
  openSheet('🔍', s.code+' — Quiz Reviews', 'Released by your instructor', `
  ${s.reviews.map(r=>{const q=DB.quizzes[r.quizId];return `
   <div class="sec-item click" onclick="reviewSheet(${i},'${r.quizId}')">
     <div class="tic" style="background:var(--ok-l)">✅</div>
     <div><b>${q.title}</b><small>${q.course} · answered · released for review</small></div>
     <div class="acts">${chip('Score: '+r.score+' / '+r.max,'c-teal')}<span class="chip c-mut">Review →</span></div></div>`;}).join('')}
  ${s.reviews.length?'':'<div class="lock-note">No released reviews yet.</div>'}`);
}
function reviewSheet(si,qid){
  const s=DB.stuSubjects[si]; const rv=s.reviews.find(x=>x.quizId===qid); const q=DB.quizzes[qid];
  openSheet('🔍', q.title+' — Answer Review', `Score ${rv.score} / ${rv.max} · your answer vs. correct answer, with prescriptive analysis per item`, `
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <button class="btn btn-o btn-s" onclick="reviewListSheet(${si})">← Back to ${s.code} reviews</button>
    <button class="btn btn-ai btn-s" onclick="practiceModal('${qid}')">🔁 Retake as practice — rephrased items · NOT graded</button>
  </div>
  ${q.items.map((it,i2)=>{const mine=rv.myAns[i2]; const answered=mine!==undefined&&mine!==null; const ok=answered&&mine===it.ans; return `
    <div class="rv-item">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><b style="font-size:13.5px">Q${i2+1}. ${it.stem}</b>${!answered?chip('Unanswered','c-mut'):ok?chip('Correct','c-ok'):chip('Incorrect','c-bad')}</div>
      ${it.opts.map((o,oi)=>`<div class="rv-opt ${oi===it.ans?'correct':''} ${answered&&oi===mine&&!ok?'wrong':''}">${String.fromCharCode(65+oi)}. ${o}${oi===it.ans?' ✓':''}${answered&&oi===mine&&!ok?' — your answer':''}</div>`).join('')}
      <div class="note" style="margin-top:8px;margin-bottom:0"><b>Why:</b> ${it.exp} ${chip(it.topic,'c-mut')}</div>
      <div class="note-ai note" style="margin-bottom:0"><b>Prescription:</b> ${ok?'Concept mastered — no action needed.':!answered?`This item was left unanswered — review “${it.topic}” and answer it in a practice retake.`:`Review “${it.topic}” in the topic notes and slides, then retake the practice items for this concept.`}</div>
    </div>`;}).join('')}`);
}
/* ---- My Progress Visualization (descriptive · predictive · prescriptive) ---- */
function stuInsights(){
  view().innerHTML=`
  <div class="grid g3">
    <div class="card"><h3>Descriptive — where I am</h3>
      <div class="kpi" style="margin-top:0">
        <div class="k"><b>78%</b><small>Overall CS</small></div>
        <div class="k"><b>86%</b><small>Submission rate</small></div>
        <div class="k"><b>1</b><small>Missing item</small></div></div>
      ${DB.stuSubjects.map(s=>`<div class="topic-row"><div class="tn">${s.code}</div><div class="bar"><i style="width:${s.prog}%;background:var(--pri)"></i></div><div class="pv">${s.prog}%</div></div>`).join('')}
      <div class="lock-note">Progress = published items completed, all documents, forms, quizzes, and answers counted.</div>
    </div>
    <div class="card"><h3>Predictive — where I'm heading <span class="ai-badge">PROJECTION</span></h3>
      <div class="sec-item"><div class="tic" style="background:var(--ok-l)">📈</div>
        <div><b>GE EELECT-IT</b><small>Projected running average ≈ 80% if current pace holds</small></div><div class="acts">${chip('Low risk','c-ok')}</div></div>
      <div class="sec-item"><div class="tic" style="background:var(--warn-l)">📉</div>
        <div><b>CC-COMPROG11</b><small>Projected running average ≈ 76% — the missing lab pulls the projection down 4 pts</small></div><div class="acts">${chip('Watch','c-warn')}</div></div>
      <div class="lock-note">Projections use your recorded scores + the remaining planned activities; they update on every new record.</div>
    </div>
    <div class="card"><h3>Prescriptive — what to do next</h3>
      <div class="note-warn note" style="margin-top:0"><b>1.</b> Submit the missing <b>Lab Exercise 2</b> (CC-COMPROG11, overdue Jul 1) — largest single gain available.</div>
      <div class="note"><b>2.</b> Review <b>Network devices & topologies</b> (GE T4, mastery 45%) before the posted recap.</div>
      <div class="note"><b>3.</b> Retake practice items on <b>system vs application software</b> (GE T3, 58%).</div>
    </div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Practice growth — ungraded retakes <span class="ai-badge">PERSONAL ONLY</span></h3>
    ${DB.growth.length?DB.growth.map(g=>`<div class="sec-item">
      <div class="tic" style="background:var(--ai-l)">🔁</div>
      <div><b>${g.quiz}</b><small>${g.subject} · graded attempt: ${g.base} → best practice: <b>${g.best}</b> · ${g.tries} practice retake(s)</small></div>
      <div class="acts">${chip('Growth ↑','c-ai')}</div></div>`).join(''):'<div class="lock-note">No practice retakes yet — use “Retake as practice” in Quiz Reviews or the Practice buttons below.</div>'}
    <div class="lock-note">Practice retakes use rephrased versions of the same items, are never recorded to the grading sheet, and only feed this growth log to strengthen comprehension and critical thinking.</div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Topic mastery — all answered items <span class="ai-badge">BASED ON YOUR RESULTS</span></h3>
    ${DB.stuSubjects.map(s=>`
     <div style="font-weight:700;font-size:12.5px;color:var(--navy);margin:10px 0 6px">${s.code}</div>
     ${s.mastery.map(t=>`<div style="margin-bottom:10px">
      <div class="topic-row" style="margin-bottom:3px"><div class="tn">${t.t} <small style="color:var(--mut)">(${t.w})</small></div>
      <div class="bar"><i style="width:${t.m}%;background:${t.m<60?'var(--bad)':t.m<75?'var(--warn)':'var(--ok)'}"></i></div><div class="pv">${t.m}%</div></div>
      ${t.m<75?`<div style="display:flex;gap:6px;padding-left:2px">
        <button class="btn btn-o btn-s" onclick="toast('Opening ${t.w} notes…')">📄 Notes</button>
        <button class="btn btn-o btn-s" onclick="toast('Opening ${t.w} slides…')">📽️ Slides</button>
        <button class="btn btn-o btn-s" onclick="practiceFromTopic('${s.code}','${t.w}')">✅ Practice (ungraded)</button></div>`:''}
     </div>`).join('')}`).join('')}
  </div>`;
}
