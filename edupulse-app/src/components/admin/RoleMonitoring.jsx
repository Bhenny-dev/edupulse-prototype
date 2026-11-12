import {useState} from 'react'
import {useSearchParams} from 'react-router-dom'
import {Activity, Users, Bot, ShieldCheck, RefreshCw} from 'lucide-react'
import SummaryCard from '../ui/SummaryCard'
import {Spinner, SkeletonContent} from '../ui/LoadingFeedback'
import {ROLE_TITLES} from '../../lib/authRoles'
import {roleMonitoring, MONITOR_TABS} from './monitoringData'
import './roleMonitoring.css'

const titles={overview:'Overview',accounts:'Accounts',activity:'Activity & logs',ai:'AI usage',health:'Health'}
const time=value=>value?new Date(value).toLocaleString():'Never'
const label=value=>String(value||'Unknown').replaceAll('_',' ')
function Distribution({title,rows}) {
 const max=Math.max(1,...rows.map(([,count])=>count))
 return <section className="card"><div className="card-header"><h2>{title}</h2></div><div className="card-body">{rows.length?<ul className="role-monitor-bars" aria-label={title}>{rows.map(([name,count])=><li key={name}><span>{label(name)}</span><strong>{count}</strong><div aria-hidden="true" style={{width:`${100*count/max}%`}} /></li>)}</ul>:<p className="text-muted">No recorded activity in this window.</p>}</div></section>
}
export default function RoleMonitoring({role,overview,checks,activity,busy,error,agentError,refresh,openRole,demo,history,historyError}) {
 const [params,setParams]=useSearchParams()
 const tab=MONITOR_TABS.includes(params.get('monitorTab'))?params.get('monitorTab'):'overview'
 const [query,setQuery]=useState('')
 const legacy=roleMonitoring(role,overview,activity)
 const fresh=history?.roles?.[role]
 const data=fresh?{...legacy,...fresh}:legacy
 const totals=fresh?.totals
 const notices=[
  ...(historyError?[['warning',historyError]]:[]),
  ...(error?[['warning','Account and overview data could not be verified. Refresh to retry.']]:[]),
  ...(totals?.success?[['success',`${totals.success} successful role actions recorded in the last 7 days.`]]:[]),
  ...(totals?.failure?[['warning',`${totals.failure} failed role actions. Review Activity & logs before retrying the affected operation.`]]:[]),
  ...(totals?.aiFailed?[['warning',`${totals.aiFailed} failed AI runs. Review AI usage and the account's provider settings; these are historical failures, not proof of a current outage.`]]:[]),
  ...(totals?.stopped?[['warning',`${totals.stopped} AI runs stopped for insufficient evidence or policy restrictions. Review the question and permitted sources.`]]:[]),
  ...(totals?.quoted?[['info',`${totals.quoted} AI runs returned source excerpts. This is a fallback, not a completed generated answer.`]]:[]),
  ...(!error&&legacy.accounts.some(a=>!a.confirmed)?[['warning',`${legacy.accounts.filter(a=>!a.confirmed).length} accounts await email confirmation.`]]:[]),
  ...(!error&&legacy.accounts.some(a=>!a.lastSignIn)?[['info',`${legacy.accounts.filter(a=>!a.lastSignIn).length} accounts have no recorded sign-in. Registration does not establish use.`]]:[]),
  ...(fresh&&!totals?.events?[['info','No direct role actions in the last 7 days. Admin support operations below remain separate from direct role use.']]:[]),
  ...checks.filter(c=>!c.ok).map(c=>['warning',`${c.name}: needs attention. ${c.note}`])
 ]
 const changeTab=value=>setParams({role,monitorTab:value})
 const accounts=data.accounts.filter(account=>`${account.name} ${account.email||''}`.toLowerCase().includes(query.toLowerCase()))
 return <div className="container role-monitor">
  <div className="page-header"><div><h1>{ROLE_TITLES[role]} monitoring</h1><p className="text-sm text-muted mt-8">System Admin oversight · {demo?'Preview samples':'Recorded system activity'}</p></div><div className="flex flex-wrap gap-12"><button className="btn btn-secondary" disabled={busy} onClick={refresh}>{busy?<Spinner size={16}/>:<RefreshCw size={16}/>} Refresh</button><button className="btn btn-primary" disabled={demo||busy||Boolean(error)} onClick={()=>openRole(role)}>Choose account view</button></div></div>
  {error&&<p role="alert" className="ai-notice">{error}</p>}
  <div className="tabs mb-24" aria-label="Role monitoring sections">{MONITOR_TABS.map(value=><button key={value} className={`tab ${value===tab?'active':''}`} aria-pressed={value===tab} onClick={()=>changeTab(value)}>{titles[value]}</button>)}</div>
  {busy&&!checks.length?<SkeletonContent label="Loading role monitoring" variant="page"/>:<>
  <div className="kpi-grid mb-24">
   <SummaryCard icon={Users} label="Role accounts" value={error?'—':data.accounts.length} onClick={()=>changeTab('accounts')}/>
   <SummaryCard icon={Activity} label="Role actions - 7 days" value={historyError?"Unavailable":totals?.events ?? data.events.length} onClick={()=>changeTab('activity')}/>
   <SummaryCard icon={Bot} label="AI runs - 7 days" value={historyError?"Unavailable":totals?.runs ?? data.runs.length} onClick={()=>changeTab('ai')}/>
   <SummaryCard icon={ShieldCheck} label="Shared services passing" value={`${checks.filter(c=>c.ok).length}/${checks.length}`} onClick={()=>changeTab('health')}/>
  </div>
  {(tab==='overview'||tab==='activity'||tab==='ai')&&<p className="text-sm text-muted mb-24">{fresh?`Seven-day totals for this role, read ${time(fresh.asOf)}. Lists show up to 100 role actions and 30 role AI runs; charts count the entire seven-day period. Admin support is separate and grouped by the subject's current role. No provider billing is inferred.`:'Limited fallback: latest 100 system events and 30 AI runs. Recent role history is unavailable.'}</p>}
  <section className="card mb-24" aria-label="Monitoring notices"><div className="card-header"><h2>Notices & checks</h2></div><div className="card-body">{notices.length?<ul className="monitor-notices">{notices.map(([kind,text],i)=><li key={i}><span className={`badge ${kind==='success'?'badge-published':kind==='warning'?'badge-draft':''}`}>{kind==='success'?'Success':kind==='warning'?'Attention':'Notice'}</span> {text}</li>)}</ul>:<p>No issues identified in the available records.</p>}</div></section>
  {tab==='overview'&&<div className="grid-2 mb-24"><Distribution title="Recorded actions" rows={error?[]:data.actions}/><Distribution title="Recent AI outcomes" rows={fresh?data.outcomes:agentError?[]:data.outcomes}/></div>}
  {tab==='accounts'&&<section className="card"><div className="card-header"><h2>Accounts</h2><label>Search accounts <input className="form-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or email"/></label></div><div className="card-body role-monitor-table"><table className="data-table"><thead><tr><th>Name</th><th>Username</th><th>Confirmation</th><th>Last sign-in</th></tr></thead><tbody>{accounts.map(account=><tr key={account.id}><td>{account.name}</td><td>{account.email||'Not available'}</td><td>{account.confirmed?'Confirmed':'Pending'}</td><td>{time(account.lastSignIn)}</td></tr>)}</tbody></table>{!accounts.length&&<p>No matching accounts.</p>}</div></section>}
  {tab==='activity'&&<><Distribution title="Recorded actions" rows={error?[]:data.actions}/><section className="card mt-24"><div className="card-header"><h2>Role audit log</h2></div><div className="card-body role-monitor-table"><table className="data-table"><thead><tr><th>Time</th><th>Action</th><th>Result</th><th>Detail</th></tr></thead><tbody>{data.events.map(event=><tr key={event.id}><td>{time(event.at)}</td><td>{label(event.action)}</td><td>{event.outcome}</td><td>{event.detail}</td></tr>)}</tbody></table>{!data.events.length&&<p>No direct role events in this period.</p>}</div></section></>}
  {tab==='ai'&&<>{agentError&&<p role="alert" className="ai-notice">{agentError}</p>}<Distribution title="Recent AI outcomes" rows={fresh?data.outcomes:agentError?[]:data.outcomes}/><section className="card mt-24"><div className="card-header"><h2>Recorded AI runs</h2></div><div className="card-body role-monitor-table"><table className="data-table"><thead><tr><th>Time</th><th>Workflow</th><th>Task</th><th>Outcome</th><th>Duration</th><th>Agents</th></tr></thead><tbody>{data.runs.map(run=><tr key={run.id}><td>{time(run.at)}</td><td>{run.workflow}</td><td>{label(run.task)}</td><td>{label(run.outcome)}</td><td>{Number(run.ms).toLocaleString()} ms</td><td>{run.agents.map(agent=>agent.agent).join(', ')}</td></tr>)}</tbody></table>{!data.runs.length&&<p>No recorded role AI runs in this period.</p>}</div></section></>}
  {(tab==='overview'||tab==='activity')&&fresh&&<section className="card mt-24 mb-24"><div className="card-header"><h2>Admin support operations</h2><span>{totals.support} recorded - 7 days</span></div><div className="card-body role-monitor-table"><p className="text-sm text-muted mb-16">Performed by System Admin on accounts currently assigned this role. These are committed support operations, not the role's own actions or evidence of student completion.</p><table className="data-table"><thead><tr><th>Time</th><th>Operation</th><th>Actor</th></tr></thead><tbody>{fresh.supportEvents.map(event=><tr key={event.id}><td>{time(event.at)}</td><td>{label(event.operation)}</td><td>System Admin</td></tr>)}</tbody></table>{!fresh.supportEvents.length&&<p>No support operations in this period.</p>}</div></section>}
  {tab==='health'&&<section className="card"><div className="card-header"><h2>Shared service health</h2></div><div className="card-body"><p className="text-muted mb-16">These checks verify shared services, not an individual account’s provider credentials or academic progress.</p>{checks.map(check=><div className="role-monitor-check" key={check.name}><div><strong>{check.name}</strong><p>{check.note}</p></div><span className={`badge ${check.ok?'badge-published':'badge-draft'}`}>{demo?'Preview':check.ok?'Healthy':'Needs attention'}</span></div>)}</div></section>}
  </>}
 </div>
}
