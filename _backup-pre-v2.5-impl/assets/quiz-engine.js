/* ============================================================
   EduPulse — quiz-engine.js
   Secure Answering Environment + ungraded practice retakes.
   Student-only; shell markup for #secureEnv/#violOverlay is
   injected by core.js's shellHtml() on every page.
============================================================ */
let SE={q:null,idx:0,ans:{},viol:0,left:0,timer:null,active:false,locked:new Set(),restrict:DEFAULT_RESTRICT};
function preQuiz(qid){
  const q=DB.quizzes[qid];
  const r={...DEFAULT_RESTRICT, ...(q.restrict||{})};
  const policyLine = r.policy==='deduct'
    ? `<b>Violations never end your attempt</b> — each one deducts ${r.deductPerViolation} point(s) from your raw score instead.`
    : r.policy==='lock'
    ? `<b>Each violation locks whichever item you were viewing</b> — its answer (or blank) becomes permanent, and you continue with the remaining items.`
    : `<b>On violation ${r.maxViol} your attempt is automatically submitted</b> and flagged to your instructor.`;
  openModal(`<h3>Before you start — ${q.title}</h3>
  <div class="frm">
    <div class="note-warn note" style="margin:0">
      <b>Secure answering rules (shown before every attempt):</b><br>
      • The quiz opens in a locked full-screen environment. You cannot go back or exit until you submit.<br>
      • A ${q.mins}-minute countdown starts immediately; expiry always auto-submits the whole attempt.<br>
      • <b>Each answer choice is hidden individually</b> — a choice becomes readable only while your cursor hovers it. Text cannot be selected or copied.<br>
      • Switching tabs/windows or leaving the screen records a <b>violation</b> (allowed: ${r.maxViol}).<br>
      • ${policyLine}<br>
      • Multiple choice only; you can move between items and change answers before submitting (unless an item has been locked).</div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Not yet</button>
    <button class="btn btn-p" onclick="closeModal();closeSheet();startQuiz('${qid}')">I understand — Start attempt</button></div>
  </div>`);
}
function startQuiz(qid,practice){
  const q=DB.quizzes[qid];
  const restrict={...DEFAULT_RESTRICT, ...(q.restrict||{})};
  SE={qid,q,idx:0,ans:{},viol:0,left:q.mins*60,timer:null,active:true,practice:!!practice,locked:new Set(),restrict};
  $('secureEnv').classList.remove('hidden');
  document.body.style.overflow='hidden';
  $('seTitle').textContent=(SE.practice?'🔁 PRACTICE — ':'')+SE.q.title;
  $('seMeta').textContent=SE.q.course+' · '+SE.q.items.length+' items · MCQ'+(SE.practice?' · rephrased retake — NOT graded, personal growth log only':'');
  $('seViol').innerHTML='<i></i>'.repeat(restrict.maxViol);
  if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{});
  history.pushState({se:1},'');
  SE.timer=setInterval(()=>{SE.left--;renderTimer();if(SE.left<=0)endQuiz('⏱ Time expired — auto-submitted');},1000);
  renderTimer(); renderQ();
}
function renderTimer(){
  const m=Math.floor(SE.left/60), s=SE.left%60;
  const el=$('seTimer'); el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.classList.toggle('low',SE.left<60);
}
function renderQ(){
  const it=SE.q.items[SE.idx];
  const locked=SE.locked.has(SE.idx);
  $('seQno').textContent=`Question ${SE.idx+1} of ${SE.q.items.length}`+(locked?' · 🔒 locked':'');
  $('seTopic').textContent=it.topic;
  $('seStem').textContent=(SE.practice&&it.alt)?it.alt:it.stem;
  $('seOpts').innerHTML=(locked?`<div class="lock-note" style="margin-bottom:8px;color:#fff;opacity:.8">🔒 This item was locked after a monitoring violation — the answer can no longer be changed${SE.ans[SE.idx]===undefined?' (left blank)':''}.</div>`:'')
    +it.opts.map((o,i)=>`<div class="opt ${SE.ans[SE.idx]===i?'sel':''} ${locked?'locked':''}" ${locked?'':`onclick="SE.ans[${SE.idx}]=${i};renderQ()"`}>
    <div class="lt">${String.fromCharCode(65+i)}</div><div class="txt">${o}</div></div>`).join('');
  $('seNav').innerHTML=SE.q.items.map((_,i)=>`<button class="${SE.ans[i]!==undefined?'answered':''} ${i===SE.idx?'cur':''} ${SE.locked.has(i)?'viol-locked':''}" onclick="SE.idx=${i};renderQ()">${i+1}${SE.locked.has(i)?'🔒':''}</button>`).join('');
  $('sePrev').disabled=SE.idx===0; $('seNext').disabled=SE.idx===SE.q.items.length-1;
}
document.addEventListener('DOMContentLoaded',()=>{
  const sePrev=$('sePrev'), seNext=$('seNext'), seSubmit=$('seSubmit'), secureEnv=$('secureEnv');
  if(sePrev) sePrev.onclick=()=>{if(SE.idx>0){SE.idx--;renderQ();}};
  if(seNext) seNext.onclick=()=>{if(SE.idx<SE.q.items.length-1){SE.idx++;renderQ();}};
  if(seSubmit) seSubmit.onclick=()=>{
    const un=SE.q.items.length-Object.keys(SE.ans).length;
    if(un>0 && !confirm(`${un} item(s) unanswered. Submit anyway?`)) return;
    endQuiz('Submitted successfully');
  };
  if(secureEnv) ['copy','cut','contextmenu','dragstart'].forEach(ev=>{
    secureEnv.addEventListener(ev,e=>{if(SE.active){e.preventDefault();}});
  });
});
function violate(kind){
  if(!SE.active) return;
  SE.viol++;
  const r=SE.restrict;
  [...$('seViol').children].forEach((d,i)=>d.classList.toggle('hit',i<SE.viol));
  const reachedLimit=SE.viol>=r.maxViol;

  if(r.policy==='autosubmit'){
    if(reachedLimit){ endQuiz(`Auto-submitted after violation ${SE.viol} of ${r.maxViol} — flagged to your instructor`); return; }
    $('violMsg').textContent=`${kind} detected. This attempt is monitored: violation ${SE.viol} of ${r.maxViol}. Reaching the limit will automatically submit your quiz with your current answers.`;
    $('violOverlay').classList.remove('hidden');
    return;
  }

  if(r.policy==='deduct'){
    $('violMsg').textContent=`${kind} detected. Violation ${SE.viol} recorded — ${r.deductPerViolation} point(s) will be deducted from your raw score. Your attempt continues; it will never auto-submit from violations.`;
    $('violOverlay').classList.remove('hidden');
    return;
  }

  // policy === 'lock': freeze whichever item was on screen when the violation happened
  const lockedIdx=SE.idx;
  SE.locked.add(lockedIdx);
  const allLocked=SE.q.items.every((_,i)=>SE.locked.has(i));
  if(allLocked){ endQuiz('Auto-submitted — every item is now locked after repeated violations'); return; }
  // advance off the just-locked item onto the next unlocked one, if any
  if(SE.idx===lockedIdx){
    let next=(SE.idx+1)%SE.q.items.length, guard=0;
    while(SE.locked.has(next) && guard++<SE.q.items.length) next=(next+1)%SE.q.items.length;
    SE.idx=next;
  }
  renderQ();
  $('violMsg').textContent=`${kind} detected. Item ${lockedIdx+1} has been locked${SE.ans[lockedIdx]===undefined?' (left blank)':''} and can no longer be answered or changed. You may continue with the remaining items.`;
  $('violOverlay').classList.remove('hidden');
}
function dismissViolation(){$('violOverlay').classList.add('hidden');}
document.addEventListener('visibilitychange',()=>{if(document.hidden) violate('Tab switch / window minimized')});
window.addEventListener('blur',()=>{if(SE.active&&!document.hidden) setTimeout(()=>{if(SE.active&&!document.hasFocus()) violate('Window focus loss (alt-tab)')},150)});
window.addEventListener('popstate',()=>{if(SE.active){history.pushState({se:1},'');violate('Back-navigation attempt')}});
document.addEventListener('keydown',e=>{if(SE.active&&e.key==='Escape'){e.preventDefault();}});
let LAST_RESULT=null;
function endQuiz(reason){
  SE.active=false; clearInterval(SE.timer);
  LAST_RESULT={qid:SE.qid, q:SE.q, ans:{...SE.ans}, viol:SE.viol, reason, practice:SE.practice, restrict:SE.restrict, locked:[...SE.locked]};
  $('violOverlay').classList.add('hidden');
  $('secureEnv').classList.add('hidden');
  document.body.style.overflow='';
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  setTimeout(()=>{
    toast(LAST_RESULT.practice?'Practice finished — recorded to your personal growth log only.':'Score auto-recorded to the class grading sheet ⚡');
    showQuizResults();
  },200);
}
/* Persist a graded (non-practice) attempt to the enrolled subject's records +
   quiz-review log, so it actually shows up afterward in My Scores and Quiz
   Reviews instead of only existing on this one-time results screen.
   Re-taking the same quiz updates the existing record/review in place. */
