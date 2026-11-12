export const MONITOR_ROLES = ['dean', 'associate_dean', 'instructor', 'student']
export const MONITOR_TABS = ['overview', 'accounts', 'activity', 'ai', 'health']
type Account = {role:string;id?:string;name?:string;email?:string;confirmed?:boolean;lastSignIn?:string}
type Event = {actorRole:string;id?:string;at?:string;action?:string;outcome?:string;detail?:string}
type Run = {role:string;id?:string;at?:string;workflow?:string;task?:string;outcome?:string;ms?:number;agents?:{agent:string}[]}
function groups(values:(string|undefined)[]):[string,number][] {
 const counts=new Map<string,number>()
 for(const value of values){const key=value||'Unknown';counts.set(key,(counts.get(key)||0)+1)}
 return [...counts].sort((a,b)=>b[1]-a[1])
}
export function roleMonitoring(role:string, overview:{accounts:Account[];appEvents:Event[]}, activity:{recent:Run[]}) {
 if (!MONITOR_ROLES.includes(role)) throw new Error('Invalid monitoring role')
 const accounts=overview.accounts.filter(account=>account.role===role)
 // Auth events have no trustworthy role attribution; never infer it from names.
 const events=overview.appEvents.filter(event=>event.actorRole===role)
 const runs=activity.recent.filter(run=>run.role===role)
 return {accounts,events,runs,actions:groups(events.map(event=>event.action)),outcomes:groups(runs.map(run=>run.outcome))}
}
