/* ============================================================
   EduPulse — core.js: persistence, page shell, overlay helpers,
   shared formatting/grading utilities, document rendering.
   Loaded by every real page (after data.js, before the page's
   own render script).
============================================================ */
const $=id=>document.getElementById(id);
const view=()=>$('view');
const chip=(t,c)=>`<span class="chip ${c}">${t}</span>`;
/* Syllabi carry no Dean-approval workflow (no Draft/Submitted/Approved
   status) — this reflects only whether a syllabus has actually been built
   for the subject yet, a real, persisted fact (DB.syllabi[code]). */
const sylChip=code=>DB.syllabi[code]?chip('Syllabus built','c-ok'):chip('No syllabus yet','c-mut');
function schemeTerms(){return ['Midterm','Finals'];}
function schemeLabel(){return 'Midterm · Finals';}
const ME='Ralphy Luzada';
function myAssignments(){return DB.assignments[ME]||[];}
/* The logged-in student persona (Yesha Nicka D. Botay, BSIT 3A) — same role `ME`
   plays for the instructor: the one fixed identity every student page reads
   its own-row data through, instead of each page hardcoding a roster index. */
const MY_STUDENT_ID='2023-3A02';
function myGradeRow(code,sec){ return gradeRows(code,sec).find(s=>s.id===MY_STUDENT_ID); }

/* ---- localStorage persistence ---- */
const DB_KEY='edupulse_db_v4';
const ROLE_KEY='edupulse_role';
let DB=null, ROLE=null;
function loadDB(){
  const raw=localStorage.getItem(DB_KEY);
  try{ DB = raw?JSON.parse(raw):JSON.parse(JSON.stringify(DEFAULT_DB)); }
  catch(e){ DB=JSON.parse(JSON.stringify(DEFAULT_DB)); }
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }
function confirmReset(){
  openModal(`<h3>Reset demo data?</h3>
   <p style="font-size:13.5px;margin-bottom:14px">This discards every edit made in this browser (topics, publish states, consistency findings…) and restores the original seed data for all roles.</p>
   <div style="display:flex;gap:8px;justify-content:flex-end">
     <button class="btn btn-o" onclick="closeModal()">Cancel</button>
     <button class="btn btn-d" onclick="localStorage.removeItem('${DB_KEY}');localStorage.removeItem('${ROLE_KEY}');location.href='${location.pathname.includes('/index.html')||location.pathname==='/'?'':'../'}index.html'">Reset & log out</button>
   </div>`);
}

/* ---- scoring helpers (per-subject scoring sheet derived from current DB, not a frozen const).
   A subject's sections come straight from its curriculum entry, so the scoring sheet always
   matches who the Dean actually enrolled. The Completed/Missed demo is seeded in data.js
   (one BSIT 3A student carries a `missed` flag), not injected here. ---- */
function getGradebook(code){
  const c=DB.curriculum.find(x=>x.code===code);
  const g={};
  (c?c.sections:[]).forEach(sec=>{ if(DB.students[sec]) g[sec]=DB.students[sec]; });
  return g;
}
function gradeSections(code){return Object.keys(getGradebook(code));}
function gradeRows(code,sec){return (getGradebook(code)[sec])||DB.students[sec]||[];}
/* EduPulse scoring sheet = record of the scores students obtain in the activities
   the instructor posts within EduPulse, grouped by term (Midterm / Finals — labels
   only). (Official KCP grading-sheet / term-grade computation: future improvement.) */
function gradedActivities(){
  const c=DB.cols, list=[];
  c.Midterm.cs.forEach((x,i)=>list.push({k:x.k,max:x.max,key:'cs',i,term:'Midterm'}));
  c.Midterm.ex.forEach((x,i)=>list.push({k:'EX1',max:x.max,key:'ex',i,term:'Midterm'}));
  c.Finals.cs.forEach((x,i)=>list.push({k:x.k,max:x.max,key:'fcs',i,term:'Finals'}));
  c.Finals.ex.forEach((x,i)=>list.push({k:'EX2',max:x.max,key:'fex',i,term:'Finals'}));
  return list;
}
function actVal(s,a){return s[a.key][a.i];}
/* Completed / Missed status per student per activity (demo rule): a student is
   marked "Missed" for an activity listed in their own `missed` array; otherwise
   "Completed" (the score was recorded within the set timeframe). */
function actMissed(s,a){return Array.isArray(s.missed)&&s.missed.includes(a.k);}
function actStats(rows,a){
  const vs=rows.filter(s=>!actMissed(s,a)).map(s=>actVal(s,a));
  if(!vs.length) return {hi:0,lo:0,avg:0};
  return {hi:Math.max(...vs), lo:Math.min(...vs), avg:vs.reduce((x,y)=>x+y,0)/vs.length};
}
/* Overall = sum of recorded scores over perfect scores; a Missed activity counts
   as 0 until it is answered (mirrors the student-side "missing counts as 0" rule). */
