import test from 'node:test'
import assert from 'node:assert/strict'
import {validateTarget,target,archiveCommit} from '../scripts/deploy-production.mjs'
test('shared agent deploy refuses another project, repository or build root',()=>{
 const project={name:'edupulse-prototype',id:target.id,accountId:target.team,rootDirectory:'edupulse-app'}
 assert.deepEqual(validateTarget(project,target.remote),{projectId:target.id,orgId:target.team,projectName:'edupulse-prototype'})
 assert.throws(()=>validateTarget({...project,name:'other'},target.remote))
 assert.throws(()=>validateTarget({...project,id:'prj_other'},target.remote))
 assert.throws(()=>validateTarget({...project,accountId:'team_other'},target.remote))
 assert.throws(()=>validateTarget(project,'https://github.com/example/other.git'))
 assert.throws(()=>validateTarget({...project,rootDirectory:'other'},target.remote))
})

import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
test('deployment archive uses the committed source and excludes dirty edits and private files',()=>{
 const prefix=join(tmpdir(),'edupulse-deploy-test-'),dir=mkdtempSync(prefix),repo=join(dir,'repo'),source=join(dir,'source')
 mkdirSync(repo);const git=(args:string[])=>execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']})
 try{
  git(['init']);git(['config','user.email','deployment-test@example.invalid']);git(['config','user.name','Deployment test'])
  writeFileSync(join(repo,'app.txt'),'reviewed source');git(['add','app.txt']);git(['commit','-m','reviewed'])
  const sha=git(['rev-parse','HEAD']).trim();writeFileSync(join(repo,'app.txt'),'unfinished edit');mkdirSync(join(repo,'.data'));writeFileSync(join(repo,'.data','private.txt'),'not for upload')
  archiveCommit(repo,sha,join(dir,'source.tar'),source)
  assert.equal(readFileSync(join(source,'app.txt'),'utf8'),'reviewed source');assert.equal(existsSync(join(source,'.data')),false)
  assert.throws(()=>archiveCommit(repo,'main',join(dir,'bad.tar'),source))
 }finally{assert.ok(resolve(dir).startsWith(resolve(prefix)));rmSync(dir,{recursive:true,force:true})}
})
