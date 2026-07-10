#!/usr/bin/env node
/* ============================================================
   Dev-only generator — NOT loaded by any page.
   Builds the real, standalone .html "documents" under /content/
   for every seed pack section that has a `url` field, reusing
   the exact same buildDocHtml() renderer that the live "Generate"
   flow (genTopic, in content-system.js) uses at runtime — so seed
   files and freshly-generated ones look identical.

   Run once from the project root:  node scripts/gen-seed-content.js
============================================================ */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const dataJs=fs.readFileSync(path.join(root,'assets/data.js'),'utf8');
const coreJs=fs.readFileSync(path.join(root,'assets/core.js'),'utf8');
// Minimal DOM stub so the whole of core.js (shell/overlay helpers included) can
// load without changes — this script only ever calls buildDocHtml() from it.
const stubEl={classList:{add(){},remove(){},toggle(){}},style:{},innerHTML:'',appendChild(){},getBoundingClientRect:()=>({top:0,left:0,width:0,height:0})};
const sandbox={
  document:{getElementById:()=>stubEl, createElement:()=>({...stubEl}), body:{insertAdjacentHTML(){},appendChild(){}}, addEventListener(){}},
  window:{}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, console,
  location:{href:'',pathname:'',search:''}, innerWidth:1200, innerHeight:800, URL:{createObjectURL:()=>'blob:x'}
};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(dataJs+coreJs+';\nglobalThis.__DB=DEFAULT_DB; globalThis.__buildDocHtml=buildDocHtml;', sandbox);
const DB=sandbox.__DB;
const buildDocHtml=sandbox.__buildDocHtml;

function slideBodyHtml(preview,topic){
  const slides=preview.split(/\s*·\s*/).filter(Boolean);
  return slides.map((s,i)=>`<div class="slide"><div class="sno">Slide ${i+1}</div>${s}</div>`).join('\n')
    +`\n<p class="mapping">Mapped to: ${topic.title} · ${topicSubtopics(topic).map(x=>x.n).join(', ')}</p>`;
}
function notesBodyHtml(preview,topic){
  const paras=preview.split(/\n+/).filter(Boolean);
  return `<p class="mapping">Mapped to: ${topic.title}</p>`+paras.map(p=>`<p>${p}</p>`).join('\n');
}
function actBodyHtml(preview,topic){
  return `<p class="mapping">Mapped to: ${topic.title}</p><p>${preview}</p>
  <h2>Scoring</h2><p>Scored per the rubric noted above; instructor may adjust weighting before publishing.</p>`;
}
function fileBodyHtml(preview,topic,label){
  return `<p class="mapping">Instructor upload · ${topic.title}</p><p><b>${label}</b></p><p>${preview}</p>`;
}
function topicSubtopics(t){return t.items.filter(x=>x.k==='subtopic');}

let written=0;
Object.entries(DB.packs).forEach(([code,topics])=>{
  Object.entries(topics).forEach(([topicNo,pack])=>{
    const topic=DB.syllabi[code].topics.find(t=>t.no===Number(topicNo));
    const course=DB.curriculum.find(c=>c.code===code);
    pack.secs.forEach(s=>{
      if(!s.url) return; // quiz sections stay in-app, no static file
      const bodyHtml = s.t==='ppt' ? slideBodyHtml(s.preview||'',topic)
        : s.t==='act' ? actBodyHtml(s.preview||'',topic)
        : s.t==='file' ? fileBodyHtml(s.preview||'',topic,s.label)
        : notesBodyHtml(s.preview||'',topic);
      const html=buildDocHtml({
        docType:s.t==='notes'?'Lecture Notes':s.t==='ppt'?'Presentation':s.t==='file'?'Instructor Upload':'Activity Document',
        title:s.label, courseCode:code, courseTitle:course.title,
        topicNo, topicTitle:topic.title, bodyHtml
      });
      const relPath=s.url.replace(/^\.\.\//,''); // '../content/X/Y.html' -> 'content/X/Y.html'
      const abs=path.join(root,relPath);
      fs.mkdirSync(path.dirname(abs),{recursive:true});
      fs.writeFileSync(abs,html,'utf8');
      written++;
      console.log('wrote',relPath);
    });
  });
});
console.log(`\nDone — ${written} content files written under /content/.`);