function studentOverall(s){
  const acts=gradedActivities();
  const tot=acts.reduce((a,x)=>a+(actMissed(s,x)?0:actVal(s,x)),0), max=acts.reduce((a,x)=>a+x.max,0);
  return {tot,max,pct:tot/max*100};
}

/* ---- topic / item helpers shared by every page that lists syllabus content ---- */
function topicSubtopics(t){return t.items.filter(x=>x.k==='subtopic');}
function topicPlan(t){return t.items.filter(x=>x.k!=='subtopic');}
function topicHasGenPub(pack){return !!(pack&&pack.gen&&pack.topicPub);}

/* ---- overlay helpers (unchanged conceptually from the single-file prototype) ---- */
function openModal(html){$('modalBox').innerHTML='<button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>'+html;$('modalBg').classList.remove('hidden');}
function closeModal(){$('modalBg').classList.add('hidden');}
function openSheet(icon,title,sub,html,w){
  $('sheetIcon').textContent=icon; $('sheetTitle').textContent=title; $('sheetSub').textContent=sub;
  $('sheetBody').innerHTML=html; $('sheetBg').classList.remove('hidden'); $('sheetBg').scrollTop=0;
  $('sheetPanel').style.maxWidth=w?w+'px':'';
}
function closeSheet(){$('sheetBg').classList.add('hidden');}
/* evt anchors the popover next to the click (used everywhere a small,
   contextual popover is opened from a specific row/button); omitting evt
   instead centers it in the viewport, both axes — used for popovers that
   need to read like a standalone dialog (e.g. topicPop) rather than a
   tooltip pinned to whatever was clicked. */
function openPop(html,evt,w){
  const pop=$('pop'); pop.style.width=Math.min(w||360,innerWidth-24)+'px';
  pop.innerHTML='<button class="pop-x" onclick="closePop()" aria-label="Close">✕</button>'+html;
  pop.classList.remove('hidden'); $('popBg').classList.remove('hidden');
  const r=pop.getBoundingClientRect();
  let x=(evt?evt.clientX:innerWidth/2)-r.width/2, y=evt?evt.clientY+16:(innerHeight-r.height)/2;
  x=Math.max(12,Math.min(x,innerWidth-r.width-12));
  if(evt&&y+r.height>innerHeight-12) y=Math.max(12,evt.clientY-r.height-16);
  y=Math.max(12,Math.min(y,innerHeight-r.height-12));
  pop.style.left=x+'px'; pop.style.top=y+'px';
}
function closePop(){$('pop').classList.add('hidden');$('popBg').classList.add('hidden');}
function toast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:linear-gradient(150deg,#1B2559,#26327B);color:#fff;padding:12px 22px;border-radius:14px;font-size:13px;font-weight:600;z-index:130;box-shadow:var(--sh-3);animation:pop .25s';
  t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2600);
}

/* ---- fixed AI prompt viewer (PPT / DOC / QUIZ) ---- */
const PROMPT_META={
 ppt:{key:'pptPrompt', label:'EduPulse-PPT v1', title:'Fixed prompt template — EduPulse-PPT v1'},
 doc:{key:'docPrompt', label:'EduPulse-DOC v1', title:'Fixed prompt template — EduPulse-DOC v1'},
 quiz:{key:'quizPrompt', label:'EduPulse-QUIZ v1', title:'Fixed prompt template — EduPulse-QUIZ v1'}
};
function showPrompt(kind){
  const m=PROMPT_META[kind]||PROMPT_META.ppt;
  openModal(`<h3>${m.title} <span class="ai-badge">SYSTEM-OWNED</span></h3>
  <div class="lock-note" style="margin-bottom:10px">Placeholders are auto-filled from the parsed syllabus topic. Instructors never write prompts.</div>
  <pre class="gen-log" style="white-space:pre-wrap">${DB[m.key]}</pre>
  <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-p" onclick="closeModal()">Close</button></div>`);
}

/* ---- real Document (.docx)/Presentation (.pptx) file generation lives
   in filegen.js (openSection, exportSectionPdf) — loaded after this file on
   any page that opens Course Content sections. ---- */

