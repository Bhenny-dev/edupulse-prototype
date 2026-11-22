// Shared Claude/Codex deployment entry point. Never uploads the working tree.
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync,existsSync} from 'node:fs'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
export const target={id:'prj_TWamHPF10NMTNg46ZLTAfWhtM4Uv',team:'team_8cau00g8zkcJqh4FtAyxfdra',scope:'bhennys-projects',project:'edupulse-prototype',remote:'https://github.com/Bhenny-dev/edupulse-prototype.git'}
/** @param {{name?:string,id?:string,accountId?:string,rootDirectory?:string}} project @param {string} remote */
export function validateTarget(project,remote){
 if(project.name!==target.project||project.id!==target.id||project.accountId!==target.team)throw Error('Unexpected Vercel project; deployment refused.')
 if(remote.trim().replace(/\.git$/,'')!==target.remote.replace(/\.git$/,''))throw Error('Unexpected Git remote; deployment refused.')
 if(project.rootDirectory!=='edupulse-app')throw Error('Unexpected build root; deployment refused.')
 return {projectId:project.id,orgId:project.accountId,projectName:project.name}
}
/** @param {string} repo @param {string} sha @param {string} archive @param {string} source */
export function archiveCommit(repo,sha,archive,source){
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('A full immutable commit is required.')
 mkdirSync(source,{recursive:true})
 execFileSync('git',['archive','--format=tar','--output='+archive,sha],{cwd:repo,stdio:'pipe'})
 execFileSync('tar',['-xf',archive,'-C',source],{cwd:repo,stdio:'pipe'})
}
export function main(args=process.argv.slice(2)){
 if(args.some(arg=>arg!=='--check'))throw Error('Only --check is supported. Default deploys remote main to EduPulse production.')
 const app=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(app,'..'),privateDir=join(app,'.data','deployment-control'),auth=join(app,'.data','vercel-auth')
 mkdirSync(privateDir,{recursive:true})
 const cli=process.env.EDUPULSE_VERCEL_CLI_JS||join(process.env.APPDATA||'','npm','node_modules','vercel','dist','vc.js')
 if(!existsSync(cli))throw Error('Install the official Vercel CLI before using this command.')
 /** @param {string} command @param {string[]} argv @param {string} [cwd] */
 const run=(command,argv,cwd=repo)=>execFileSync(command,argv,{cwd,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_OPTIONS:'--max-old-space-size=256'}})
 /** @param {string[]} argv */
 const vc=argv=>run(process.execPath,[cli,...argv,'--global-config',auth,'--scope',target.scope,'--non-interactive'])
 let project
 try{project=JSON.parse(vc(['api','/v9/projects/'+target.project,'--method','GET']))}catch(error){writeFileSync(join(privateDir,'access-error.log'),error instanceof Error?error.message:String(error));throw Error('EduPulse school-account access is unavailable. Run the project-local Vercel login documented in feature-documentation/backend-system/vercel.md. No deployment started.')}
 const link=validateTarget(project,run('git',['remote','get-url','origin']))
 run('git',['fetch','origin','main'])
 const sha=run('git',['rev-parse','refs/remotes/origin/main']).trim()
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Remote main did not resolve to a full commit SHA.')
 if(args.includes('--check')){console.log(JSON.stringify({accessVerified:true,scope:target.scope,project:target.project,commit:sha}));return}
 const folder=join(privateDir,sha+'-'+Date.now()),source=join(folder,'source');mkdirSync(source,{recursive:true})
 const archive=join(folder,'source.tar');archiveCommit(repo,sha,archive,source)
 mkdirSync(join(source,'.vercel'),{recursive:true});writeFileSync(join(source,'.vercel','project.json'),JSON.stringify(link))
 let output
 try{output=vc(['deploy','--cwd',source,'--prod','--yes','--no-wait','--meta','githubCommitSha='+sha,'--meta','githubCommitRef=main'])}catch(error){writeFileSync(join(folder,'deployment-error.log'),error instanceof Error?error.message:String(error));throw Error('Vercel did not confirm a deployment. Private diagnostics: '+folder)}
 writeFileSync(join(folder,'deployment-output.log'),output)
 const url=output.match(/https:\/\/[^\s]+\.vercel\.app/)?.[0]
 const receipt={triggered:true,scope:target.scope,project:target.project,commit:sha,url:url||null,status:'Inspect Vercel for build completion; triggered is not Ready.'}
 writeFileSync(join(privateDir,'latest.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2))
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{main()}catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1}}