function recordGradedAttempt(qid,q,ans,score,n,weak){
  const s=DB.stuSubjects.find(x=>q.course.startsWith(x.code));
  if(!s) return;
  const myAns=q.items.map((_,i)=>ans[i]===undefined?null:ans[i]);
  const presc=weak.length?`Review “${weak.map(w=>w[0]).join('”, “')}” — see the item-level review for details.`:'Strong performance across all tagged topics — no action needed.';
  const rec=s.records.find(r=>r.reviewId===qid);
  if(rec){ rec.score=score; rec.max=n; rec.presc=presc; }
  else s.records.push({comp:'CS · Quiz', label:q.title, score, max:n, auto:true, reviewId:qid, presc});
  const rv=s.reviews.find(x=>x.quizId===qid);
  if(rv){ rv.score=score; rv.max=n; rv.myAns=myAns; }
  else s.reviews.push({quizId:qid, score, max:n, myAns});
  saveDB();
}
function showQuizResults(){
  const {qid,q,ans,viol,reason,practice,restrict,locked}=LAST_RESULT;
  const r=restrict||DEFAULT_RESTRICT;
  const n=q.items.length; let correct=0;
  q.items.forEach((it,i)=>{if(ans[i]===it.ans)correct++;});
  const deduction = r.policy==='deduct' ? Math.min(correct, viol*r.deductPerViolation) : 0;
  const score = Math.max(0, correct-deduction);
  const pct=Math.round(score/n*100);
  const topics={};
  q.items.forEach((it,i)=>{topics[it.topic]=topics[it.topic]||{c:0,t:0};topics[it.topic].t++;if(ans[i]===it.ans)topics[it.topic].c++;});
  const weak=Object.entries(topics).filter(([k,v])=>v.c<v.t);
  if(practice){
    const g=DB.growth.find(x=>x.quiz.startsWith(q.title.split(' — ')[0])||x.quiz===q.title);
    if(g){g.tries++; g.best=`${Math.max(score,parseInt(g.best))} / ${n} (${Math.round(Math.max(score,parseInt(g.best))/n*100)}%)`;}
    else DB.growth.push({quiz:q.title, subject:q.course.split(' · ')[0], base:'— (practice only)', best:`${score} / ${n} (${pct}%)`, tries:1});
    saveDB();
  } else {
    recordGradedAttempt(qid,q,ans,score,n,weak);
  }
  openSheet('🏁', (practice?'Practice Results — ':'Quiz Results — ')+q.title, reason+(practice?' · NOT graded — personal growth log only':' · score auto-recorded to the grading sheet ⚡'), `
   <div class="res-score">
     <div class="res-ring" style="background:${pct>=75?'linear-gradient(150deg,#19C68F,#0FA678)':pct>=50?'linear-gradient(150deg,#F2AE2A,#D98E04)':'linear-gradient(150deg,#F26D72,#E5484D)'}">${score} / ${n}</div>
     <div style="min-width:0">
       <b style="font-family:'Plus Jakarta Sans';font-size:19px;color:var(--navy)">${pct}% — ${pct>=75?'above':'below'} the 75% passing mark</b>
       <div class="lock-note" style="margin-top:5px">${Object.keys(ans).length} of ${n} items answered · ${viol} violation(s) (policy: ${(VIOLATION_POLICIES.find(p=>p.k===r.policy)||{}).label||r.policy}) · ${practice?'rephrased practice retake (ungraded)':'graded attempt'}</div>
       ${deduction?`<div class="lock-note" style="margin-top:2px">${correct} raw correct − ${deduction} deducted (${viol} × ${r.deductPerViolation} pt) = ${score} scored</div>`:''}
       ${locked&&locked.length?`<div class="lock-note" style="margin-top:2px">🔒 ${locked.length} item(s) locked mid-attempt by a violation: Q${locked.map(i=>i+1).join(', Q')}</div>`:''}
     </div>
   </div>
   <div class="grid g3" style="margin-bottom:18px">
     <div class="card"><h3>Descriptive — this attempt</h3>
       ${Object.entries(topics).map(([t,v])=>`<div class="topic-row" style="margin-bottom:8px"><div class="tn" style="width:170px">${t}</div><div class="bar"><i style="width:${Math.round(v.c/v.t*100)}%;background:${v.c===v.t?'var(--ok)':v.c?'var(--warn)':'var(--bad)'}"></i></div><div class="pv">${v.c}/${v.t}</div></div>`).join('')}
     </div>
     <div class="card"><h3>Predictive — effect on standing <span class="ai-badge">PROJECTION</span></h3>
       <p style="font-size:12.5px;line-height:1.65">${practice
        ?'Practice attempts never change your grades. Sustained practice at this level projects a <b>+'+Math.max(0,pct-60)+'% mastery gain</b> on these topics in your personal growth log.'
        :'This score feeds your Class Standing (60% of the term grade). Holding this level projects your term grade at ≈ <b>'+Math.round(pct*0.6+34)+'</b>; one more low quiz on the same topics would pull the projection below 75.'}</p>
     </div>
     <div class="card"><h3>Prescriptive — what to do next</h3>
       ${weak.length?weak.map(([t])=>`<div class="note" style="margin:6px 0"><b>Review “${t}”</b> — re-read the topic notes, then retake as practice (rephrased, ungraded).</div>`).join(''):'<div class="note c-ok" style="margin:6px 0">All topics correct — nothing to prescribe. Keep it up!</div>'}
       ${practice?'':'<button class="btn btn-ai btn-s" style="margin-top:4px" onclick="practiceModal(\''+qid+'\')">🔁 Retake as practice — rephrased · not graded</button>'}
     </div>
   </div>
   <h3 style="font-size:14.5px;color:var(--navy);margin-bottom:12px">Items answered — tap Review for the evaluation & elaboration</h3>
   ${q.items.map((it,i)=>{const mine=ans[i];const ok=mine===it.ans;return `<div class="sec-item">
     <div class="tic" style="background:${ok?'var(--ok-l)':'var(--bad-l)'}">${ok?'✔':'✘'}</div>
     <div><b>Q${i+1}. ${(practice&&it.alt)?it.alt:it.stem}</b><small>${it.topic} · your answer: ${mine!==undefined?String.fromCharCode(65+mine)+'. '+it.opts[mine]:'— unanswered'}</small></div>
     <div class="acts">${ok?chip('Correct','c-ok'):chip('Incorrect','c-bad')}<button class="btn btn-o btn-s" onclick="resultItemModal(${i})">Review ▾</button></div></div>`;}).join('')}`);
}
function resultItemModal(i){
  const {q,ans,practice}=LAST_RESULT; const it=q.items[i]; const mine=ans[i]; const ok=mine===it.ans;
  openModal(`<h3>Q${i+1} — Evaluation ${ok?chip('Correct','c-ok'):chip('Incorrect','c-bad')}</h3>
   <p style="font-size:14px;font-weight:700;margin-bottom:10px">${(practice&&it.alt)?it.alt:it.stem}</p>
   ${it.opts.map((o,oi)=>`<div class="rv-opt ${oi===it.ans?'correct':''} ${oi===mine&&!ok?'wrong':''}">${String.fromCharCode(65+oi)}. ${o}${oi===it.ans?' ✓ correct answer':''}${oi===mine&&!ok?' — your answer':''}</div>`).join('')}
   <div class="note" style="margin-top:12px"><b>${ok?'Why this is correct':'Why your answer is wrong'}:</b> ${ok?it.exp:(mine!==undefined?`You chose “${it.opts[mine]}”. `:'You left this unanswered. ')+it.exp}</div>
   <div class="note-ai note"><b>Elaboration — more context on the correct answer:</b> ${it.elab||it.exp}</div>
   <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn btn-p" onclick="closeModal()">Close</button></div>`);
}
function practiceModal(qid){
  const q=DB.quizzes[qid];
  openModal(`<h3>🔁 Retake as practice — ${q.title} <span class="ai-badge">NOT GRADED</span></h3>
  <div class="frm">
   <div class="note-ai note" style="margin:0">
    <b>Practice mode rules:</b><br>
    • The AI presents <b>rephrased versions of the same items</b> — same concepts, new wording — to strengthen comprehension and critical thinking, not memorization.<br>
    • Your result is <b>never recorded to the class grading sheet</b> and your instructor's gradebook is untouched.<br>
    • The attempt is saved only to <b>your personal growth log</b>, so the system can visualize your improvement over the graded attempt.<br>
    • You may practice as many times as you like.</div>
   <div style="display:flex;gap:8px;justify-content:flex-end">
    <button class="btn btn-o" onclick="closeModal()">Not now</button>
    <button class="btn btn-ai" onclick="closeModal();closeSheet();startQuiz('${qid}',true)">Start practice retake</button></div>
  </div>`);
}
function practiceFromTopic(code,tw){
  const map={'GE EELECT-IT':{'T1':'q1','T3':'q3'},'CC-COMPROG11':{'T1':'qc1','T2':'qc1'}};
  const qid=(map[code]||{})[tw];
  if(qid) practiceModal(qid);
  else toast('AI drafted rephrased practice items for this topic — available once its quiz is released.');
}