/* ---- page shell: sidebar / topbar / overlay containers, injected once per page ---- */
const NAV_CONFIG={
 dean:[['dashboard','📊 Dashboard'],['settings','🎛️ Academic Settings'],
       ['curriculum','📚 Curriculum'],['assign','🧑‍🏫 Instructor Assignment'],
       ['students','🎓 Students & Enrollment']],
 instructor:[['dashboard','📊 Dashboard'],
       ['students','🎓 Students & Enrollment'],['syllabus','📝 My Subjects & Syllabi'],
       ['content','🗂️ Course Content'],['checker','🧠 Consistency Checker'],
       ['grading','📊 Score Visualization']],
 student:[['dashboard','📊 Dashboard'],['subjects','📚 My Subjects'],
       ['scores','🧾 My Scores'],['reviews','🔍 Quiz Reviews'],['insights','📈 My Performance']]
};
function shellHtml(role,navKey){
  const u=DB.users[role];
  const items=NAV_CONFIG[role];
  return `
  <div id="app">
    <aside>
      <div class="logo"><div class="logo-mark">EP</div><h1>EduPulse</h1></div>
      <span class="role-tag">${u.role}</span>
      <div id="navArea">${items.map(([k,label])=>`<a class="nav-btn ${k===navKey?'active':''}" href="${k}.html">${label}</a>`).join('')}</div>
      <div class="spacer"></div>
      <button class="btn btn-o btn-s" style="width:100%" onclick="logout()">Logout</button>
      <button class="btn btn-o btn-s" style="width:100%;margin-top:6px" onclick="confirmReset()">Reset demo data</button>
    </aside>
    <main>
      <div class="topbar">
        <div><h2>${(items.find(n=>n[0]===navKey)||['','?'])[1].replace(/^\S+\s/,'')}</h2><div class="sub" id="pageSub"></div></div>
        <div class="avatar"><div><b>${u.name}</b><div style="font-size:12px;color:var(--mut)">${u.role}</div></div><div class="dot">${u.ini}</div></div>
      </div>
      <div id="view"></div>
    </main>
  </div>
  <div id="sheetBg" class="sheet-bg hidden"><div class="sheet" id="sheetPanel"><div class="sheet-h"><div class="wno" id="sheetIcon"></div><div style="min-width:0;flex:1"><h3 id="sheetTitle"></h3><small id="sheetSub"></small></div><button class="sheet-x" onclick="closeSheet()">✕</button></div><div class="sheet-b" id="sheetBody"></div></div></div>
  <div id="popBg" class="pop-bg hidden" onclick="closePop()"></div><div id="pop" class="pop hidden"></div>
  <div id="modalBg" class="modal-bg hidden"><div class="modal"><div id="modalBox"></div></div></div>
  <div id="violOverlay" class="hidden">
    <div style="font-size:52px">⚠️</div>
    <h2>Focus Violation Detected</h2>
    <p id="violMsg" style="font-size:15px;max-width:460px;line-height:1.6"></p>
    <button class="btn btn-p" style="font-size:15px;padding:11px 26px" onclick="dismissViolation()">Return to Quiz</button>
  </div>
  <div id="secureEnv" class="hidden">
    <div class="se-top">
      <div><b id="seTitle" style="font-size:15px"></b><div id="seMeta" style="font-size:12px;opacity:.75;margin-top:2px"></div></div>
      <div style="display:flex;align-items:center;gap:16px">
        <div class="viol" id="seViol"><i></i><i></i><i></i></div>
        <div class="se-timer" id="seTimer">00:00</div>
      </div>
    </div>
    <div class="se-body">
      <div class="se-card">
        <div id="seQno" style="font-size:12px;color:var(--mut);font-weight:700;margin-bottom:4px"></div>
        <span class="chip c-teal" id="seTopic" style="margin-bottom:10px;display:inline-block"></span>
        <div class="reveal-hint">👁 Hover a choice to reveal it — selection, copy, and right-click are disabled</div>
        <div id="seStem" style="font-size:15.5px;font-weight:700;margin:6px 0 14px;color:var(--ink)"></div>
        <div id="seOpts"></div>
        <div class="qnav" id="seNav"></div>
        <div style="display:flex;justify-content:space-between;margin-top:20px">
          <button class="btn btn-o" id="sePrev">← Previous</button>
          <button class="btn btn-p" id="seNext">Next →</button>
        </div>
      </div>
    </div>
  </div>`;
}
function logout(){ localStorage.removeItem(ROLE_KEY); location.href='../index.html'; }
function bootPage({role,navKey,render}){
  ROLE=localStorage.getItem(ROLE_KEY);
  if(ROLE!==role){ location.href='../index.html'; return; }
  loadDB();
  document.body.insertAdjacentHTML('afterbegin', shellHtml(role,navKey));
  const pageSub=$('pageSub');
  if(pageSub) pageSub.textContent = role==='dean'
    ? `College of Information Technology · ${DB.config.sem}, AY ${DB.config.ay} (set by Dean)`
    : `${DB.config.sem}, AY ${DB.config.ay} (set by the Dean)`;
  try{ render(); }
  catch(e){ console.error(e); toast('Something went wrong rendering this page.'); }
}
