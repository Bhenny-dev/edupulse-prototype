/* ============================================================
   EduPulse — content-system.js
   Course Content: per-topic AI-generated packs, section actions,
   topic-level publish/hide (real, persisted), fixed prompts.
============================================================ */
let CC_CODE=null;
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
function insContent(){
  const params=new URLSearchParams(location.search);
  const qCode=params.get('code'), qTopic=params.get('topic');
  CC_CODE=(qCode&&myAssignments().some(x=>x.code===qCode))?qCode:(CC_CODE||myAssignments()[0].code);
  const sy=DB.syllabi[CC_CODE]; const packs=DB.packs[CC_CODE]||{};
  view().innerHTML=`
  <div class="tabs">${myAssignments().map(x=>`<button class="tab ${x.code===CC_CODE?'on':''}" onclick="CC_CODE='${x.code}';insContent()">${x.code}</button>`).join('')}
   <span style="flex:1"></span><span class="lock-note" style="align-self:center">Subject assigned by the Dean · ${myAssignments().find(x=>x.code===CC_CODE).sections.join(' · ')}</span></div>
  <div class="note-ai note" style="margin-top:0"><b>AI generation is syllabus-mapped:</b> one generated section per non-subtopic item of each topic.
   <a href="#" onclick="showPrompt('ppt');return false" style="color:var(--ai);font-weight:700">PPT prompt</a> ·
   <a href="#" onclick="showPrompt('doc');return false" style="color:var(--ai);font-weight:700">DOC prompt</a> ·
   <a href="#" onclick="showPrompt('quiz');return false" style="color:var(--ai);font-weight:700">QUIZ prompt</a></div>
  ${sy.topics.filter(t=>!t.title.includes('EXAM')).map(t=>{
    const p=packs[t.no];
    const subs=topicSubtopics(t), plan=topicPlan(t);
    const expand=qTopic?Number(qTopic)===t.no:t.no===1;
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
          <div class="acts">${s.pub?chip('Published','c-ok'):chip('Draft','c-mut')}<span class="chip c-mut">Actions ▾</span></div></div>`).join('')
        + `<div class="kv" style="margin-top:10px"><b>Attach an upload to a specific subtopic</b></div>
           <div class="subtopics">${subs.length?subs.map(s=>{const n=uploadsForSubtopic(t.no,s.n).length;
             return `<span class="st click" onclick="uploadModal(${t.no},'${s.n.replace(/'/g,"\\'")}')" title="Upload notes/documents for this subtopic">⤴ ${s.n}${n?' ('+n+')':''}</span>`;}).join('')
             :'<span class="lock-note">No subtopics to attach uploads to.</span>'}</div>
           <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
           <button class="btn btn-o btn-s" onclick="addSectionPop(${t.no},event)">+ Add section ▾</button>
           <button class="btn ${p.topicPub?'btn-o':'btn-p'} btn-s" onclick="toggleTopicPub(${t.no})">${p.topicPub?'🔒 Hide topic from students':'✅ Publish topic to students'}</button></div>`
      : `<div class="note">No content yet. The AI will parse this topic — ${subs.length} subtopic(s) + ${plan.length} planned item(s) (<i>${plan.map(x=>x.n).join(', ')}</i>) — and generate one labeled section per planned item for your review.</div>
         <button class="btn btn-ai" onclick="genTopic(${t.no},this)">⚡ Generate Topic ${t.no} pack with AI</button>`}
    </div></div>`;}).join('')}`;
  if(qTopic){ const el=document.querySelector('[data-topic="'+qTopic+'"]'); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function secPop(tno,si,evt){
  const s=DB.packs[CC_CODE][tno].secs[si];
  openPop(`<h4>${TICON[s.t][0]} ${s.label}</h4>
  <div class="kv"><b>Mapping</b>${s.sub}</div>
  <div class="kv"><b>Content preview</b><span style="white-space:pre-line;font-size:12px;color:#3A4160">${(s.preview||'—').slice(0,260)}${s.preview&&s.preview.length>260?'…':''}</span></div>
  <div class="pop-acts">
    ${(s.url||s.html)?`<button class="btn btn-p btn-s" onclick="openSection(DB.packs['${CC_CODE}'][${tno}].secs[${si}])">📖 Open full document</button>`:''}
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
    <div><label>Section label</label><input value="${s.label}" style="width:100%"></div>
    <div><label>Content (editable draft)</label><textarea rows="7" style="width:100%">${s.preview||''}</textarea></div>
    <div class="row"><div><label>Syllabus mapping</label><input value="${s.sub}" style="width:100%" disabled></div>
    <div><label>Origin</label><input value="${s.t==='file'?'Instructor upload':'AI-generated (instructor-reviewed)'}" disabled style="width:100%"></div></div>
    <div class="note-ai note">Saving an edit triggers the <b>AI Consistency Checker</b> on related sections of this topic.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="closeModal();toast('Section saved — consistency check running on Topic ${tno}…')">Save & check</button></div>
  </div>`);
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
  openPop(`<h4>Add section to Topic ${tno}</h4>
  <div class="kv"><b>Choose a type</b>(opens a form modal)</div>
  <div class="pop-acts">
    ${[['notes','📄 Page / Notes'],['ppt','📽️ Presentation'],['quiz','✅ Quiz (MCQ)'],['act','🧩 Activity'],['file','📎 File'],['url','🔗 URL'],['label','🏷️ Label']].map(x=>`<button class="btn btn-o btn-s" onclick="closePop();addSectionModal(${tno},'${x[0]}','${x[1].replace(/'/g,'')}')">${x[1]}</button>`).join('')}
  </div>`,evt,380);
}
function addSectionModal(tno,type,label){
  openModal(`<h3>Add ${label} — Topic ${tno}</h3>
  <div class="frm">
    <div><label>Title / label</label><input id="asTitle" placeholder="e.g. ${type==='quiz'?'Recap Quiz — Networking':'Supplementary — '+label}" style="width:100%"></div>
    ${type==='quiz'?`<div class="row"><div><label>Items (MCQ only)</label><input type="number" value="3" style="width:100%"></div><div><label>Timer (minutes)</label><input type="number" value="15" style="width:100%"></div></div>
    <div><label>Source</label><div class="seg"><button class="on" type="button">⚡ AI-draft from this topic</button><button type="button">Write items manually</button></div></div>`
    :type==='url'?`<div><label>Link</label><input id="asContent" placeholder="https://…" style="width:100%"></div>`
    :type==='file'?`<div><label>File</label><input type="file" style="width:100%"></div>`
    :`<div><label>Content ${type==='ppt'?'(or ⚡ AI-draft below)':''}</label><textarea id="asContent" rows="4" style="width:100%" placeholder="Write content or generate a draft…"></textarea></div>
    ${type!=='label'?`<div><label>Source</label><div class="seg"><button class="on" type="button">⚡ AI-draft from this topic</button><button type="button">Write manually</button></div></div>`:''}`}
    <div><label>Syllabus mapping</label><input value="${CC_CODE} · Topic ${tno}" disabled style="width:100%"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveAddSection(${tno},'${type}','${label.replace(/'/g,"\\'")}')">Add as draft</button></div>
  </div>`);
}
function saveAddSection(tno,type,label){
  const t=DB.syllabi[CC_CODE].topics.find(x=>x.no===tno);
  const c=DB.curriculum.find(x=>x.code===CC_CODE);
  const titleEl=$('asTitle');
  const title=(titleEl&&titleEl.value.trim())||('Instructor-added '+label);
  const contentEl=$('asContent');
  const content=contentEl?contentEl.value.trim():'';
  const TMAP={notes:'notes',ppt:'ppt',quiz:'quiz',act:'act',file:'file',url:'url',label:'label'};
  const st=TMAP[type]||'notes';
  const sec={t:st, label:title, sub:`${CC_CODE} · Topic ${tno} · instructor-added`, pub:false,
    preview:content||('Instructor-added '+label+' for '+t.title+' — edit to add full content.')};
  if(type==='quiz'){
    const quizId=`gen_${CC_CODE.replace(/\s+/g,'')}_T${tno}_add${Date.now()}`;
    DB.quizzes[quizId]=buildGeneratedQuiz(CC_CODE,t,title);
    sec.quizId=quizId; sec.label=`${title} (${DB.quizzes[quizId].items.length} items)`;
  } else if(type==='url'){
    sec.url=content||'https://example.org';
  } else if(type!=='label'){
    sec.html=buildDocHtml({docType:label, title, courseCode:CC_CODE, courseTitle:c.title, topicNo:tno, topicTitle:t.title,
      bodyHtml:`<h2>${title}</h2><div class="mapping">Mapped to: Topic ${tno} · ${t.title} · instructor-added</div><p>${content||('Instructor-added '+label+'.')}</p>`});
  }
  DB.packs[CC_CODE][tno].secs.push(sec);
  saveDB();
  closeModal(); insContent();
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
  const c=DB.curriculum.find(x=>x.code===CC_CODE);
  const labelEl=$('upLabel');
  const label=(labelEl&&labelEl.value.trim())||`Instructor upload — ${subName}`;
  const sec={t:'file', label, sub:`${subName} · Topic ${tno} resources`, pub:false, subtopic:subName,
    preview:`Instructor-uploaded resource for “${subName}” · included in consistency scans.`,
    html:buildDocHtml({docType:'Instructor Upload', title:label, courseCode:CC_CODE, courseTitle:c.title, topicNo:tno, topicTitle:t.title,
      bodyHtml:`<p class="mapping">Instructor upload · ${t.title} · Subtopic: ${subName}</p><p><b>${label}</b></p><p>Uploaded resource attached specifically to the “${subName}” subtopic. In the full system the original file (PDF/DOCX/PPTX) is stored and served here.</p>`})};
  DB.packs[CC_CODE][tno].secs.push(sec);
  saveDB();
  closeModal(); insContent();
  toast('Uploaded — attached to “'+subName+'” (Topic '+tno+').');
}
/* ---- Publish / hide — real, persisted (topic-level master switch + per-section toggle) ---- */
function toggleTopicPub(tno){
  const p=DB.packs[CC_CODE][tno]; const willPublish=!p.topicPub;
  openModal(`<h3>${willPublish?'Publish':'Hide'} Topic ${tno}${willPublish?'':' from students'}?</h3>
  <p style="font-size:13.5px;margin-bottom:12px">${willPublish?'All published sections of this topic become visible to your assigned sections right away.':'Students immediately lose access to every section of this topic (records are kept; you can re-publish anytime).'}</p>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
  <button class="btn ${willPublish?'btn-p':'btn-d'}" onclick="setTopicPub(${tno},${willPublish})">${willPublish?'Publish to students':'Hide from students'}</button></div>`);
}
function setTopicPub(tno,val){
  DB.packs[CC_CODE][tno].topicPub=val; saveDB();
  closeModal(); insContent();
  toast('Topic '+tno+(val?' published to students.':' hidden from students.'));
}
function publishOneModal(tno,si){
  const s=DB.packs[CC_CODE][tno].secs[si];
  openModal(`<h3>${s.pub?'Unpublish':'Publish'} — ${s.label}</h3>
  <p style="font-size:13.5px;margin-bottom:12px">${s.pub?'Students will no longer see this section (records are kept).':'This section becomes visible to the selected sections. If it is graded, its grading-sheet column is auto-created.'}</p>
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
  closeModal(); insContent();
  toast(val?'Published to selected sections.':'Unpublished.');
}
function genTopic(no,btn){
  const t=DB.syllabi[CC_CODE].topics.find(x=>x.no===no);
  const c=DB.curriculum.find(x=>x.code===CC_CODE);
  btn.disabled=true;
  const box=document.createElement('div'); box.className='gen-log'; box.style.marginTop='10px';
  btn.parentElement.appendChild(box);
  const items=topicPlan(t);
  const GEN={lecture:['notes','Lecture Notes'],ppt:['ppt','Presentation'],demo:['notes','Demonstration Guide'],video:['act','Video Discussion Guide'],quiz:['quiz','MCQ Quiz'],recit:['act','Recitation Guide'],act:['act','Activity Document'],case:['act','Case Study Brief'],debate:['act','Debate Guide'],workshop:['act','Workshop Guide'],career:['act','Career Talk Guide'],research:['act','Guided Research Brief'],brainstorm:['act','Brainstorming Guide'],paper:['act','Paper Brief + Rubric'],seat:['act','Seatwork Sheet'],lab:['act','Laboratory Guide'],prac:['act','Practical Exercise + Rubric'],out:['act','Output Submission Brief'],rubric:['act','Rubric Sheet'],capstone:['act','Capstone Project Brief']};
  const tplName=k=>k==='ppt'?'EduPulse-PPT v1':k==='quiz'?'EduPulse-QUIZ v1':'EduPulse-DOC v1';
  const steps=[
    `Parsing ${CC_CODE} Topic ${no} → ${topicSubtopics(t).length} subtopics · ${items.length} planned items`,
    ...items.map(it=>`<span class="ai">${tplName(it.k)}</span> → ${(GEN[it.k]||['act','Activity Document'])[1]}: "${it.n}" … done`),
    `Labeling & sectioning: T${no} · content-scope map · source plan attached`,
    `<span class="ok">✔ Draft content pack created — ${items.length} sections awaiting your review (not visible to students)</span>`];
  let i=0;
  const timer=setInterval(()=>{
    box.innerHTML+=steps[i]+'<br>'; box.scrollTop=1e4;
    if(++i>=steps.length){clearInterval(timer);
      DB.packs[CC_CODE]=DB.packs[CC_CODE]||{};
      DB.packs[CC_CODE][no]={gen:true, topicPub:false, secs:items.map((it,ix)=>{
        const g=GEN[it.k]||['act','Activity Document'];
        let quizId=null;
        if(it.k==='quiz'){
          quizId=`gen_${CC_CODE.replace(/\s+/g,'')}_T${no}_${ix}`;
          DB.quizzes[quizId]=buildGeneratedQuiz(CC_CODE,t,it.n);
        }
        const bodyHtml = it.k==='quiz'
          ? `<p>Secure MCQ quiz — opens in the in-app secure answering environment (not a static document).</p>`
          : `<h2>${it.n}</h2><div class="mapping">Mapped to: Topic ${no} · ${t.title}</div><p>${it.d||('AI-drafted coverage of "'+it.n+'" within the scope of Topic '+no+'.')}</p>`;
        const html = it.k==='quiz' ? null : buildDocHtml({docType:g[1], title:`${g[1]} — ${t.title}`, courseCode:CC_CODE, courseTitle:c.title, topicNo:no, topicTitle:t.title, bodyHtml});
        return {t:g[0], label:`${g[1]} — ${t.title}${quizId?' ('+DB.quizzes[quizId].items.length+' items)':''}`, sub:`${it.n} · mapped: T${no}`, pub:false,
          preview:'AI-drafted content mapped to '+t.title+' — open Edit to review the full draft.',
          ...(html?{html}:{}), ...(quizId?{quizId}:{})};
      })};
      saveDB();
      setTimeout(insContent,900);
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
  closeModal(); insContent();
  toast('Restrictions saved — applied to every attempt of this quiz.');
}
function removeSecModal(tno,si){
  openModal(`<h3>Remove section?</h3>
  <p style="font-size:13.5px;margin-bottom:12px">The section is archived (recoverable) and the consistency checker re-scans Topic ${tno}.</p>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
  <button class="btn btn-d" onclick="closeModal();toast('Section removed — topic re-scan queued.')">Remove</button></div>`);
}
