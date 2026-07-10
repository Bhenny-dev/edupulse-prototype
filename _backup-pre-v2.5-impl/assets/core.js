/* ============================================================
   EduPulse — core.js: persistence, page shell, overlay helpers,
   shared formatting/grading utilities, document rendering.
   Loaded by every real page (after data.js, before the page's
   own render script).
============================================================ */
const $=id=>document.getElementById(id);
const view=()=>$('view');
const chip=(t,c)=>`<span class="chip ${c}">${t}</span>`;
const sylChip=s=>s==='Approved'?chip('Approved','c-ok'):s==='Submitted'?chip('Submitted — for approval','c-warn'):s==='Draft'?chip('Draft','c-mut'):chip('No syllabus','c-bad');
function schemeTerms(){return ['Midterm','Finals'];}
function schemeLabel(){return 'Midterm · Finals';}
const ME='Prof. J. Alvarez';
function myAssignments(){return DB.assignments[ME]||[];}

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

/* ---- grading helpers (per-subject gradebook derived from current DB, not a frozen const) ---- */
function getGradebook(code){
  const g={};
  if(code==='GE EELECT-IT'){ g['BSIT 1A']=DB.students['BSIT 1A']; g['BSIT 1B']=DB.students['BSIT 1B']; }
  else if(code==='CC-COMPROG11'){ g['BSIT 1A']=DB.students['BSIT 1A']; g['BSIT 1B']=DB.students['BSIT 1B']; }
  else if(code==='CC-INTCOM11'){
    g['BSIT 1A']=DB.students['BSIT 1A'];
    g['INTL']=DB.intl.map((st,i)=>({id:st.id,name:st.name,pcs:[8+i,12+i],pex:[30+i],cs:[9+i,13+i,8+i,15+i],ex:[34+i],fcs:[8+i,12+i],fex:[33+i]}));
  } else if(code==='IT-WST21'){
    g['BSIT 2A']=DB.students['BSIT 2A'];
    g['INTL']=DB.intl.map((st,i)=>({id:st.id,name:st.name,pcs:[7+i,11+i],pex:[28+i],cs:[8+i,12+i,7+i,14+i],ex:[32+i],fcs:[7+i,11+i],fex:[31+i]}));
  }
  return g;
}
function gradeSections(code){return Object.keys(getGradebook(code));}
function gradeRows(code,sec){return (getGradebook(code)[sec])||DB.students[sec]||[];}
/* EduPulse grading sheet = record of instructor-given graded activities.
   (Official KCP grading-sheet / term-grade integration: future improvement.) */
function gradedActivities(){
  const c=DB.cols, list=[];
  c.Midterm.cs.forEach((x,i)=>list.push({k:x.k,max:x.max,key:'cs',i}));
  c.Midterm.ex.forEach((x,i)=>list.push({k:'EX1',max:x.max,key:'ex',i}));
  c.Finals.cs.forEach((x,i)=>list.push({k:x.k,max:x.max,key:'fcs',i}));
  c.Finals.ex.forEach((x,i)=>list.push({k:'EX2',max:x.max,key:'fex',i}));
  return list;
}
function actVal(s,a){return s[a.key][a.i];}
function actStats(rows,a){
  const vs=rows.map(s=>actVal(s,a));
  return {hi:Math.max(...vs), lo:Math.min(...vs), avg:vs.reduce((x,y)=>x+y,0)/vs.length};
}
function studentOverall(s){
  const acts=gradedActivities();
  const tot=acts.reduce((a,x)=>a+actVal(s,x),0), max=acts.reduce((a,x)=>a+x.max,0);
  return {tot,max,pct:tot/max*100};
}

/* ---- topic / item helpers shared by every page that lists syllabus content ---- */
function topicSubtopics(t){return t.items.filter(x=>x.k==='subtopic');}
function topicPlan(t){return t.items.filter(x=>x.k!=='subtopic');}
function topicHasGenPub(pack){return !!(pack&&pack.gen&&pack.topicPub);}

