/* ============================================================
   EduPulse — student.js
   Dashboard, My Subjects, My Scores, Quiz Reviews, My Performance.
   Secure quiz start/practice flows live in quiz-engine.js.
============================================================ */
function stuDash(){
  const first=DB.stuSubjects[0];
  const missTotal=DB.stuSubjects.reduce((n,s)=>n+s.missing.length,0);
  const missSubj=(DB.stuSubjects.find(s=>s.missing.length)||{}).code||'';
  view().innerHTML=`
  <div class="grid g4">
    <div class="card stat"><div class="num">${DB.stuSubjects.length}</div><div class="lbl">Enrolled subjects (${DB.config.sem})</div></div>
    <div class="card stat"><div class="num">1</div><div class="lbl">Quiz open — due today 5 PM</div></div>
    <div class="card stat"><div class="num">82%</div><div class="lbl">Running average to date</div></div>
    <div class="card stat"><div class="num" style="color:var(--warn)">${missTotal}</div><div class="lbl">Missing activity${missTotal===1?'':'s'}${missSubj?' ('+missSubj+')':''}</div></div>
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><h3>Open & locked activities</h3>
      <div class="sec-item click" onclick="matPop(0,1,2,event)">
        <div class="tic" style="background:var(--ok-l)">✅</div>
        <div><b>Short Quiz — Networking Fundamentals</b><small>IT-NET31 · T1 · 15 min · MCQ · hidden-choice reveal</small></div>
        <div class="acts"><span class="chip c-ok">Open</span><span class="chip c-mut">Details ▾</span></div></div>
      <div class="sec-item locked"><div class="tic" style="background:var(--ok-l)">✅</div>
        <div><b>Quiz — IP Addressing & Subnetting</b><small>IT-NET31 · T2</small></div>
        <div class="acts">${chip('🔒 Requires: T2 Lecture Notes opened','c-mut')}</div></div>
      ${first.missing.length?`<div class="sec-item"><div class="tic" style="background:var(--warn-l)">⚠️</div>
        <div><b>${first.missing[0].label}</b><small>${first.code} · ${first.missing[0].due}</small></div>
        <div class="acts">${chip('Missing','c-bad')}</div></div>`:''}
    </div>
    <div class="card"><h3>What to review first <span class="ai-badge">SCORE-BASED</span></h3>
      ${first.mastery.slice().sort((a,b)=>a.m-b.m).slice(0,3).map(t=>`<div class="topic-row"><div class="tn">${t.t} <small style="color:var(--mut)">(${t.w})</small></div>
      <div class="bar"><i style="width:${t.m}%;background:${t.m<60?'var(--bad)':t.m<75?'var(--warn)':'var(--ok)'}"></i></div><div class="pv">${t.m}%</div></div>`).join('')}
      <button class="btn btn-o btn-s" onclick="location.href='insights.html'">Open My Performance →</button>
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
function matCtx(si,tno){
  const s=DB.stuSubjects[si];
  return {courseCode:s.code, courseTitle:s.title, topicNo:tno, topicTitle:DB.syllabi[s.code].topics.find(t=>t.no===tno).title};
}
function matPop(si,tno,mi,evt){
  const s=DB.stuSubjects[si]; const m=DB.packs[s.code][tno].secs[mi];
  const kind={doc:'Document',ppt:'Presentation',quiz:'Quiz',file:'File'}[m.t]||'Material';
  const openable=m.t==='doc'||m.t==='ppt'||m.t==='file';
  const openLabel=m.t==='ppt'?'📽️ Open presentation (.pptx)':m.format==='pdf'?'📄 Open document (.pdf)':'📄 Open document (.docx)';
  openPop(`<h4>${TICON[m.t][0]} ${m.label}</h4>
  <div class="kv"><b>Type</b>${kind} · ${m.sub}</div>
  <div class="kv"><b>Preview</b><span style="white-space:pre-line;font-size:12px;color:#3A4160">${(m.preview||'—').slice(0,240)}${m.preview&&m.preview.length>240?'…':''}</span></div>
  <div class="pop-acts">
    ${m.t==='quiz'?`<button class="btn btn-p btn-s" onclick="closePop();preQuiz('${m.quizId}')">▶ Start quiz (secure mode)</button>`
     :openable?`<button class="btn btn-p btn-s" onclick="openSection(DB.packs['${s.code}'][${tno}].secs[${mi}],matCtx(${si},${tno}),event)">${openLabel}</button>`
     :`<button class="btn btn-p btn-s" onclick="closePop();matReader('${s.code}',${tno},${mi})">📖 Open ${kind.toLowerCase()}</button>`}
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
  <div class="note" style="margin-top:0">Choose a subject — a page opens listing every activity recorded in EduPulse for ${DB.config.sem}, AY ${DB.config.ay}, each marked <b>Completed</b> or <b>Missed</b>; tap a record for its detail and score-based suggestions.</div>
  ${DB.stuSubjects.map((s,i)=>`
  <div class="card click subj-card" onclick="scoresSheet(${i})">
    <div class="sc-ic">🧾</div>
    <div style="flex:1"><b>${s.code} — ${s.title}</b><small>${s.records.length} recorded items · ${s.instr}</small></div>
    <span class="chip c-mut">Open →</span>
  </div>`).join('')}`;
}
/* My row of the EduPulse scoring sheet — same table shape and same
   gradeRows/gradedActivities/actStats/actVal/actMissed/studentOverall
   helpers the instructor's Score Visualization uses (core.js), so the two
   always agree; only MY_STUDENT_ID's row is shown, Hi/Lo/Class-average stay
   as class-wide (non-identifying) reference figures. */
function myScoreTable(code,sec){
  const acts=gradedActivities();
  const allRows=gradeRows(code,sec);
  const me=allRows.find(s=>s.id===MY_STUDENT_ID);
  if(!me) return '<div class="lock-note">No recorded row found for your account in this section yet.</div>';
  const o=studentOverall(me);
  const stats=acts.map(a=>actStats(allRows,a));
  const terms=[]; acts.forEach(a=>{const last=terms[terms.length-1]; if(last&&last.term===a.term) last.span++; else terms.push({term:a.term,span:1});});
  const cell=(a)=>{
    if(actMissed(me,a)) return `<td>${chip('Missed','c-bad')}</td>`;
    const auto=a.key==='cs'&&a.i===0;
    return `<td><span title="${auto?'Auto-recorded from a submitted quiz':'Recorded from the posted activity'}">${actVal(me,a)}</span></td>`;
  };
  return `<div class="gr-tb"><table>
    <tr><th></th><th class="nm"></th>${terms.map(t=>`<th colspan="${t.span}" style="text-align:center;border-bottom:2px solid var(--pri)">${t.term}</th>`).join('')}<th></th><th></th></tr>
    <tr><th>Student ID</th><th class="nm">Name</th>${acts.map(a=>`<th>${a.k}<br><small>/${a.max}</small></th>`).join('')}<th>Total<br><small>/${acts.reduce((t,a)=>t+a.max,0)}</small></th><th>%</th></tr>
    <tr><td>${me.id}</td><td style="text-align:left">${me.name} ${chip('You','c-teal')}</td>
      ${acts.map(a=>cell(a)).join('')}
      <td><b>${o.tot}</b></td><td><b style="color:${o.pct<75?'var(--bad)':'var(--navy)'}">${o.pct.toFixed(1)}%</b></td></tr>
    <tr style="border-top:2px solid var(--line)"><td></td><td style="text-align:left"><b>Highest score</b> <span class="chip c-mut">class</span></td>${stats.map(st=>`<td><b style="color:var(--ok)">${st.hi}</b></td>`).join('')}<td></td><td></td></tr>
    <tr><td></td><td style="text-align:left"><b>Lowest score</b> <span class="chip c-mut">class</span></td>${stats.map(st=>`<td><b style="color:var(--bad)">${st.lo}</b></td>`).join('')}<td></td><td></td></tr>
    <tr><td></td><td style="text-align:left"><b>Class average</b></td>${stats.map(st=>`<td><b>${st.avg.toFixed(1)}</b></td>`).join('')}<td></td><td></td></tr>
  </table></div>`;
}
function scoresSheet(i){
  const s=DB.stuSubjects[i];
  const hasSheet=gradeSections(s.code).includes(s.section);
  openSheet('🧾', s.code+' — My Scores', 'EduPulse scoring sheet — your row only, read-only', `
   ${hasSheet?myScoreTable(s.code,s.section):'<div class="lock-note">No recorded activities in the scoring sheet for this subject yet.</div>'}
   <h3 style="font-size:14px;margin:18px 0 8px;color:var(--navy)">Per-activity detail & score-based suggestions</h3>
   ${s.records.map((r,ri)=>`<div class="sec-item click" onclick="recordPop(${i},${ri},event)">
     <div class="tic" style="background:${r.score/r.max>=.75?'var(--ok-l)':'var(--warn-l)'}">${r.comp.startsWith('Exam')?'🎓':'🧾'}</div>
     <div><b>${r.label}</b><small>${r.comp} · recorded ${r.auto?'automatically':'by instructor'}</small></div>
     <div class="acts"><span class="chip c-mut">Detail ▾</span></div></div>`).join('')}
   ${s.missing.map(m=>`<div class="sec-item">
     <div class="tic" style="background:var(--bad-l,var(--warn-l))">⚠️</div>
     <div><b>${m.label}</b><small>due ${m.due} · not answered within the timeframe</small></div>
     <div class="acts">${chip('Missed','c-bad')}<span class="chip c-mut">0 until submitted</span></div></div>`).join('')}
   <div class="note">The table above is your row in the EduPulse scoring sheet — identical structure and Hi/Lo/class-average context as your instructor's Score Visualization, with only your own record visible. Each activity below adds a score-based suggestion — reference these when consulting ${s.instr} about a grade.</div>`);
}
function recordPop(si,ri,evt){
  const s=DB.stuSubjects[si]; const r=s.records[ri];
  openPop(`<h4>${r.label} ${chip(r.score+' / '+r.max, r.score/r.max>=.75?'c-ok':'c-warn')}</h4>
  <div class="kv"><b>Activity · status</b>${r.comp} · ${(r.score/r.max*100).toFixed(0)}% · ${chip('Completed','c-ok')} · recorded ${r.auto?'automatically on submission':'by '+s.instr}</div>
  <div class="kv"><b>Score-based suggestion</b>${r.presc}</div>
  <div class="pop-acts">
    ${r.reviewId?`<button class="btn btn-p btn-s" onclick="closePop();closeSheet();reviewSheet(${si},'${r.reviewId}')">🔍 Review my answers</button>`:`<button class="btn btn-o btn-s" onclick="closePop();toast('Prototype: opens your graded submission.')">View graded work</button>`}
    <button class="btn btn-o btn-s" onclick="closePop();toast('Consultation note saved — bring this record to your instructor.')">Flag for consultation</button>
  </div>`,evt,420);
}
/* ---- Quiz Reviews: subject-rooted ---- */
function stuReviews(){
  view().innerHTML=`
  <div class="note" style="margin-top:0">Rooted per subject — open one to see the quizzes you answered, each with its score visualization and practice-retake growth, then review individual items with a score-based suggestion.</div>
  ${DB.stuSubjects.map((s,i)=>{
    const practiced=DB.growth.filter(g=>g.subject===s.code).length;
    return `<div class="card click subj-card" onclick="reviewListSheet(${i})">
    <div class="sc-ic">🔍</div>
    <div style="flex:1"><b>${s.code} — ${s.title}</b><small>${s.reviews.length} released quiz review(s)${practiced?' · '+practiced+' with practice retakes':''}</small></div>
    <span class="chip c-mut">Open →</span>
  </div>`;}).join('')}`;
}
/* Per-subject page: one row per released quiz, each with a real score
   visualization (graded vs. best ungraded-practice attempt, when practiced)
   — a simple two-bar comparison built from DB.growth, personal-only and
   never touching the instructor's scoring sheet. Tapping a row still drills
   into the existing item-by-item answer review (reviewSheet). */
