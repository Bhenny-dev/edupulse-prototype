import test from 'node:test'
import assert from 'node:assert/strict'
import {roleMonitoring} from '../src/components/admin/monitoringData.js'
test('monitoring keeps role-attributed windows separate and never counts unassigned auth events',()=>{
 const overview={accounts:[{role:'student'},{role:'instructor'}],appEvents:[{actorRole:'student',action:'navigation'},{actorRole:'instructor',action:'save'}],authEvents:[{action:'signin'}]}
 const activity={recent:[{role:'student',outcome:'answered'},{role:'instructor',outcome:'failed'}]}
 const before=JSON.stringify({overview,activity})
 const data=roleMonitoring('student',overview,activity)
 assert.equal(data.accounts.length,1);assert.equal(data.events.length,1);assert.equal(data.runs.length,1)
 assert.deepEqual(data.actions,[['navigation',1]]);assert.deepEqual(data.outcomes,[['answered',1]])
 assert.equal(JSON.stringify({overview,activity}),before)
 assert.throws(()=>roleMonitoring('admin',overview,activity),/Invalid/)
 assert.deepEqual(roleMonitoring('dean',overview,activity).events,[])
})
