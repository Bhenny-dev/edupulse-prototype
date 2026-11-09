import {createHash} from 'node:crypto'
import {config} from '../config.js'
import {localDb,userDb} from '../database.js'
import {ApiError,type Identity} from '../contracts.js'
import {referenceSnapshotToken} from '../../src/lib/rag/syllabusReferences.js'
import type {SourceReference,SourceSnapshot,SourceSummary} from './contracts.js'
export const sourceKey=(ref:SourceReference)=>createHash('sha256').update(referenceSnapshotToken(ref)).digest('hex')
export const localSourceSchema=`CREATE TABLE IF NOT EXISTS ep_source_archives (
 id uuid PRIMARY KEY,owner_id text NOT NULL,reference_key text NOT NULL,reference jsonb NOT NULL,
 url text NOT NULL,sha256 text NOT NULL,name text NOT NULL,mime text NOT NULL,size integer NOT NULL CHECK(size>0 AND size<=2000000),
 text text NOT NULL CHECK(length(text)<=150000),base64 text NOT NULL,pages integer NOT NULL,truncated boolean NOT NULL,
 warnings jsonb NOT NULL DEFAULT '[]',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id,reference_key,sha256));
 CREATE INDEX IF NOT EXISTS ep_source_archives_owner_key ON ep_source_archives(owner_id,reference_key,created_at DESC);`
const initialized=new WeakSet<object>()
async function local(){const pg=await localDb();if(!initialized.has(pg)){await pg.exec(localSourceSchema);initialized.add(pg)}return pg}
function unavailable(error:unknown){if(error&&typeof error==='object'&&'code' in error&&error.code==='23514')throw new ApiError(429,'SOURCE_ARCHIVE_LIMIT','The retained source limit was reached. Remove an unused saved version before retaining another.');if(error)throw new ApiError(503,'SOURCE_STORE_UNAVAILABLE','Retained sources are unavailable. Check the source-archive migration and connection. No source was claimed as saved.')}
const summaryColumns='id,reference_key,reference,url,sha256,name,mime,size,pages,truncated,warnings,created_at'
export async function listSnapshots(identity:Identity,keys:string[]):Promise<SourceSummary[]>{
 if(!keys.length)return []
 let rows:Omit<SourceSnapshot,'text'|'base64'>[]
 if(config().database==='local')rows=(await (await local()).query<Omit<SourceSnapshot,'text'|'base64'>>(`SELECT ${summaryColumns} FROM ep_source_archives WHERE owner_id=$1 AND reference_key=ANY($2::text[]) ORDER BY created_at DESC`,[identity.id,keys])).rows
 else {const result=await userDb(identity).from('edupulse_source_archives').select(summaryColumns).eq('owner_id',identity.id).in('reference_key',keys).order('created_at',{ascending:false}).limit(201);unavailable(result.error);rows=result.data as typeof rows}
 if(rows.length>200)throw new ApiError(413,'SOURCE_ARCHIVE_LIMIT','More than 200 retained source versions match this list. Remove unused versions before reading this source view.')
 const counts=new Map<string,number>();for(const row of rows)counts.set(row.reference_key,(counts.get(row.reference_key)||0)+1)
 return rows.map(row=>({...row,created_at:new Date(row.created_at).toISOString(),status:'retained',versions:counts.get(row.reference_key)!}))
}
export async function readSnapshot(identity:Identity,id:string,original=false):Promise<SourceSnapshot>{
 let row:SourceSnapshot|undefined
 if(config().database==='local')row=(await (await local()).query<SourceSnapshot>(`SELECT ${summaryColumns},text${original?',base64':''} FROM ep_source_archives WHERE id=$1 AND owner_id=$2`,[id,identity.id])).rows[0]
 else {const result=await userDb(identity).from('edupulse_source_archives').select(`${summaryColumns},text${original?',base64':''}`).eq('owner_id',identity.id).eq('id',id).maybeSingle();unavailable(result.error);row=result.data as unknown as SourceSnapshot|undefined}
 if(!row)throw new ApiError(404,'SOURCE_NOT_FOUND','This retained source is not available in your account.')
 return {...row,created_at:new Date(row.created_at).toISOString()}
}
export async function saveSnapshot(identity:Identity,snapshot:SourceSnapshot){
 if(config().database==='local'){
  const pg=await local()
  await pg.transaction(async tx=>{
   const count=Number((await tx.query<{count:number}>('SELECT count(*)::int AS count FROM ep_source_archives WHERE owner_id=$1',[identity.id])).rows[0]?.count||0)
   const exists=(await tx.query<{id:string}>('SELECT id FROM ep_source_archives WHERE owner_id=$1 AND reference_key=$2 AND sha256=$3',[identity.id,snapshot.reference_key,snapshot.sha256])).rows[0]
   if(exists)return
   if(count>=200)throw new ApiError(429,'SOURCE_ARCHIVE_LIMIT','This account has 200 retained source versions. Remove an unused version before retaining another.')
   await tx.query('INSERT INTO ep_source_archives(id,owner_id,reference_key,reference,url,sha256,name,mime,size,text,base64,pages,truncated,warnings,created_at) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)',[snapshot.id,identity.id,snapshot.reference_key,JSON.stringify(snapshot.reference),snapshot.url,snapshot.sha256,snapshot.name,snapshot.mime,snapshot.size,snapshot.text,snapshot.base64,snapshot.pages,snapshot.truncated,JSON.stringify(snapshot.warnings),snapshot.created_at])
  })
 }else{
  const result=await userDb(identity).from('edupulse_source_archives').upsert({...snapshot,owner_id:identity.id},{onConflict:'owner_id,reference_key,sha256',ignoreDuplicates:true});unavailable(result.error)
 }
 const found=(await listSnapshots(identity,[snapshot.reference_key])).find(row=>row.sha256===snapshot.sha256)
 if(!found)throw new ApiError(503,'SOURCE_STORE_UNAVAILABLE','The source save was not confirmed. Retry before using it as retained evidence.')
 return found
}
export async function removeSnapshot(identity:Identity,id:string){
 await readSnapshot(identity,id)
 if(config().database==='local')await (await local()).query('DELETE FROM ep_source_archives WHERE id=$1 AND owner_id=$2',[id,identity.id])
 else unavailable((await userDb(identity).from('edupulse_source_archives').delete().eq('owner_id',identity.id).eq('id',id)).error)
 return {removed:true}
}