/* ---- overlay helpers (unchanged conceptually from the single-file prototype) ---- */
function openModal(html){$('modalBox').innerHTML=html;$('modalBg').classList.remove('hidden');}
function closeModal(){$('modalBg').classList.add('hidden');}
function openSheet(icon,title,sub,html){
  $('sheetIcon').textContent=icon; $('sheetTitle').textContent=title; $('sheetSub').textContent=sub;
  $('sheetBody').innerHTML=html; $('sheetBg').classList.remove('hidden'); $('sheetBg').scrollTop=0;
}
function closeSheet(){$('sheetBg').classList.add('hidden');}
function openPop(html,evt,w){
  const pop=$('pop'); pop.style.width=(w||360)+'px';
  pop.innerHTML=html; pop.classList.remove('hidden'); $('popBg').classList.remove('hidden');
  const r=pop.getBoundingClientRect();
  let x=(evt?evt.clientX:innerWidth/2)-r.width/2, y=(evt?evt.clientY:120)+16;
  x=Math.max(12,Math.min(x,innerWidth-r.width-12));
  if(y+r.height>innerHeight-12) y=Math.max(12,(evt?evt.clientY:120)-r.height-16);
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

/* ---- real document rendering, shared by the seed-content generator script and
   live "Generate" simulation so both paths produce identical-looking output ---- */
const CONTENT_DOC_CSS=`
:root{--ink:#171A3F;--mut:#697089;--pri:#3D5AF1;--navy:#1B2559;--line:rgba(23,26,63,.12)}
*{box-sizing:border-box}
body{font-family:'Manrope',system-ui,sans-serif;color:var(--ink);max-width:760px;margin:0 auto;padding:36px 28px 60px;line-height:1.65;background:#F6F8FD}
header{border-bottom:3px solid var(--pri);padding-bottom:14px;margin-bottom:24px}
header b{font-size:13px;color:var(--navy)}
header .tag{display:inline-block;margin-top:6px;background:#EBEFFF;color:var(--pri);font-size:11px;font-weight:800;padding:3px 11px;border-radius:99px;text-transform:uppercase;letter-spacing:.4px}
h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;color:var(--navy);margin-bottom:6px}
h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;color:var(--navy);margin:26px 0 8px;border-left:4px solid var(--pri);padding-left:10px}
p{margin-bottom:10px;font-size:14px}
.mapping{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.4px;margin-top:-4px;margin-bottom:10px}
.slide{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(23,26,63,.06)}
.slide .sno{font-size:11px;font-weight:800;color:var(--pri);text-transform:uppercase;letter-spacing:.5px}
footer{margin-top:34px;padding-top:14px;border-top:1px solid var(--line);font-size:11px;color:var(--mut)}
`;
function buildDocHtml({docType,title,courseCode,courseTitle,topicNo,topicTitle,bodyHtml}){
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>${CONTENT_DOC_CSS}</style></head><body>
<header><b>${courseCode}</b> — ${courseTitle} · Topic ${topicNo}: ${topicTitle}<br><span class="tag">${docType}</span></header>
<h1>${title}</h1>
${bodyHtml}
<footer>Generated by EduPulse (simulated AI) · instructor-reviewed before publishing to students.</footer>
</body></html>`;
}
function openSection(s){
  if(s&&s.url) window.open(s.url,'_blank');
  else if(s&&s.html) window.open(URL.createObjectURL(new Blob([s.html],{type:'text/html'})),'_blank');
  else toast('No document to open for this type.');
}

/* ---- page shell: sidebar / topbar / overlay containers, injected once per page ---- */
const NAV_CONFIG={
 dean:[['dashboard','📊 Dashboard'],['settings','🎛️ Academic Settings'],
       ['curriculum','📚 Curriculum'],['assign','🧑‍🏫 Instructor Assignment'],
       ['students','🎓 Students & Enrollment'],
       ['oversight','🔎 Oversight & Audit']],
 instructor:[['dashboard','📊 Dashboard'],['syllabus','📝 My Subjects & Syllabi'],
       ['students','🎓 Students & Enrollment'],
       ['content','🗂️ Course Content'],['checker','🧠 Consistency Checker'],
       ['grading','🧮 Grading Sheet']],
 student:[['dashboard','📊 Dashboard'],['subjects','📚 My Subjects'],
       ['scores','🧾 My Scores'],['reviews','🔍 Quiz Reviews'],['insights','📊 My Progress Visualization']]
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
  <div id="sheetBg" class="sheet-bg hidden"><div class="sheet"><div class="sheet-h"><div class="wno" id="sheetIcon"></div><div style="min-width:0"><h3 id="sheetTitle"></h3><small id="sheetSub"></small></div><button class="sheet-x" onclick="closeSheet()">✕</button></div><div class="sheet-b" id="sheetBody"></div></div></div>
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
          <div style="display:flex;gap:8px">
            <button class="btn btn-p" id="seNext">Next →</button>
            <button class="btn btn-ai" id="seSubmit">Submit attempt</button>
          </div>
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
