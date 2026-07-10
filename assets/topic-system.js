/* ============================================================
   EduPulse — topic-system.js
   Syllabus Builder: three strict hierarchy levels, each with its own
   add/edit flow and its own drag-to-reorder — never flattened together:
     Topic (topicModal)
       → Subtopic (subtopicModal) — a container, not a content category
         → Categorized content: material/assessment (itemModal) — only
           the two real category sets (Teaching & Learning Materials,
           Activities & Assessments) are selectable here.
   Storage stays one flat `items[]` per topic (a subtopic marker followed
   by the items that belong to it, until the next marker) — topicPop /
   subtopicPop group it into that hierarchy for display and reordering.
   Used by Instructor pages AND by the Dean's "Open syllabus (Dean edit)"
   action.
============================================================ */
function insSyl(){
  view().innerHTML=`
  <div class="note" style="margin-top:0">Each subject assigned to you by the Dean has its <b>own individual syllabus</b>. Open a subject to construct its plan — topics, each with a unified list of subtopics and planned lessons/activities. The Dean can also edit any syllabus.</div>
  ${myAssignments().map(x=>{const c=DB.curriculum.find(k=>k.code===x.code);const sy=DB.syllabi[x.code];return `
  <div class="card click subj-card" onclick="openSyllabusSheet('${x.code}',false)">
    <div class="sc-ic">📘</div>
    <div style="flex:1"><b>${x.code} — ${c.title}</b><small>${sy.topics.length} topics · ${c.units} units · sections ${x.sections.join(', ')} · Term scheme: ${schemeLabel()} (Dean-set)</small></div>
    <span class="chip c-mut">Open syllabus →</span>
  </div>`;}).join('')}`;
}
let SYL_CODE=null, SYL_DEAN=false;
/* ---- Auto-scheduled timeframes: each topic's `weeks` label (e.g. "Wk 5–6")
   is derived, never typed — from its own duration (`dur`, in weeks) and its
   position among the other topics. Reordering (drag-drop), adding, editing a
   duration, or removing a topic all recompute every topic's label so the
   plan always reads as one continuous, gap-free week sequence. `topicDur`
   falls back to parsing legacy `weeks` strings for topics saved before this
   existed, then that becomes the topic's `dur` going forward. ---- */
function topicDur(t){
  if(t.dur) return t.dur;
  const m=(t.weeks||'').match(/Wk\s*(\d+)(?:\s*[–-]\s*(\d+))?/i);
  return m?(m[2]?Number(m[2])-Number(m[1])+1:1):1;
}
function recomputeTimeframes(sy){
  let wk=1;
  sy.topics.forEach(t=>{
    const dur=t.dur=topicDur(t);
    t.weeks=dur>1?`Wk ${wk}–${wk+dur-1}`:`Wk ${wk}`;
    wk+=dur;
  });
}
function computeStartWeek(ti){
  const sy=DB.syllabi[SYL_CODE];
  let wk=1;
  for(let idx=0;idx<sy.topics.length;idx++){
    if(idx===ti) break;
    wk+=topicDur(sy.topics[idx]);
  }
  return wk;
}
/* ---- Drag-and-drop topic reordering (native HTML5 DnD — desktop only,
   matches this prototype's existing no-extra-libraries overlay style). ---- */
