/* ============================================================
   EduPulse — topic-system.js
   Syllabus Builder: subject list → syllabus sheet → topic popover
   → single-item modal. One unified list per topic (`items[]`) —
   every subtopic AND every planned lesson/activity is edited as
   ONE thing (name + category + description together), never two
   separate flows. Used by Instructor pages AND by the Dean's
   "Open syllabus (Dean edit)" action.
============================================================ */
function insSyl(){
  view().innerHTML=`
  <div class="note" style="margin-top:0">Each subject assigned to you by the Dean has its <b>own individual syllabus</b>. Open a subject to construct its plan — topics, each with a unified list of subtopics and planned lessons/activities. The Dean can also edit any syllabus.</div>
  ${myAssignments().map(x=>{const c=DB.curriculum.find(k=>k.code===x.code);const sy=DB.syllabi[x.code];return `
  <div class="card click subj-card" onclick="openSyllabusSheet('${x.code}',false)">
    <div class="sc-ic">📘</div>
    <div style="flex:1"><b>${x.code} — ${c.title}</b><small>${sy.topics.length} topics · ${c.units} units · sections ${x.sections.join(', ')} · Term scheme: ${schemeLabel()} (Dean-set)</small></div>
    ${sylChip(sy.status)}<span class="chip c-mut">Open syllabus →</span>
  </div>`;}).join('')}`;
}
let SYL_CODE=null, SYL_DEAN=false;
function openSyllabusSheet(code,deanMode){
  SYL_CODE=code; SYL_DEAN=!!deanMode;
  const sy=DB.syllabi[code]; const c=DB.curriculum.find(k=>k.code===code);
  openSheet('📘', code+' — '+c.title, `Individual syllabus · ${sy.period} · owner: ${sy.owner}${deanMode?' · DEAN EDIT MODE':''}`, `
   <div class="note" style="margin-top:0">KCP official format — course info, VMO, and program outcomes auto-filled from the curriculum entry. <b>Tap a topic</b> to view/edit its contents in a popover. Term scheme: <b>${schemeLabel()}</b> ${chip('fixed by Dean','c-teal')}
     <div style="margin-top:8px"><button class="btn btn-o btn-s" onclick="courseInfoPop(event)">ℹ️ Course description, grading & policy, references</button></div></div>
   ${sy.topics.map((t,i)=>`
   <div class="sec-item click" onclick="topicPop(${i},event)">
     <div class="tic" style="background:linear-gradient(150deg,#26327B,#1B2559);color:#fff;font-weight:800;font-size:11px">T${t.no}</div>
     <div><b>${t.title}</b><small>${t.weeks} · ${topicSubtopics(t).length} subtopics · ${topicPlan(t).length} planned item(s) · ${t.ilo}</small></div>
     <div class="acts">${t.items.slice(0,4).map(it=>`<span title="${PLAN_LABEL[it.k]||''}: ${it.n}">${PLAN_ICON[it.k]||'•'}</span>`).join(' ')}<span class="chip c-mut">Tap ▾</span></div>
   </div>`).join('')}
   <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
     <button class="btn btn-p" onclick="topicModal()">+ Add topic</button>
     <button class="btn btn-o" onclick="toast('Prototype: exports the KCP-format printable syllabus.')">Export official syllabus</button>
     ${deanMode?`<button class="btn btn-o" onclick="toast('Dean edit session logged to the audit trail.')">🛡 Dean edit log</button>`
       :`<button class="btn btn-ai" onclick="closeSheet();location.href='content.html?code='+encodeURIComponent(SYL_CODE)">⚡ Generate content from this syllabus</button>`}
   </div>`);
}
function courseInfoPop(evt){
  const c=DB.curriculum.find(k=>k.code===SYL_CODE);
  openPop(`<h4>Course info — ${SYL_CODE}</h4>
  <div class="kv"><b>Course description</b>${c.desc||'Not yet documented for this subject — add it from Curriculum (Dean) or request the official syllabus copy.'}</div>
  <div class="kv"><b>Specifications</b><ul style="margin:4px 0 0 16px;padding:0">${(c.specs||['Not yet documented for this subject.']).map(s=>`<li style="margin-bottom:3px">${s}</li>`).join('')}</ul></div>
  <div class="kv"><b>Grading formula <span class="chip c-mut">college-wide</span></b><span style="white-space:pre-line">${DB.policy.grading}</span></div>
  <div class="kv"><b>Course policy <span class="chip c-mut">college-wide</span></b><ul style="margin:4px 0 0 16px;padding:0">${DB.policy.rules.map(r=>`<li style="margin-bottom:3px">${r}</li>`).join('')}</ul></div>
  <div class="kv"><b>References</b>${(c.refs||['Not yet documented for this subject.']).map(r=>`<div style="margin-bottom:2px">${r}</div>`).join('')}</div>
  `,evt,460);
}
/* ---- Topic popover: items grouped by category group, breadcrumb kept visible ---- */
function topicPop(i,evt){
  const t=DB.syllabi[SYL_CODE].topics[i];
  const groups=PLAN_TYPES.map(g=>({grp:g.grp, items:t.items.map((it,ii)=>({...it,ii})).filter(it=>g.opts.some(o=>o.k===it.k))})).filter(g=>g.items.length);
  openPop(`<h4>T${t.no} · ${t.title} <span class="chip c-mut">${t.weeks}</span></h4>
  <div class="kv"><b>Intended Learning Outcome</b>${t.ilo}</div>
  <div class="kv"><b>Subtopics & planned lessons/activities — tap one for its full detail</b></div>
  ${groups.map(g=>`<div class="item-grp-h">${g.grp}</div>
    <div class="subtopics">${g.items.map(it=>`<span class="st click" onclick="itemModal(${i},${it.ii})" title="${PLAN_LABEL[it.k]||''}">${PLAN_ICON[it.k]||'•'} ${it.n}</span>`).join('')}</div>`).join('')||'<span class="lock-note">None yet — use “+ Add item” below.</span>'}
  <div class="pop-acts">
    <button class="btn btn-p btn-s" onclick="closePop();topicModal(${i})">✎ Edit topic (all items)</button>
    <button class="btn btn-o btn-s" onclick="closePop();itemModal(${i})">+ Add item</button>
    ${t.title.includes('EXAM')?'':`<button class="btn btn-d btn-s" onclick="closePop();removeTopicModal(${i})">Remove</button>`}
  </div>`,evt,440);
}
/* ---- Single item modal: name + category + description edited together ---- */
function itemCategorySelect(id,selK){
  return `<select id="${id}" style="width:100%">${PLAN_TYPES.map(g=>`<optgroup label="${g.grp}">${g.opts.map(o=>`<option value="${o.k}" ${o.k===selK?'selected':''}>${o.ic} ${o.label}</option>`).join('')}</optgroup>`).join('')}</select>`;
}
function itemModal(ti,ii){
  const t=DB.syllabi[SYL_CODE].topics[ti];
  const isNew=ii===undefined;
  const it=isNew?{n:'',d:'',k:'subtopic'}:t.items[ii];
  openModal(`<h3>${isNew?'Add item — ':'Edit item — '}<span class="hier-crumb" style="display:block;font-weight:400">T${t.no} · ${t.title}</span>${isNew?'':it.n}</h3>
  <div class="frm">
    <div><label>Category</label>${itemCategorySelect('itK',it.k)}</div>
    <div><label>Name / label</label><input id="itN" value="${(it.n||'').replace(/"/g,'&quot;')}" placeholder="e.g. Mobile Operating Systems (Android/iOS)" style="width:100%"></div>
    <div><label>Description / guide notes (what this item should cover)</label><textarea id="itD" rows="4" style="width:100%">${it.d||''}</textarea></div>
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
  if(!n){ toast('Name is required.'); return; }
  if(ii===undefined) t.items.push({n,d,k});
  else t.items[ii]={n,d,k};
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
/* ---- Bulk topic editor: title/weeks/ILO + the full item list (dropdown-driven) ---- */
let TM_I, ITEM_DRAFT=[];
function tmSourceTopic(){
  return TM_I!==undefined?DB.syllabi[SYL_CODE].topics[TM_I]:{no:(DB.syllabi[SYL_CODE]?DB.syllabi[SYL_CODE].topics.length:0)+1,title:'',weeks:'',ilo:'',items:[]};
}
function itemRowsHtml(){
  return (ITEM_DRAFT.map((it,pi)=>`
   <div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;border:1px solid var(--line);border-radius:12px;padding:8px;background:rgba(255,255,255,.6)">
     <div style="display:flex;gap:6px;flex-wrap:wrap;flex:1;min-width:260px">
       <div style="min-width:210px;flex:1"><select onchange="ITEM_DRAFT[${pi}].k=this.value">${PLAN_TYPES.map(g=>`<optgroup label="${g.grp}">${g.opts.map(o=>`<option value="${o.k}" ${o.k===it.k?'selected':''}>${o.ic} ${o.label}</option>`).join('')}</optgroup>`).join('')}</select></div>
       <input value="${(it.n||'').replace(/"/g,'&quot;')}" placeholder="Name — e.g. Short quiz on Ch. 3" style="flex:2;min-width:180px" oninput="ITEM_DRAFT[${pi}].n=this.value">
     </div>
     <input value="${(it.d||'').replace(/"/g,'&quot;')}" placeholder="Description / guide notes (optional)" style="flex:2;min-width:220px" oninput="ITEM_DRAFT[${pi}].d=this.value">
     <button type="button" class="btn btn-o btn-s" onclick="removeItemRow(${pi})">✕</button>
   </div>`).join(''))||'<div class="lock-note" style="margin-bottom:8px">No items yet — add one below.</div>';
}
function addItemRow(){ITEM_DRAFT.push({k:'subtopic',n:'',d:''});renderTopicModal();}
function removeItemRow(pi){ITEM_DRAFT.splice(pi,1);renderTopicModal();}
function renderTopicModal(){
  const t=tmSourceTopic(); const i=TM_I;
  openModal(`<h3>${i!==undefined?'Edit topic — '+t.title:'Add syllabus topic'}</h3><div class="frm">
    <div class="row"><div><label>Topic title</label><input id="tmTitle" value="${t.title}" style="width:100%"></div>
    <div><label>Timeframe (flexible)</label><input id="tmWeeks" value="${t.weeks}" placeholder="e.g. Wk 5–6" style="width:100%"></div></div>
    <div><label>Intended Learning Outcome(s)</label><textarea id="tmIlo" rows="2" style="width:100%">${t.ilo}</textarea></div>
    <div><label>Subtopics & planned lessons/activities <span class="chip c-mut">pick a category, name it, describe it — one unified list</span></label>
    <div id="itemRows">${itemRowsHtml()}</div>
    <button type="button" class="btn btn-o btn-s" onclick="addItemRow()">+ Add item</button></div>
    <div class="note-ai note">On save, the <b>AI Consistency Checker</b> diffs this topic against its generated content and reports anything left inconsistent.</div>
    <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
    <button class="btn btn-p" onclick="saveTopicModal()">Save & run consistency check</button></div>
  </div>`);
}
function topicModal(i){
  TM_I=i;
  ITEM_DRAFT=tmSourceTopic().items.map(it=>({...it}));
  renderTopicModal();
}
function saveTopicModal(){
  const sy=DB.syllabi[SYL_CODE];
  const wasT3=(TM_I===2 && SYL_CODE==='GE EELECT-IT');
  const title=$('tmTitle').value.trim()||'Untitled topic';
  const weeks=$('tmWeeks').value.trim();
  const ilo=$('tmIlo').value.trim();
  const items=ITEM_DRAFT.filter(it=>it.n&&it.n.trim()).map(it=>({n:it.n.trim(),d:it.d||'',k:it.k}));
  if(TM_I!==undefined){
    const t=sy.topics[TM_I];
    t.title=title; t.weeks=weeks; t.ilo=ilo; t.items=items;
  } else {
    const nextNo=(sy.topics.length?Math.max(...sy.topics.map(t=>t.no)):0)+1;
    sy.topics.push({no:nextNo,title,weeks,ilo,items});
  }
  saveDB();
  closeModal();
  openSyllabusSheet(SYL_CODE,SYL_DEAN);
  toast('Saved — consistency check running…');
  if(wasT3 && !SYL_DEAN) setTimeout(()=>{closeSheet();location.href='checker.html';},900);
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
  saveDB();
  closeModal(); openSyllabusSheet(SYL_CODE,SYL_DEAN);
  toast('Topic removed — remaining topics renumbered.');
}
