/* ============================================================
   EduPulse — content-system.js
   Course Content: per-topic AI-generated packs, section actions,
   topic-level publish/hide (real, persisted), fixed prompts.
============================================================ */
let CC_CODE=null, CC_FOCUS_TOPIC=null;
/* Build a real, topic-specific quiz for a generated/added quiz section.
   Items are placeholder MCQs tagged to the topic's own subtopics so the
   quiz maps correctly (title, course, per-item topic tags) and is fully
   takeable in the secure environment, practice mode, and results review. */
function buildGeneratedQuiz(code,topic,itemName){
  const subs=topicSubtopics(topic);
  const tags=(subs.length?subs.map(s=>s.n):[topic.title]).slice(0,3);
  const items=tags.map(tag=>({
    stem:`Which statement best reflects the key idea of “${tag}”?`,
    alt:`In your own words, which option most accurately describes “${tag}”?`,
    topic:tag,
    opts:[`A correct, syllabus-aligned description of ${tag}`,`A partially related but incomplete idea`,`A common misconception about ${tag}`,`An unrelated concept`],
    ans:0,
    exp:`The correct option matches how “${tag}” is defined in ${topic.title}.`,
    elab:`This item is auto-drafted from the syllabus scope of Topic ${topic.no} (“${topic.title}”). Your instructor reviews and refines the wording before it counts toward a grade; the concept tag (${tag}) is fixed by the syllabus.`
  }));
  return {title:`${itemName} — ${topic.title}`, course:`${code} · Topic ${topic.no}`, mins:15, restrict:{...DEFAULT_RESTRICT}, items};
}
/* Cards first (one per assigned subject, with at-a-glance generation/publish
   status), matching My Subjects & Syllabi's card → page-modal pattern. Tapping
   a card opens that subject's topics in a page modal (openContentSheet) —
   Course Content no longer renders topics inline on this page. */
