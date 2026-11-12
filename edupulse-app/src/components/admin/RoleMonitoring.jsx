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
export default function RoleMonitoring({role,overview,checks,activity,busy,error,agentError,refresh,openRole,demo}) {
 const [params,setParams]=useSearchParams()
 const tab=MONITOR_TABS.includes(params.get('monitorTab'))?params.get('monitorTab'):'overview'
 const [query,setQuery]=useState('')
 const data=roleMonitoring(role,overview,activity)
 const changeTab=value=>setParams({role,monitorTab:value})
 const accounts=data.accounts.filter(account=>`${account.name} ${account.email||''}`.toLowerCase().includes(query.toLowerCase()))
 return <div className="container role-monitor">
  <div className="page-header"><div><h1>{ROLE_TITLES[role]} monitoring</h1><p className="text-sm text-muted mt-8">System Admin oversight · {demo?'Preview samples':'Recorded system activity'}</p></div><div className="flex flex-wrap gap-12"><button className="btn btn-secondary" disabled={busy} onClick={refresh}>{busy?<Spinner size={16}/>:<RefreshCw size={16}/>} Refresh</button><button className="btn btn-primary" disabled={demo||busy||Boolean(error)} onClick={()=>openRole(role)}>Choose account view</button></div></div>
  {error&&<p role="alert" className="ai-notice">{error}</p>}
  <div className="tabs mb-24" aria-label="Role monitoring sections">{MONITOR_TABS.map(value=><button key={value} className={`tab ${value===tab?'active':''}`} aria-pressed={value===tab} onClick={()=>changeTab(value)}>{titles[value]}</button>)}</div>
  {busy&&!checks.length?<SkeletonContent label="Loading role monitoring" variant="page"/>:<>
  <div className="kpi-grid mb-24">
   <SummaryCard icon={Users} label="Role accounts" value={error?'—':data.accounts.length} onClick={()=>changeTab('accounts')}/>
   <SummaryCard icon={Activity} label="Loaded role events" value={error?'—':data.events.length} onClick={()=>changeTab('activity')}/>
   <SummaryCard icon={Bot} label="Recent role AI runs" value={agentError?'—':data.runs.length} onClick={()=>changeTab('ai')}/>
   <SummaryCard icon={ShieldCheck} label="Shared services passing" value={`${checks.filter(c=>c.ok).length}/${checks.length}`} onClick={()=>changeTab('health')}/>
  </div>
  {(tab==='overview'||tab==='activity'||tab==='ai')&&<p className="text-sm text-muted mb-24">Activity covers this role within the latest 100 system audit events. AI usage covers this role within the latest 30 runs from the last 7 days. These are loaded windows, not lifetime totals or provider billing. Service health is shared across roles.</p>}
  {tab==='overview'&&<div className="grid-2 mb-24"><Distribution title="Recorded actions" rows={error?[]:data.actions}/><Distribution title="Recent AI outcomes" rows={agentError?[]:data.outcomes}/></div>}
  {tab==='accounts'&&<section className="card"><div className="card-header"><h2>Accounts</h2><label>Search accounts <input className="form-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or email"/></label></div><div className="card-body role-monitor-table"><table className="data-table"><thead><tr><th>Name</th><th>Username</th><th>Confirmation</th><th>Last sign-in</th></tr></thead><tbody>{accounts.map(account=><tr key={account.id}><td>{account.name}</td><td>{account.email||'Not available'}</td><td>{account.confirmed?'Confirmed':'Pending'}</td><td>{time(account.lastSignIn)}</td></tr>)}</tbody></table>{!accounts.length&&<p>No matching accounts.</p>}</div></section>}
  {tab==='activity'&&<><Distribution title="Recorded actions" rows={error?[]:data.actions}/><section className="card mt-24"><div className="card-header"><h2>Role audit log</h2></div><div className="card-body role-monitor-table"><table className="data-table"><thead><tr><th>Time</th><th>Action</th><th>Result</th><th>Detail</th></tr></thead><tbody>{data.events.map(event=><tr key={event.id}><td>{time(event.at)}</td><td>{label(event.action)}</td><td>{event.outcome}</td><td>{event.detail}</td></tr>)}</tbody></table>{!data.events.length&&<p>No role-attributed events in the loaded audit window.</p>}</div></section></>}
  {tab==='ai'&&<>{agentError&&<p role="alert" className="ai-notice">{agentError}</p>}<Distribution title="Recent AI outcomes" rows={agentError?[]:data.outcomes}/><section className="card mt-24"><div className="card-header"><h2>Recorded AI runs</h2></div><div className="card-body role-monitor-table"><table className="data-table"><thead><tr><th>Time</th><th>Workflow</th><th>Task</th><th>Outcome</th><th>Duration</th><th>Agents</th></tr></thead><tbody>{data.runs.map(run=><tr key={run.id}><td>{time(run.at)}</td><td>{run.workflow}</td><td>{label(run.task)}</td><td>{label(run.outcome)}</td><td>{Number(run.ms).toLocaleString()} ms</td><td>{run.agents.map(agent=>agent.agent).join(', ')}</td></tr>)}</tbody></table>{!data.runs.length&&<p>No role-attributed AI runs in the loaded window.</p>}</div></section></>}
  {tab==='health'&&<section className="card"><div className="card-header"><h2>Shared service health</h2></div><div className="card-body"><p className="text-muted mb-16">These checks verify shared services, not an individual account’s provider credentials or academic progress.</p>{checks.map(check=><div className="role-monitor-check" key={check.name}><div><strong>{check.name}</strong><p>{check.note}</p></div><span className={`badge ${check.ok?'badge-published':'badge-draft'}`}>{demo?'Preview':check.ok?'Healthy':'Needs attention'}</span></div>)}</div></section>}
  </>}
 </div>
}