function reviewListSheet(i){
  const s=DB.stuSubjects[i];
  openSheet('🔍', s.code+' — Quiz Reviews', 'Released by your instructor · score visualization + practice growth per quiz', `
  ${s.reviews.length?s.reviews.map(r=>{
    const q=DB.quizzes[r.quizId];
    const g=DB.growth.find(x=>x.quizId===r.quizId);
    const gradedPct=Math.round(r.score/r.max*100);
    return `<div class="sec-item click" style="flex-wrap:wrap" onclick="reviewSheet(${i},'${r.quizId}')">
     <div class="tic" style="background:var(--ok-l)">✅</div>
     <div style="min-width:220px"><b>${q.title}</b><small>${q.course} · answered · released for review</small></div>
     <div class="acts">${chip('Score: '+r.score+'/'+r.max+' ('+gradedPct+'%)','c-teal')}<span class="chip c-mut">Review →</span></div>
     ${g?`<div style="flex-basis:100%;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">
       <div class="topic-row" style="margin-bottom:6px"><div class="tn" style="width:110px;font-size:11px">Graded attempt</div><div class="bar"><i style="width:${gradedPct}%;background:var(--pri)"></i></div><div class="pv">${gradedPct}%</div></div>
       ${g.attempts.map((a,ai)=>{
         const pct=Math.round(a.score/a.max*100);
         const prevPct=ai===0?gradedPct:Math.round(g.attempts[ai-1].score/g.attempts[ai-1].max*100);
         const delta=pct-prevPct;
         const deltaChip=delta>0?chip('+'+delta+'% vs previous','c-ok'):delta<0?chip(delta+'% vs previous','c-bad'):chip('±0% vs previous','c-mut');
         return `<div class="topic-row" style="margin-bottom:4px"><div class="tn" style="width:110px;font-size:11px">Practice ${ai+1}</div><div class="bar"><i style="width:${pct}%;background:var(--ai)"></i></div><div class="pv">${pct}%</div></div>
         <div style="display:flex;align-items:center;gap:5px;margin:0 0 10px 118px">
           ${a.correct.map(c=>`<span title="${c?'Correct':'Incorrect'}" style="width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${c?'var(--ok)':'var(--bad)'}"></span>`).join('')}
           ${deltaChip}
         </div>`;
       }).join('')}
       <div class="lock-note" style="margin-top:2px">${g.attempts.length} ungraded practice retake(s) — items reshuffled and rephrased on every attempt, personal log only, never recorded to the scoring sheet.</div>
     </div>`:''}
    </div>`;}).join(''):'<div class="lock-note">No released reviews yet.</div>'}`);
}
function reviewSheet(si,qid){
  const s=DB.stuSubjects[si]; const rv=s.reviews.find(x=>x.quizId===qid); const q=DB.quizzes[qid];
  openSheet('🔍', q.title+' — Answer Review', `Score ${rv.score} / ${rv.max} · your answer vs. correct answer, with a score-based suggestion per item`, `
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <button class="btn btn-o btn-s" onclick="reviewListSheet(${si})">← Back to ${s.code} reviews</button>
    <button class="btn btn-ai btn-s" onclick="practiceModal('${qid}')">🔁 Retake as practice — rephrased items · NOT graded</button>
  </div>
  ${q.items.map((it,i2)=>{const mine=rv.myAns[i2]; const answered=mine!==undefined&&mine!==null; const ok=answered&&mine===it.ans; return `
    <div class="rv-item">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><b style="font-size:13.5px">Q${i2+1}. ${it.stem}</b>${!answered?chip('Unanswered','c-mut'):ok?chip('Correct','c-ok'):chip('Incorrect','c-bad')}</div>
      ${it.opts.map((o,oi)=>`<div class="rv-opt ${oi===it.ans?'correct':''} ${answered&&oi===mine&&!ok?'wrong':''}">${String.fromCharCode(65+oi)}. ${o}${oi===it.ans?' ✓':''}${answered&&oi===mine&&!ok?' — your answer':''}</div>`).join('')}
      <div class="note" style="margin-top:8px;margin-bottom:0"><b>Why:</b> ${it.exp} ${chip(it.topic,'c-mut')}</div>
      <div class="note-ai note" style="margin-bottom:0"><b>Suggestion:</b> ${ok?'Concept mastered — no action needed.':!answered?`This item was left unanswered — review “${it.topic}” and answer it in a practice retake.`:`Review “${it.topic}” in the topic notes and slides, then retake the practice items for this concept.`}</div>
    </div>`;}).join('')}`);
}
/* ---- My Performance (performance summary · score-based projection · score-based suggestions) ---- */
function stuInsights(){
  view().innerHTML=`
  <div class="grid g3">
    <div class="card"><h3>Performance summary — where I am</h3>
      <div class="kpi" style="margin-top:0">
        <div class="k"><b>78%</b><small>Overall average</small></div>
        <div class="k"><b>86%</b><small>Submission rate</small></div>
        <div class="k"><b>1</b><small>Missed item</small></div></div>
      ${DB.stuSubjects.map(s=>`<div class="topic-row"><div class="tn">${s.code}</div><div class="bar"><i style="width:${s.prog}%;background:var(--pri)"></i></div><div class="pv">${s.prog}%</div></div>`).join('')}
      <div class="lock-note">Progress = published items completed, all documents, forms, quizzes, and answers counted.</div>
    </div>
    <div class="card"><h3>Score-based projection — where I'm heading <span class="ai-badge">PROJECTION</span></h3>
      <div class="sec-item"><div class="tic" style="background:var(--ok-l)">📈</div>
        <div><b>IT-SEC31</b><small>Projected running average ≈ 87% if current pace holds</small></div><div class="acts">${chip('On track','c-ok')}</div></div>
      <div class="sec-item"><div class="tic" style="background:var(--warn-l)">📉</div>
        <div><b>IT-NET31</b><small>Projected running average ≈ 79% — the missing T3 topology activity pulls the projection down a few points</small></div><div class="acts">${chip('Watch','c-warn')}</div></div>
      <div class="lock-note">Projections are <b>score-based only</b> — computed from your recorded scores plus the remaining planned activities; they update on every new record.</div>
    </div>
    <div class="card"><h3>Score-based suggestions — what to review</h3>
      <div class="note-warn note" style="margin-top:0"><b>1.</b> Submit the missing <b>Topology-building activity</b> (IT-NET31, T3) — largest single gain available.</div>
      <div class="note"><b>2.</b> Review <b>Requirements</b> (IT-SWENG31 T2, mastery 64%) before the next posted activity.</div>
      <div class="note"><b>3.</b> Retake practice items on <b>Subnetting</b> (IT-NET31 T2, 66%).</div>
    </div>
  </div>
  <div class="card" style="margin-top:18px"><h3>Topic mastery <span class="ai-badge">BASED ON YOUR RESULTS</span></h3>
    <div class="lock-note" style="margin-bottom:12px">Each bar = % of your answered quiz items on that topic that were correct, across all attempts so far. Topics below 75% are flagged for an ungraded practice retake. <a href="#" onclick="location.href='reviews.html';return false" style="color:var(--ai);font-weight:700">See per-quiz scores & practice growth in Quiz Reviews →</a></div>
    ${DB.stuSubjects.map((s,si)=>`
     <div style="${si?'margin-top:14px;padding-top:14px;border-top:1px solid var(--line)':''}">
     <div class="item-grp-h">${s.code} — ${s.title}</div>
     ${s.mastery.map(t=>`<div style="margin-bottom:10px">
      <div class="topic-row" style="margin-bottom:0"><div class="tn">${t.t} <small style="color:var(--mut)">(${t.w})</small></div>
      <div class="bar"><i style="width:${t.m}%;background:${t.m<60?'var(--bad)':t.m<75?'var(--warn)':'var(--ok)'}"></i></div><div class="pv">${t.m}%</div></div>
     </div>`).join('')}
     </div>`).join('')}
  </div>`;
}