let TOPIC_DRAG_FROM=null;
function topicDragStart(evt,i){
  TOPIC_DRAG_FROM=i;
  evt.dataTransfer.effectAllowed='move';
  evt.dataTransfer.setData('text/plain',String(i));
  evt.currentTarget.classList.add('dragging');
}
function topicDragEnd(evt){ evt.currentTarget.classList.remove('dragging'); }
function topicDrop(evt,i){
  evt.preventDefault();
  evt.currentTarget.classList.remove('drag-over');
  if(TOPIC_DRAG_FROM===null||TOPIC_DRAG_FROM===i){ TOPIC_DRAG_FROM=null; return; }
  const sy=DB.syllabi[SYL_CODE];
  const [moved]=sy.topics.splice(TOPIC_DRAG_FROM,1);
  sy.topics.splice(i,0,moved);
  const oldPacks=DB.packs[SYL_CODE]||{};
  const newPacks={};
  sy.topics.forEach((t,idx)=>{
    const oldNo=t.no; t.no=idx+1;
    if(oldPacks[oldNo]) newPacks[t.no]=oldPacks[oldNo];
  });
  DB.packs[SYL_CODE]=newPacks;
  recomputeTimeframes(sy);
  TOPIC_DRAG_FROM=null;
  saveDB();
  openSyllabusSheet(SYL_CODE,SYL_DEAN);
  toast('Topics reordered — timeframes recalculated.');
}
function openSyllabusSheet(code,deanMode){
  SYL_CODE=code; SYL_DEAN=!!deanMode;
  const sy=DB.syllabi[code]; const c=DB.curriculum.find(k=>k.code===code);
  openSheet('📘', code+' — '+c.title, `Individual syllabus · ${sy.period} · owner: ${sy.owner}${deanMode?' · DEAN EDIT MODE':''}`, `
   <div class="note" style="margin-top:0">KCP official format — course info, VMO, and program outcomes auto-filled from the curriculum entry. <b>Tap a time-framed topic</b> to open its subtopics (⠿ drag to reorder); <b>tap a subtopic</b> for its materials &amp; assessments, sequenced in one drag-reorderable list. Term scheme: <b>${schemeLabel()}</b> ${chip('fixed by Dean','c-teal')}
     <div style="margin-top:8px"><button class="btn btn-o btn-s" onclick="courseInfoPop()">ℹ️ Course description, grading & policy, references</button></div></div>
   <div class="lock-note" style="margin:2px 0 10px">⠿ Drag a topic by its handle to reorder — timeframes recompute automatically.</div>
   ${sy.topics.map((t,i)=>`
   <div class="sec-item click" draggable="true" ondragstart="topicDragStart(event,${i})" ondragend="topicDragEnd(event)" ondragover="event.preventDefault()" ondragenter="event.currentTarget.classList.add('drag-over')" ondragleave="event.currentTarget.classList.remove('drag-over')" ondrop="topicDrop(event,${i})" onclick="topicPop(${i})">
     <div class="drag-handle" title="Drag to reorder" onclick="event.stopPropagation()">⠿</div>
     <div class="tic" style="background:linear-gradient(150deg,#26327B,#1B2559);color:#fff;font-weight:800;font-size:11px">T${t.no}</div>
     <div><b>${t.title}</b><small>${t.weeks} · ${topicSubtopics(t).length} subtopics · ${topicPlan(t).length} planned item(s) · ${t.ilo}</small></div>
     <div class="acts">${t.items.slice(0,4).map(it=>`<span title="${PLAN_LABEL[it.k]||''}: ${it.n}">${PLAN_ICON[it.k]||'•'}</span>`).join(' ')}<span class="chip c-mut">Tap ▾</span></div>
   </div>`).join('')}
   <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
     <button class="btn btn-p" onclick="topicModal()">+ Add topic</button>
     ${deanMode?''
       :`<button class="btn btn-ai" onclick="closeSheet();location.href='content.html?code='+encodeURIComponent(SYL_CODE)">⚡ Generate content from this syllabus</button>`}
   </div>`);
}
function courseInfoPop(){
  const c=DB.curriculum.find(k=>k.code===SYL_CODE);
  openPop(`<h4>Course info — ${SYL_CODE}</h4>
  <div class="kv"><b>Course description</b>${c.desc||'Not yet documented for this subject — add it from Curriculum (Dean) or request the official syllabus copy.'}</div>
  <div class="kv"><b>Specifications</b><ul style="margin:4px 0 0 16px;padding:0">${(c.specs||['Not yet documented for this subject.']).map(s=>`<li style="margin-bottom:3px">${s}</li>`).join('')}</ul></div>
  <div class="kv"><b>Grading formula <span class="chip c-mut">official KCP syllabus · not computed in EduPulse</span></b><span style="white-space:pre-line">${DB.policy.grading}</span></div>
  <div class="kv"><b>Course policy <span class="chip c-mut">college-wide</span></b><ul style="margin:4px 0 0 16px;padding:0">${DB.policy.rules.map(r=>`<li style="margin-bottom:3px">${r}</li>`).join('')}</ul></div>
  <div class="kv"><b>References</b>${(c.refs||['Not yet documented for this subject.']).map(r=>`<div style="margin-bottom:2px">${r}</div>`).join('')}</div>
  `,null,520);
}
/* ---- New setting pipeline (v2.6): tap a time-framed TOPIC → its SUBTOPICS
   appear (⠿ draggable to reorder); tap a subtopic → the two category sets
   (Teaching & Learning Materials · Activities & Assessments) with their
   contents. Subtopics own the items that follow them in the flat `items[]`
   list, so no data migration is needed — the blocks are computed on render. */
