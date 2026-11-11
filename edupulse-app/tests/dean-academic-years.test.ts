import test from 'node:test'
import assert from 'node:assert/strict'
import {academicStudentYears} from '../server/domains/academic'

test('Dean year enrichment reads only visible memberships in bounded chunks and fails closed',async()=>{
 const requested:string[][]=[];let fail=false
 const query={select(fields:string){assert.equal(fields,'email,year_level');return this},eq(key:string,value:boolean){assert.equal(key,'active');assert.equal(value,true);return this},async in(key:string,values:string[]){assert.equal(key,'email');requested.push(values);return fail?{error:{message:'offline'},data:null}:{error:null,data:values.slice(0,-1).map(email=>({email,year_level:2}))}}}
 const client={from(table:string){assert.equal(table,'edupulse_students');return query}} as unknown as Parameters<typeof academicStudentYears>[0]
 const rows=Array.from({length:401},(_,i)=>({course_id:'visible-course',student_email:`student${i}@example.invalid`}))
 const enriched=await academicStudentYears(client,[...rows,rows[0]])
 assert.deepEqual(requested.map(chunk=>chunk.length),[200,200,1]);assert.equal(new Set(requested.flat()).size,401)
 assert.equal(enriched.length,402);assert.equal(enriched[0].year_level,2);assert.equal(enriched[199].year_level,null)
 assert.deepEqual(Object.keys(enriched[0]).sort(),['course_id','student_email','year_level'])
 requested.length=0;assert.deepEqual(await academicStudentYears(client,[]),[]);assert.equal(requested.length,0)
 fail=true;await assert.rejects(academicStudentYears(client,rows),/year levels could not be verified/)
})