function insContent(){
  const params=new URLSearchParams(location.search);
  const qCode=params.get('code'), qTopic=params.get('topic');
  view().innerHTML=`
  <div class="note" style="margin-top:0">Each subject assigned to you by the Dean has its own AI-generated content pack. Open a subject to review, publish, and manage its topics — organized per the paper's exactly-three AI categories (Document / Presentation / Quiz).</div>
  ${myAssignments().map(x=>{
    const c=DB.curriculum.find(k=>k.code===x.code);
    const sy=DB.syllabi[x.code]; const packs=DB.packs[x.code]||{};
    const topics=sy.topics.filter(t=>!t.title.includes('EXAM'));
    const genCount=topics.filter(t=>packs[t.no]&&packs[t.no].gen).length;
    const pubCount=topics.filter(t=>packs[t.no]&&packs[t.no].topicPub).length;
    const statusChip=genCount===0?chip('Not started','c-mut'):genCount<topics.length?chip(genCount+'/'+topics.length+' generated','c-warn'):chip('All '+topics.length+' generated','c-ok');
    return `<div class="card click subj-card" onclick="openContentSheet('${x.code}',null,true)">
    <div class="sc-ic">🗂️</div>
    <div style="flex:1"><b>${x.code} — ${c.title}</b><small>${topics.length} topics · ${pubCount} published to students · sections ${x.sections.join(', ')}</small></div>
    ${statusChip}
    <span class="chip c-mut">Open content →</span>
  </div>`;}).join('')}`;
  if(qCode&&myAssignments().some(x=>x.code===qCode)) openContentSheet(qCode, qTopic?Number(qTopic):null, true);
}
function openContentSheet(code,focusTopic,resetFocus){
  CC_CODE=code;
  if(focusTopic) CC_FOCUS_TOPIC=focusTopic;
  else if(resetFocus) CC_FOCUS_TOPIC=null;
  const sy=DB.syllabi[CC_CODE]; const packs=DB.packs[CC_CODE]||{};
  const c=DB.curriculum.find(k=>k.code===CC_CODE);
  openSheet('🗂️', CC_CODE+' — '+c.title, `Course Content · sections ${myAssignments().find(x=>x.code===CC_CODE).sections.join(' · ')}`, `
  <div class="note-ai note" style="margin-top:0"><b>AI generation is syllabus-mapped:</b> one generated section per non-subtopic item of each topic, always one of exactly three categories — <b>Presentation</b> (.pptx), <b>Documents</b> (.docx / .xlsx / .pdf), or <b>Quiz</b> (MCQ) — each opened as a real, downloadable file.
   <a href="#" onclick="showPrompt('ppt');return false" style="color:var(--ai);font-weight:700">PPT prompt</a> ·
   <a href="#" onclick="showPrompt('doc');return false" style="color:var(--ai);font-weight:700">DOC prompt</a> ·
   <a href="#" onclick="showPrompt('quiz');return false" style="color:var(--ai);font-weight:700">QUIZ prompt</a></div>
  ${sy.topics.filter(t=>!t.title.includes('EXAM')).map(t=>{
    const p=packs[t.no];
    const subs=topicSubtopics(t), plan=topicPlan(t);
    const expand=CC_FOCUS_TOPIC?CC_FOCUS_TOPIC===t.no:t.no===1;
    return `<div class="week" data-topic="${t.no}"><div class="week-h" onclick="this.nextElementSibling.classList.toggle('hidden')">
      <div class="wno">T${t.no}</div>
      <div style="flex:1"><b>${t.title}</b><small>${t.weeks} · ${subs.length} subtopics · plan: ${plan.map(x=>x.n).join(', ').slice(0,66)}…</small></div>
      ${p&&p.gen?(p.topicPub?chip('✅ Published to students','c-ok'):chip('🔒 Hidden from students','c-bad')):chip('Not generated','c-mut')}
    </div>
    <div class="week-b ${expand?'':'hidden'}">
      <div class="subtopics">${subs.map(s=>`<span class="st">${s.n}</span>`).join('')}</div>
      ${p&&p.gen? p.secs.map((s,si)=>`
        <div class="sec-item click" onclick="secPop(${t.no},${si},event)">
          <div class="tic" style="background:${TICON[s.t][1]}">${TICON[s.t][0]}</div>
          <div><b>${s.label}</b><small>${s.sub}</small></div>
          <div class="acts">${CONTENT_CATS[s.t]?chip(CONTENT_CATS[s.t],'c-teal'):''}${s.pub?chip('Published','c-ok'):chip('Draft','c-mut')}<span class="chip c-mut">Actions ▾</span></div></div>`).join('')
        + `<div class="kv" style="margin-top:10px"><b>Attach an upload to a specific subtopic</b></div>
           <div class="subtopics">${subs.length?subs.map(s=>{const n=uploadsForSubtopic(t.no,s.n).length;
             return `<span class="st click" onclick="uploadModal(${t.no},'${s.n.replace(/'/g,"\\'")}')" title="Upload notes/documents for this subtopic">⤴ ${s.n}${n?' ('+n+')':''}</span>`;}).join('')
             :'<span class="lock-note">No subtopics to attach uploads to.</span>'}</div>
           <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
           <button class="btn btn-o btn-s" onclick="addSectionPop(${t.no},event)">+ Add section ▾</button>
           <button class="btn ${p.topicPub?'btn-o':'btn-p'} btn-s" onclick="toggleTopicPub(${t.no})">${p.topicPub?'🔒 Hide topic from students':'✅ Publish topic to students'}</button></div>`
      : `<div class="note">No content yet. The AI will parse this topic — ${subs.length} subtopic(s) + ${plan.length} planned item(s) (<i>${plan.map(x=>x.n).join(', ')}</i>) — and generate one labeled section per planned item for your review.</div>
         <button class="btn btn-ai" onclick="genTopic(${t.no},this)">⚡ Generate Topic ${t.no} pack with AI</button>`}
    </div></div>`;}).join('')}`);
  const ft=CC_FOCUS_TOPIC;
  if(ft){ setTimeout(()=>{ const el=document.querySelector('[data-topic="'+ft+'"]'); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'start'}); },60); }
}
/* Re-renders the currently open subject's sheet in place (used after every
   save/generate/publish action) without kicking the instructor back to the
   card list — CC_FOCUS_TOPIC (set by whichever topic-scoped action is
   running) keeps the same topic expanded across the refresh. */
function refreshContentSheet(){ openContentSheet(CC_CODE); }
function secCtx(tno){
  const c=DB.curriculum.find(x=>x.code===CC_CODE); const t=DB.syllabi[CC_CODE].topics.find(x=>x.no===tno);
  return {courseCode:CC_CODE, courseTitle:c.title, topicNo:tno, topicTitle:t.title};
}
function secPop(tno,si,evt){
  CC_FOCUS_TOPIC=tno;
  const s=DB.packs[CC_CODE][tno].secs[si];
  const openable=s.t==='doc'||s.t==='ppt'||s.t==='file';
  const openLabel=s.t==='ppt'?'📽️ Open presentation (.pptx)':s.format==='excel'?'📄 Open document (.xlsx)':s.format==='pdf'?'📄 Open document (.pdf)':'📄 Open document (.docx)';
  openPop(`<h4>${TICON[s.t][0]} ${s.label}</h4>
  <div class="kv"><b>Category</b>${CONTENT_CATS[s.t]||(s.t==='file'?'Instructor Upload':s.t)}</div>
  <div class="kv"><b>Mapping</b>${s.sub}</div>
  <div class="kv"><b>Content preview</b><span style="white-space:pre-line;font-size:12px;color:#3A4160">${(s.preview||'—').slice(0,260)}${s.preview&&s.preview.length>260?'…':''}</span></div>
  <div class="pop-acts">
    ${openable?`<button class="btn btn-p btn-s" onclick="openSection(DB.packs['${CC_CODE}'][${tno}].secs[${si}],secCtx(${tno}),event)">${openLabel}</button>`:''}
    ${(s.t==='doc'&&s.format!=='pdf')?`<button class="btn btn-o btn-s" onclick="exportSectionPdf(DB.packs['${CC_CODE}'][${tno}].secs[${si}],secCtx(${tno}),event)">⬇ Export as PDF</button>`:''}
    <button class="btn btn-o btn-s" onclick="closePop();editSecModal(${tno},${si})">✎ Edit</button>
    <button class="btn btn-ai btn-s" onclick="closePop();regenModal(${tno},${si})">↻ Regenerate</button>
    ${s.quizId?`<button class="btn btn-o btn-s" onclick="closePop();restrictModal('${s.quizId}')">⚙ Restrictions</button>`:''}
    <button class="btn btn-o btn-s" onclick="closePop();publishOneModal(${tno},${si})">${s.pub?'Unpublish…':'Publish…'}</button>
    <button class="btn btn-d btn-s" onclick="closePop();removeSecModal(${tno},${si})">✕ Remove</button>
  </div>`,evt,420);
}
function editSecModal(tno,si){
  const s=DB.packs[CC_CODE][tno].secs[si];
  openModal(`<h3>Edit section — ${s.label}</h3>
  <div class="frm">
    <div><label>Section label</label><input id="secEditLabel" value="${s.label}" style="width:100%"></div>
    <div><label>Content (editable draft)</label><textarea id="secEditContent" rows="7" style="width:100%">${s.preview||''}</textarea></div>
    <div class="row"><div><label>Syllabus mapping</label><input value="${s.sub}" style="width:100%" disabled></div>
    <div><label>Origin</label><input value="${s.t==='file'?'Instructor upload':'AI-generated (instructor-reviewed)'}" disabled style="width:100%"></div></div>
    <div class="note-ai note">Saving an edit triggers the <b>AI Consistency Checker</b> on related sections of this topic, and updates the real file this section opens as.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveSecEdit(${tno},${si})">Save & check</button></div>
  </div>`);
}
function saveSecEdit(tno,si){
  const s=DB.packs[CC_CODE][tno].secs[si];
  const labelEl=$('secEditLabel'), contentEl=$('secEditContent');
  if(labelEl&&labelEl.value.trim()) s.label=labelEl.value.trim();
  if(contentEl) s.preview=contentEl.value;
  saveDB();
  closeModal(); refreshContentSheet();
  toast('Section saved — consistency check running on Topic '+tno+'…');
}
function regenModal(tno,si){
  const s=DB.packs[CC_CODE][tno].secs[si];
  openModal(`<h3>Regenerate — ${s.label} <span class="ai-badge">FIXED PROMPT</span></h3>
  <div class="frm">
    <div class="note-ai note" style="margin:0">Only this section is regenerated, using its fixed template auto-filled from Topic ${tno}'s current items. Your other sections are untouched.</div>
    <div><label>Handling of your manual edits</label>
      <div class="seg"><button class="on" type="button">Keep my edits, regenerate around them</button><button type="button">Full regenerate (discard edits)</button></div></div>
    <div><label>Optional guidance note to the generator (kept within syllabus scope)</label><textarea rows="2" style="width:100%" placeholder="e.g. use more local examples"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-ai" onclick="closeModal();toast('Regenerating via fixed template… draft replaced for your review.')">↻ Regenerate draft</button></div>
  </div>`);
}
function addSectionPop(tno,evt){
  CC_FOCUS_TOPIC=tno;
  openPop(`<h4>Add section to Topic ${tno}</h4>
  <div class="kv"><b>Choose a type</b>(opens a form modal)</div>
  <div class="pop-acts">
    ${[['doc','📄 Document'],['ppt','📽️ Presentation'],['quiz','✅ Quiz (MCQ)'],['file','📎 File'],['url','🔗 URL'],['label','🏷️ Label']].map(x=>`<button class="btn btn-o btn-s" onclick="closePop();addSectionModal(${tno},'${x[0]}','${x[1].replace(/'/g,'')}')">${x[1]}</button>`).join('')}
  </div>`,evt,380);
}
function addSectionModal(tno,type,label){
  openModal(`<h3>Add ${label} — Topic ${tno}</h3>
  <div class="frm">
    <div><label>Title / label</label><input id="asTitle" placeholder="e.g. ${type==='quiz'?'Recap Quiz — Networking':'Supplementary — '+label}" style="width:100%"></div>
    ${type==='quiz'?`<div class="row"><div><label>Items (MCQ only)</label><input type="number" value="3" style="width:100%"></div><div><label>Timer (minutes)</label><input type="number" value="15" style="width:100%"></div></div>
    <div><label>Source</label><div class="seg"><button class="on" type="button">⚡ AI-draft from this topic</button><button type="button">Write items manually</button></div></div>`
    :type==='url'?`<div><label>Link</label><input id="asContent" placeholder="https://…" style="width:100%"></div>`
    :type==='file'?`<div><label>File</label><input type="file" style="width:100%"></div>
    <div><label>Format</label><select id="asFormat" style="width:100%"><option value="pdf" selected>PDF</option><option value="word">Word (.docx)</option><option value="excel">Excel (.xlsx)</option></select></div>`
    :`<div><label>Content ${type==='ppt'?'(or ⚡ AI-draft below)':''}</label><textarea id="asContent" rows="4" style="width:100%" placeholder="Write content or generate a draft…"></textarea></div>
    ${type==='doc'?`<div><label>Format</label><select id="asFormat" style="width:100%"><option value="word" selected>Word (.docx)</option><option value="excel">Excel (.xlsx)</option></select></div>`:''}
    ${type!=='label'?`<div><label>Source</label><div class="seg"><button class="on" type="button">⚡ AI-draft from this topic</button><button type="button">Write manually</button></div></div>`:''}`}
    <div><label>Syllabus mapping</label><input value="${CC_CODE} · Topic ${tno}" disabled style="width:100%"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveAddSection(${tno},'${type}','${label.replace(/'/g,"\\'")}')">Add as draft</button></div>
  </div>`);
}
function saveAddSection(tno,type,label){
  const t=DB.syllabi[CC_CODE].topics.find(x=>x.no===tno);
  const titleEl=$('asTitle');
  const title=(titleEl&&titleEl.value.trim())||('Instructor-added '+label);
  const contentEl=$('asContent');
  const content=contentEl?contentEl.value.trim():'';
  const formatEl=$('asFormat');
  const sec={t:type, label:title, sub:`${CC_CODE} · Topic ${tno} · instructor-added`, pub:false,
    preview:content||('Instructor-added '+label+' for '+t.title+' — edit to add full content.')};
  if(type==='doc'||type==='file') sec.format=formatEl?formatEl.value:(type==='file'?'pdf':'word');
  if(type==='quiz'){
    const quizId=`gen_${CC_CODE.replace(/\s+/g,'')}_T${tno}_add${Date.now()}`;
    DB.quizzes[quizId]=buildGeneratedQuiz(CC_CODE,t,title);
    sec.quizId=quizId; sec.label=`${title} (${DB.quizzes[quizId].items.length} items)`;
  } else if(type==='url'){
    sec.url=content||'https://example.org';
  }
  DB.packs[CC_CODE][tno].secs.push(sec);
  saveDB();
  closeModal(); refreshContentSheet();
  toast('Section added as draft — review before publishing.');
}
/* Uploads attach to one specific subtopic (not the topic in general), so
   supplementary material is scoped to the exact part of the syllabus it
   supports — mirrors how AI-generated sections already map to one item. */
function uploadsForSubtopic(tno,subName){
  const p=DB.packs[CC_CODE]&&DB.packs[CC_CODE][tno];
  return p?p.secs.filter(s=>s.subtopic===subName):[];
}
function uploadModal(tno,subName){
  CC_FOCUS_TOPIC=tno;
  const t=DB.syllabi[CC_CODE].topics.find(x=>x.no===tno);
  openModal(`<h3>Upload notes / documents</h3>
  <div class="lock-note" style="margin-bottom:10px">T${tno} · ${t.title} · attached to subtopic “${subName}”</div>
  <div class="frm">
    <div><label>Files (PDF, DOCX, PPTX, images)</label><input type="file" multiple style="width:100%"></div>
    <div><label>Label</label><input id="upLabel" placeholder="e.g. Supplementary reading — ${subName}" style="width:100%"></div>
    <div class="note">Uploads are instructor-origin sections attached to this specific subtopic: they appear in the topic pack, are publishable per section, and are included in consistency scans.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveUpload(${tno},'${subName.replace(/'/g,"\\'")}')">Upload</button></div>
  </div>`);
}
function saveUpload(tno,subName){
  const t=DB.syllabi[CC_CODE].topics.find(x=>x.no===tno);
  const labelEl=$('upLabel');
  const label=(labelEl&&labelEl.value.trim())||`Instructor upload — ${subName}`;
  const sec={t:'file', format:'pdf', label, sub:`${subName} · Topic ${tno} resources`, pub:false, subtopic:subName,
    preview:`Instructor-uploaded resource attached specifically to the “${subName}” subtopic of ${t.title} · included in consistency scans.`};
  DB.packs[CC_CODE][tno].secs.push(sec);
  saveDB();
  closeModal(); refreshContentSheet();
  toast('Uploaded — attached to “'+subName+'” (Topic '+tno+').');
}
/* ---- Publish / hide — real, persisted (topic-level master switch + per-section toggle) ---- */
function toggleTopicPub(tno){
  CC_FOCUS_TOPIC=tno;
  const p=DB.packs[CC_CODE][tno]; const willPublish=!p.topicPub;
  openModal(`<h3>${willPublish?'Publish':'Hide'} Topic ${tno}${willPublish?'':' from students'}?</h3>
  <p style="font-size:13.5px;margin-bottom:12px">${willPublish?'All published sections of this topic become visible to your assigned sections right away.':'Students immediately lose access to every section of this topic (records are kept; you can re-publish anytime).'}</p>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
  <button class="btn ${willPublish?'btn-p':'btn-d'}" onclick="setTopicPub(${tno},${willPublish})">${willPublish?'Publish to students':'Hide from students'}</button></div>`);
}
function setTopicPub(tno,val){
  DB.packs[CC_CODE][tno].topicPub=val; saveDB();
  closeModal(); refreshContentSheet();
  toast('Topic '+tno+(val?' published to students.':' hidden from students.'));
}
function publishOneModal(tno,si){
  const s=DB.packs[CC_CODE][tno].secs[si];
  openModal(`<h3>${s.pub?'Unpublish':'Publish'} — ${s.label}</h3>
  <p style="font-size:13.5px;margin-bottom:12px">${s.pub?'Students will no longer see this section (records are kept).':'This section becomes visible to the selected sections. If it is a graded activity, its scoring-sheet column is created automatically and fills as students answer.'}</p>
  <div class="frm">
   ${myAssignments().find(x=>x.code===CC_CODE).sections.map(x=>`<label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" checked style="width:16px;height:16px"> ${x}</label>`).join('')}
   <div style="display:flex;gap:8px;justify-content:flex-end">
    <button class="btn btn-o" onclick="closeModal()">Cancel</button>
    <button class="btn btn-p" onclick="setSectionPub(${tno},${si},${!s.pub})">${s.pub?'Unpublish':'Publish'}</button></div>
  </div>`);
}
function setSectionPub(tno,si,val){
  const s=DB.packs[CC_CODE][tno].secs[si];
  s.pub=val; saveDB();
  closeModal(); refreshContentSheet();
  toast(val?'Published to selected sections.':'Unpublished.');
}
/* Every planned-item kind maps to exactly one of the paper's three AI
   categories (doc/ppt/quiz); "format" picks Word vs Excel for Documents
   (auto by content nature — tabular/scored items get Excel, narrative
   guides get Word; PDF is always offered as a one-click export). */
const GEN={
 lecture:{cat:'doc',label:'Lecture Notes',format:'word'},
 ppt:{cat:'ppt',label:'Presentation'},
 demo:{cat:'doc',label:'Demonstration Guide',format:'word'},
 video:{cat:'doc',label:'Video Discussion Guide',format:'word'},
 quiz:{cat:'quiz',label:'MCQ Quiz'},
 recit:{cat:'doc',label:'Recitation Guide',format:'word'},
 act:{cat:'doc',label:'Activity Document',format:'word'},
 case:{cat:'doc',label:'Case Study Brief',format:'word'},
 debate:{cat:'doc',label:'Debate Guide',format:'word'},
 workshop:{cat:'doc',label:'Workshop Guide',format:'word'},
 career:{cat:'doc',label:'Career Talk Guide',format:'word'},
 research:{cat:'doc',label:'Guided Research Brief',format:'word'},
 brainstorm:{cat:'doc',label:'Brainstorming Guide',format:'word'},
 paper:{cat:'doc',label:'Paper Brief',format:'word'},
 seat:{cat:'doc',label:'Seatwork Sheet',format:'excel'},
 lab:{cat:'doc',label:'Laboratory Guide',format:'word'},
 prac:{cat:'doc',label:'Practical Exercise + Rubric',format:'excel'},
 out:{cat:'doc',label:'Output Submission Brief',format:'word'},
 rubric:{cat:'doc',label:'Rubric Sheet',format:'excel'},
 capstone:{cat:'doc',label:'Capstone Project Brief',format:'excel'}
};
const GEN_FALLBACK={cat:'doc',label:'Activity Document',format:'word'};
/* Builds the section's `preview` text — the single source of truth filegen.js
   later parses into real paragraphs/slides/rubric rows when the file is opened. */
function genPreviewText(it,topic,cat,format){
  const own=`${it.n} — ${it.d||('AI-drafted coverage of "'+it.n+'" within the scope of Topic '+topic.no+'.')}`;
  if(cat==='ppt'){
    const picks=topicSubtopics(topic).slice(0,3).map(s=>s.n);
    const mid=picks.map((n,i)=>`S${i+3} ${n}`).join(' · ');
    const lastNo=3+picks.length;
    return `S1 Title · S2 Objectives${mid?' · '+mid:''} · S${lastNo} Summary · S${lastNo+1} Assessment preview`;
  }
  if(format==='excel') return `${own}\nAccuracy — 40 pts\nCompleteness — 40 pts\nPresentation — 20 pts`;
  const extra=topicSubtopics(topic).slice(0,2).map(s=>`${s.n} — ${s.d||('Coverage of "'+s.n+'" within Topic '+topic.no+'.')}`);
  return [own,...extra].join('\n');
}
function genTopic(no,btn){
  CC_FOCUS_TOPIC=no;
  const t=DB.syllabi[CC_CODE].topics.find(x=>x.no===no);
  btn.disabled=true;
  const box=document.createElement('div'); box.className='gen-log'; box.style.marginTop='10px';
  btn.parentElement.appendChild(box);
  const items=topicPlan(t);
  const tplName=k=>{const g=GEN[k]||GEN_FALLBACK; return g.cat==='ppt'?'EduPulse-PPT v1':g.cat==='quiz'?'EduPulse-QUIZ v1':'EduPulse-DOC v1';};
  const steps=[
    `Parsing ${CC_CODE} Topic ${no} → ${topicSubtopics(t).length} subtopics · ${items.length} planned items`,
    ...items.map(it=>`<span class="ai">${tplName(it.k)}</span> → ${(GEN[it.k]||GEN_FALLBACK).label}: "${it.n}" … done`),
    `Labeling & sectioning: T${no} · content-scope map · source plan attached`,
    `<span class="ok">✔ Draft content pack created — ${items.length} sections awaiting your review (not visible to students)</span>`];
  let i=0;
  const timer=setInterval(()=>{
    box.innerHTML+=steps[i]+'<br>'; box.scrollTop=1e4;
    if(++i>=steps.length){clearInterval(timer);
      DB.packs[CC_CODE]=DB.packs[CC_CODE]||{};
      DB.packs[CC_CODE][no]={gen:true, topicPub:false, secs:items.map((it,ix)=>{
        const g=GEN[it.k]||GEN_FALLBACK;
        let quizId=null;
        if(g.cat==='quiz'){
          quizId=`gen_${CC_CODE.replace(/\s+/g,'')}_T${no}_${ix}`;
          DB.quizzes[quizId]=buildGeneratedQuiz(CC_CODE,t,it.n);
        }
        const preview=g.cat==='quiz' ? 'Secure MCQ quiz — opens in the in-app secure answering environment.' : genPreviewText(it,t,g.cat,g.format);
        return {t:g.cat, ...(g.format?{format:g.format}:{}), label:`${g.label} — ${t.title}${quizId?' ('+DB.quizzes[quizId].items.length+' items)':''}`, sub:`${it.n} · mapped: T${no}`, pub:false,
          preview, ...(quizId?{quizId}:{})};
      })};
      saveDB();
      setTimeout(refreshContentSheet,900);
    }
  },480);
}
function restrictModal(qid){
  const q=DB.quizzes[qid];
  const r={...DEFAULT_RESTRICT, ...(q.restrict||{})};
  openModal(`<h3>Activity restrictions & anti-cheat — ${q.title}</h3>
  <div class="frm">
    <div class="row"><div><label>Opens</label><input type="datetime-local" style="width:100%" value="2026-07-06T08:00"></div>
    <div><label>Closes</label><input type="datetime-local" style="width:100%" value="2026-07-06T17:00"></div></div>
    <div class="row"><div><label>Time limit (countdown, minutes)</label><input id="rMins" type="number" min="1" value="${q.mins}" style="width:100%"></div>
    <div><label>Attempts allowed</label><select style="width:100%"><option>1</option><option>2</option></select></div></div>
    <div><label>Completion prerequisite</label><select style="width:100%"><option>None</option><option selected>Requires: Lecture Notes (same topic) opened</option><option>Requires: previous topic's quiz submitted</option></select></div>
    <div class="row"><div><label>Shuffle questions & options</label><select style="width:100%"><option selected>On</option><option>Off</option></select></div>
    <div><label>Score release</label><select style="width:100%"><option>Immediately after close</option><option selected>Manual release</option></select></div></div>
    <div><label>Violations allowed (switching tabs, exiting fullscreen, back-navigation) before the policy below triggers</label>
      <input id="rMaxViol" type="number" min="1" value="${r.maxViol}" style="width:100%"></div>
    <div><label>What happens once the violation limit is reached</label>
      <select id="rPolicy" style="width:100%" onchange="updateRestrictNote(this.value)">
        ${VIOLATION_POLICIES.map(p=>`<option value="${p.k}" ${p.k===r.policy?'selected':''}>${p.label}</option>`).join('')}
      </select>
      <div class="lock-note" id="rPolicyNote" style="margin-top:4px">${(VIOLATION_POLICIES.find(p=>p.k===r.policy)||{}).note||''}</div>
    </div>
    <div id="rDeductRow" class="${r.policy!=='deduct'?'hidden':''}"><label>Points deducted per violation (off the raw item score)</label><input id="rDeduct" type="number" min="0" step="0.5" value="${r.deductPerViolation}" style="width:100%"></div>
    <div class="note-warn note"><b>Always fixed, regardless of policy:</b> full-screen locked popover · <b>each choice hidden individually, revealed only on hover</b> · copying/right-click disabled · timer expiry always auto-submits the whole attempt. Students see the configured rules before starting.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="saveRestrictModal('${qid}')">Save configuration</button></div>
  </div>`);
}
function updateRestrictNote(k){
  $('rPolicyNote').textContent=(VIOLATION_POLICIES.find(p=>p.k===k)||{}).note||'';
  $('rDeductRow').classList.toggle('hidden',k!=='deduct');
}
function saveRestrictModal(qid){
  const q=DB.quizzes[qid];
  q.mins=Math.max(1,parseInt($('rMins').value,10)||q.mins);
  q.restrict={
    maxViol:Math.max(1,parseInt($('rMaxViol').value,10)||DEFAULT_RESTRICT.maxViol),
    policy:$('rPolicy').value,
    deductPerViolation:Math.max(0,parseFloat($('rDeduct').value)||DEFAULT_RESTRICT.deductPerViolation)
  };
  saveDB();
  closeModal(); refreshContentSheet();
  toast('Restrictions saved — applied to every attempt of this quiz.');
}
function removeSecModal(tno,si){
  openModal(`<h3>Remove section?</h3>
  <p style="font-size:13.5px;margin-bottom:12px">The section is archived (recoverable) and the consistency checker re-scans Topic ${tno}.</p>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
  <button class="btn btn-d" onclick="closeModal();toast('Section removed — topic re-scan queued.')">Remove</button></div>`);
}