function topicSubtopicBlocks(t){
  const blocks=[]; let cur=null; const lead=[];
  (t.items||[]).forEach((it,idx)=>{
    if(it.k==='subtopic'){ cur={sub:{...it,idx}, items:[]}; blocks.push(cur); }
    else if(cur){ cur.items.push({...it,idx}); }
    else { lead.push({...it,idx}); }
  });
  return {blocks, lead};
}
function topicPop(i){
  const t=DB.syllabi[SYL_CODE].topics[i];
  const {blocks,lead}=topicSubtopicBlocks(t);
  openPop(`<h4>T${t.no} · ${t.title} <span class="chip c-mut">${t.weeks}</span></h4>
  <div class="kv"><b>Intended Learning Outcome</b>${t.ilo}</div>
  <div class="kv"><b>Subtopics — ⠿ drag to reorder · tap one to open its sequenced contents</b></div>
  <div class="st-drag">${blocks.length?blocks.map((b,bi)=>`
    <div class="sec-item click" draggable="true" ondragstart="subDragStart(event,${i},${bi})" ondragend="subDragEnd(event)" ondragover="event.preventDefault()" ondragenter="event.currentTarget.classList.add('drag-over')" ondragleave="event.currentTarget.classList.remove('drag-over')" ondrop="subDrop(event,${i},${bi})" onclick="subtopicPop(${i},${b.sub.idx})">
      <div class="drag-handle" title="Drag to reorder" onclick="event.stopPropagation()">⠿</div>
      <div class="tic" style="background:linear-gradient(150deg,#26327B,#1B2559);color:#fff;font-weight:800;font-size:10px">S${bi+1}</div>
      <div style="flex:1"><b>${b.sub.n}</b><small>${b.items.length} item(s)${b.items.length?' · '+b.items.map(x=>PLAN_ICON[x.k]||'•').join(' '):''}</small></div>
      <span class="chip c-mut">Open ▾</span>
    </div>`).join(''):'<span class="lock-note">No subtopics yet — add one below.</span>'}</div>
  ${lead.length?`<div class="lock-note" style="margin-top:6px">${lead.length} item(s) not under any subtopic — use “Edit topic” to assign them.</div>`:''}
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();subtopicModal(${i})">+ Add subtopic</button>
    <button class="btn btn-o btn-s" onclick="closePop();topicModal(${i})">✎ Edit topic details</button>
    ${t.title.includes('EXAM')?'':`<button class="btn btn-d btn-s" onclick="closePop();removeTopicModal(${i})">Remove</button>`}
  </div>`,null,640);
}
/* Tap a subtopic → its materials & assessments, sequenced in one list
   (not split into fixed category sections) — ⠿ drag to change the order
   they're taught/assigned in, regardless of category. */
function subtopicPop(ti,subIdx){
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const {blocks}=topicSubtopicBlocks(t);
  const b=blocks.find(x=>x.sub.idx===subIdx);
  if(!b){ topicPop(ti); return; }
  const insertAt=(b.items.length?b.items[b.items.length-1].idx:subIdx)+1;
  openPop(`<h4>📚 ${b.sub.n} <span class="chip c-mut">T${t.no} · ${t.title}</span></h4>
  ${b.sub.d?`<div class="kv"><b>Scope / notes</b>${b.sub.d}</div>`:''}
  <div class="kv"><b>Materials & assessments — ⠿ drag to sequence · tap one for its full detail</b></div>
  <div class="st-drag">${b.items.length?b.items.map((it,bi)=>`
    <div class="sec-item click" draggable="true" ondragstart="subItemDragStart(event,${bi})" ondragend="subItemDragEnd(event)" ondragover="event.preventDefault()" ondragenter="event.currentTarget.classList.add('drag-over')" ondragleave="event.currentTarget.classList.remove('drag-over')" ondrop="subItemDrop(event,${ti},${subIdx},${bi})" onclick="closePop();itemModal(${ti},${it.idx})">
      <div class="drag-handle" title="Drag to reorder" onclick="event.stopPropagation()">⠿</div>
      <div class="tic" style="background:rgba(23,26,63,.06)">${PLAN_ICON[it.k]||'•'}</div>
      <div style="flex:1"><b>${it.n}</b><small>${PLAN_LABEL[it.k]||''}${it.bin==='na'?' · manual':''}</small></div>
    </div>`).join(''):'<span class="lock-note">None yet — use “+ Add material / assessment” below.</span>'}</div>
  <div class="pop-acts">
    <button class="btn btn-o btn-s" onclick="closePop();topicPop(${ti})">← Back to T${t.no}</button>
    <button class="btn btn-p btn-s" onclick="closePop();itemModalAt(${ti},${insertAt},${subIdx})">+ Add material / assessment</button>
    <button class="btn btn-o btn-s" onclick="closePop();subtopicModal(${ti},${subIdx})">✎ Edit subtopic</button>
  </div>`,null,640);
}
/* ---- Subtopic drag-and-drop reorder — moves the whole block (the subtopic
   plus the items that belong to it) within `items[]`, then re-renders. ---- */
function rebuildTopicItems(lead,blocks){
  const rebuilt=[];
  lead.forEach(it=>rebuilt.push({n:it.n,d:it.d,k:it.k,...(it.bin?{bin:it.bin}:{})}));
  blocks.forEach(b=>{ rebuilt.push({n:b.sub.n,d:b.sub.d,k:'subtopic'});
    b.items.forEach(it=>rebuilt.push({n:it.n,d:it.d,k:it.k,...(it.bin?{bin:it.bin}:{})})); });
  return rebuilt;
}
let SUB_DRAG=null;
function subDragStart(e,ti,bi){SUB_DRAG=bi;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(bi));e.currentTarget.classList.add('dragging');}
function subDragEnd(e){e.currentTarget.classList.remove('dragging');}
function subDrop(e,ti,bi){
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  if(SUB_DRAG===null||SUB_DRAG===bi){SUB_DRAG=null;return;}
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const {blocks,lead}=topicSubtopicBlocks(t);
  const moved=blocks.splice(SUB_DRAG,1)[0];
  blocks.splice(bi,0,moved);
  t.items=rebuildTopicItems(lead,blocks);
  saveDB(); SUB_DRAG=null;
  topicPop(ti);
  toast('Subtopics reordered.');
}
/* ---- Material/assessment drag-and-drop reorder — same mechanic as above,
   but reorders items *within* one subtopic's own block (sequencing which
   material/assessment comes first), regardless of their category. ---- */
let SUBITEM_DRAG=null;
function subItemDragStart(e,bi){SUBITEM_DRAG=bi;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(bi));e.currentTarget.classList.add('dragging');}
function subItemDragEnd(e){e.currentTarget.classList.remove('dragging');}
function subItemDrop(e,ti,subIdx,bi){
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  if(SUBITEM_DRAG===null||SUBITEM_DRAG===bi){SUBITEM_DRAG=null;return;}
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const {blocks,lead}=topicSubtopicBlocks(t);
  const b=blocks.find(x=>x.sub.idx===subIdx);
  if(!b){SUBITEM_DRAG=null;return;}
  const moved=b.items.splice(SUBITEM_DRAG,1)[0];
  b.items.splice(bi,0,moved);
  t.items=rebuildTopicItems(lead,blocks);
  saveDB(); SUBITEM_DRAG=null;
  subtopicPop(ti,subIdx);
  toast('Sequence updated.');
}
/* ---- Subtopic modal: name + scope/notes only — a subtopic is the
   container for categorized content, never a category itself, so unlike
   itemModal it has no category picker and no submission bin. ---- */
function subtopicModal(ti,subIdx){
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const isNew=subIdx===undefined;
  const sub=isNew?{n:'',d:''}:t.items[subIdx];
  openModal(`<h3>${isNew?'Add subtopic — ':'Edit subtopic — '}<span class="hier-crumb" style="display:block;font-weight:400">T${t.no} · ${t.title}</span>${isNew?'':sub.n}</h3><div class="frm">
    <div><label>Subtopic name</label><input id="stName" value="${(sub.n||'').replace(/"/g,'&quot;')}" placeholder="e.g. Mobile Operating Systems (Android/iOS)" style="width:100%"></div>
    <div><label>Scope / notes (optional)</label><textarea id="stDesc" rows="3" style="width:100%">${sub.d||''}</textarea></div>
    <div class="note-ai note">${isNew?'The new subtopic is added to this topic; open it to add its materials and assessments.':'Its materials & assessments stay grouped under it — manage them from the subtopic popover.'}</div>
    <div style="display:flex;gap:8px;justify-content:${isNew?'flex-end':'space-between'}">
      ${isNew?'':`<button class="btn btn-d btn-s" onclick="deleteItemModal(${ti},${subIdx})">Delete subtopic</button>`}
      <div style="display:flex;gap:8px">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveSubtopicModal(${ti},${isNew?'undefined':subIdx})">${isNew?'Add subtopic':'Save'}</button></div>
    </div></div>`);
}
function saveSubtopicModal(ti,subIdx){
  const n=($('stName').value||'').trim(); if(!n){toast('Name is required.');return;}
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const d=$('stDesc').value||'';
  if(subIdx===undefined){
    t.items.push({n,d,k:'subtopic'});
    saveDB(); closeModal(); openSyllabusSheet(SYL_CODE,SYL_DEAN);
    toast('Subtopic added.');
  } else {
    t.items[subIdx]={...t.items[subIdx],n,d};
    saveDB(); closeModal(); subtopicPop(ti,subIdx);
    toast('Subtopic saved.');
  }
}
let INSERT_AT=null;
function itemModalAt(ti,insertAt,subIdx){ INSERT_AT=insertAt; itemModal(ti,undefined,'lecture',subIdx); }
/* ---- Single item modal: name + category + description edited together —
   for categorized content (materials/assessments) only. The category
   picker offers just the two real category sets; a subtopic is never a
   selectable category here (see subtopicModal). ---- */
function itemCategorySelect(id,selK){
  const groups=PLAN_TYPES.filter(g=>g.grp!=='Content Scope');
  return `<select id="${id}" style="width:100%" onchange="itemCategoryChanged(this.value)">${groups.map(g=>`<optgroup label="${g.grp}">${g.opts.map(o=>`<option value="${o.k}" ${o.k===selK?'selected':''}>${o.ic} ${o.label}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
/* A category is either MCQ (quiz) or a Word/PDF document (everything
   except quiz and ppt — ppt gets neither block, it's neither submitted
   nor timed/counted the way these two are). No cross-file GEN lookup
   needed: PLAN_TYPES' own category keys already say which is which. */
function isQuizCat(k){ return k==='quiz'; }
function isDocCat(k){ return k!=='quiz'&&k!=='ppt'; }
function itemCategoryChanged(k){
  $('itQuizCfg').classList.toggle('hidden',!isQuizCat(k));
  $('itBinWrap').classList.toggle('hidden',!isDocCat(k));
}
function itemContextChecklist(ti,it,siblings){
  const refs=new Set(it.ctxRefs||[]);
  if(!siblings.length) return '<div class="lock-note">No other materials/assessments in this subtopic yet.</div>';
  return `<div class="frm" style="gap:5px">${siblings.map((s,si)=>`
    <label style="display:flex;align-items:center;gap:8px;font-weight:400;font-size:13px;color:#2A3055;cursor:pointer">
      <input type="checkbox" class="itCtxChk" value="${(s.n||'').replace(/"/g,'&quot;')}" ${refs.has(s.n)?'checked':''}> ${PLAN_ICON[s.k]||'•'} ${s.n}
    </label>`).join('')}</div>`;
}
function itemModal(ti,ii,defK,subIdxHint){
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const isNew=ii===undefined;
  const it=isNew?{n:'',d:'',k:defK||'lecture'}:t.items[ii];
  const {blocks}=topicSubtopicBlocks(t);
  const block=isNew?blocks.find(b=>b.sub.idx===subIdxHint):blocks.find(b=>b.items.some(x=>x.idx===ii));
  const siblings=block?block.items.filter(x=>isNew||x.idx!==ii):[];
  const qc={mins:15,count:3,maxViol:3,...(it.quizCfg||{})};
  openModal(`<h3>${isNew?'Add item — ':'Edit item — '}<span class="hier-crumb" style="display:block;font-weight:400">T${t.no} · ${t.title}</span>${isNew?'':it.n}</h3>
  <div class="frm">
    <div><label>Category</label>${itemCategorySelect('itK',it.k)}</div>
    <div><label>Name / label</label><input id="itN" value="${(it.n||'').replace(/"/g,'&quot;')}" placeholder="e.g. Mobile Operating Systems (Android/iOS)" style="width:100%"></div>
    <div><label>Description / guide notes (what this item should cover)</label><textarea id="itD" rows="4" style="width:100%">${it.d||''}</textarea></div>
    <div><label>Context from this subtopic <span class="chip c-mut">optional — which siblings the AI should consider</span></label>
      ${itemContextChecklist(ti,it,siblings)}</div>
    <div><label>Additional instructions to the AI (optional)</label><textarea id="itPrompt" rows="2" style="width:100%" placeholder="Anything specific you want considered or included…">${(it.extraPrompt||'').replace(/</g,'&lt;')}</textarea></div>
    <div id="itQuizCfg" class="${isQuizCat(it.k)?'':'hidden'}">
      <label>Quiz configuration <span class="chip c-mut">multiple choice</span></label>
      <div class="row"><div><label style="font-weight:400">Time limit (minutes)</label><input id="itQMins" type="number" min="1" value="${qc.mins}" style="width:100%"></div>
      <div><label style="font-weight:400">Number of question items</label><input id="itQCount" type="number" min="1" value="${qc.count}" style="width:100%"></div></div>
      <div style="margin-top:6px"><label style="font-weight:400">Window-switch / alt-tab attempts allowed before auto-submit</label><input id="itQMaxViol" type="number" min="1" value="${qc.maxViol}" style="width:100%"></div>
      <div class="lock-note" style="margin-top:4px">Fine-tune further (score release, prerequisites, violation policy) from the generated quiz's own Restrictions modal in Course Content.</div>
    </div>
    <div id="itBinWrap" class="${isDocCat(it.k)?'':'hidden'}"><label>Submission bin <span class="chip c-mut">Word/PDF activities &amp; assessments</span></label>
      <select id="itBin" style="width:100%">
        <option value="applicable" ${it.bin!=='na'?'selected':''}>Applicable — students submit within EduPulse (collected / auto-scored)</option>
        <option value="na" ${it.bin==='na'?'selected':''}>Not applicable — rubric-guided, done outside EduPulse (score entered manually)</option>
      </select>
      <div class="lock-note" style="margin-top:4px">Choose “Not applicable” for rubric-guided work students finish without submitting a file — you record its score manually in the editable scoring sheet.</div></div>
    <div class="note-ai note">Saving updates the syllabus guide; the <b>AI Consistency Checker</b> will scan this topic's generated pack for anything left inconsistent.</div>
    <div style="display:flex;gap:8px;justify-content:${isNew?'space-between':'flex-end'}">
      ${isNew?'':`<button class="btn btn-d btn-s" onclick="deleteItemModal(${ti},${ii})">Delete item</button>`}
      <div style="display:flex;gap:8px">
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveItemModal(${ti},${isNew?'undefined':ii})">Save & check</button></div>
    </div>
  </div>`);
}
function saveItemModal(ti,ii){
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const n=$('itN').value.trim(), d=$('itD').value, k=$('itK').value;
  const extraPrompt=$('itPrompt').value.trim();
  const ctxRefs=[...document.querySelectorAll('.itCtxChk:checked')].map(el=>el.value);
  if(!n){ toast('Name is required.'); return; }
  const rec={n,d,k,...(extraPrompt?{extraPrompt}:{}),...(ctxRefs.length?{ctxRefs}:{})};
  if(isQuizCat(k)){
    rec.quizCfg={
      mins:Math.max(1,parseInt($('itQMins').value,10)||15),
      count:Math.max(1,parseInt($('itQCount').value,10)||3),
      maxViol:Math.max(1,parseInt($('itQMaxViol').value,10)||3)
    };
  } else if(isDocCat(k)){
    const bin=$('itBin').value;
    if(bin==='na') rec.bin='na';
  }
  if(ii===undefined){
    if(INSERT_AT!=null && INSERT_AT<=t.items.length){ t.items.splice(INSERT_AT,0,rec); }
    else t.items.push(rec);
    INSERT_AT=null;
  } else t.items[ii]=rec;
  saveDB();
  closeModal(); openSyllabusSheet(SYL_CODE,SYL_DEAN);
  toast('Saved — consistency check queued.');
}
function deleteItemModal(ti,ii){
  const t=DB.syllabi[SYL_CODE].topics[ti];
  t.items.splice(ii,1);
  saveDB();
  closeModal(); openSyllabusSheet(SYL_CODE,SYL_DEAN);
  toast('Item removed — consistency check queued.');
}
/* ---- Topic modal: title/duration/ILO only — a topic's subtopics and
   their categorized content are a separate hierarchy level, managed
   exclusively from the topic popover (topicPop → subtopicModal/itemModal)
   so every add/edit stays properly nested under the right subtopic. ---- */
let TM_I;
function tmSourceTopic(){
  return TM_I!==undefined?DB.syllabi[SYL_CODE].topics[TM_I]:{no:(DB.syllabi[SYL_CODE]?DB.syllabi[SYL_CODE].topics.length:0)+1,title:'',weeks:'',ilo:'',items:[]};
}
function updateWeeksPreview(){
  const dur=Math.max(1,parseInt($('tmDur').value,10)||1);
  const start=computeStartWeek(TM_I);
  const label=dur>1?`Wk ${start}–${start+dur-1}`:`Wk ${start}`;
  $('tmWeeksPreview').textContent='Scheduled as: '+label+' — computed automatically from topic order + duration.';
}
function renderTopicModal(){
  const t=tmSourceTopic(); const i=TM_I;
  openModal(`<h3>${i!==undefined?'Edit topic details — '+t.title:'Add syllabus topic'}</h3><div class="frm">
    <div class="row"><div><label>Topic title</label><input id="tmTitle" value="${t.title}" style="width:100%"></div>
    <div><label>Duration (weeks) <span class="chip c-mut">auto-scheduled</span></label><input id="tmDur" type="number" min="1" value="${topicDur(t)}" oninput="updateWeeksPreview()" style="width:100%"></div></div>
    <div class="lock-note" id="tmWeeksPreview" style="margin-top:-6px"></div>
    <div><label>Intended Learning Outcome(s)</label><textarea id="tmIlo" rows="2" style="width:100%">${t.ilo}</textarea></div>
    <div class="note-ai note">${i!==undefined?'Subtopics and their materials/assessments are managed from the topic popover — tap the topic after saving to add, edit, remove, or drag-reorder them, each staying grouped under its own subtopic.':'After adding, tap the new topic to add its subtopics and their materials/assessments.'} On save, the <b>AI Consistency Checker</b> diffs this topic against its generated content and reports anything left inconsistent.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
    <button class="btn btn-p" onclick="saveTopicModal()">${i!==undefined?'Save':'Add topic'} & run consistency check</button></div>
  </div>`);
  updateWeeksPreview();
}
function topicModal(i){
  TM_I=i;
  renderTopicModal();
}
function saveTopicModal(){
  const sy=DB.syllabi[SYL_CODE];
  /* Scripted demo: editing IT-NET31 Topic 2 (the subject the checkFindings target)
     routes the instructor straight to the Consistency Checker to see the impact. */
  const wasChecked=(TM_I===1 && SYL_CODE==='IT-NET31');
  const title=$('tmTitle').value.trim()||'Untitled topic';
  const dur=Math.max(1,parseInt($('tmDur').value,10)||1);
  const ilo=$('tmIlo').value.trim();
  if(TM_I!==undefined){
    const t=sy.topics[TM_I];
    t.title=title; t.dur=dur; t.ilo=ilo;
  } else {
    const nextNo=(sy.topics.length?Math.max(...sy.topics.map(t=>t.no)):0)+1;
    sy.topics.push({no:nextNo,title,dur,ilo,items:[]});
  }
  recomputeTimeframes(sy);
  saveDB();
  closeModal();
  openSyllabusSheet(SYL_CODE,SYL_DEAN);
  toast(TM_I!==undefined?'Saved — timeframe recalculated, consistency check running…':'Topic added — tap it to add subtopics.');
  if(wasChecked && !SYL_DEAN) setTimeout(()=>{closeSheet();location.href='checker.html';},900);
}
function removeTopicModal(i){
  const t=DB.syllabi[SYL_CODE].topics[i];
  openModal(`<h3>Remove topic — ${t.title}?</h3>
  <p style="font-size:13.5px;margin-bottom:12px">Removing this topic deletes its generated content pack and renumbers the remaining topics. This is saved immediately.</p>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
  <button class="btn btn-d" onclick="doRemoveTopic(${i})">Remove topic</button></div>`);
}
function doRemoveTopic(i){
  const sy=DB.syllabi[SYL_CODE];
  sy.topics.splice(i,1);
  // renumber topics sequentially and re-key their packs to stay in sync
  const oldPacks=DB.packs[SYL_CODE]||{};
  const newPacks={};
  sy.topics.forEach((t,idx)=>{
    const oldNo=t.no; t.no=idx+1;
    if(oldPacks[oldNo]) newPacks[t.no]=oldPacks[oldNo];
  });
  DB.packs[SYL_CODE]=newPacks;
  recomputeTimeframes(sy);
  saveDB();
  closeModal(); openSyllabusSheet(SYL_CODE,SYL_DEAN);
  toast('Topic removed — remaining topics renumbered and timeframes recalculated.');
}
