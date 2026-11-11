import { z } from 'zod'
import { ApiError, type Identity } from '../contracts.js'
import { userDb } from '../database.js'
import { supportAction } from './support.js'

export const sharingCommand = z.discriminatedUnion('operation', [
 z.object({operation:z.literal('list')}),
 z.object({operation:z.literal('open'),id:z.string().uuid()}),
 z.object({operation:z.literal('send'),syllabus:z.string().min(1).max(120),revision:z.number().int().nonnegative(),email:z.email().max(254)}),
 z.object({operation:z.literal('remove'),id:z.string().uuid()}),
])
export async function syllabusSharing(identity:Identity,input:z.infer<typeof sharingCommand>) {
 if(identity.local || !['instructor','admin'].includes(identity.role))throw new ApiError(403,'FORBIDDEN','Sign in with an instructor account to share syllabi.')
 if(input.operation==='list') {
  let shares
  if(identity.supportActor)shares=await supportAction(identity,'syllabi.read')
  else {
   shares=[]
   // PostgREST can cap a response at 1,000 rows. Read bounded pages so the
   // capacity error cannot silently become a truncated success.
   for(let offset=0;offset<=1000;offset+=500){
    const result=await userDb(identity).from('edupulse_syllabus_shares').select('id,sender_id,recipient_id,syllabus_id,sender_name,recipient_name,created_at,courseCode:snapshot->>courseCode,courseTitle:snapshot->>courseTitle').order('created_at',{ascending:false}).order('id').range(offset,offset+499)
    if(result.error)throw new ApiError(503,'SHARING_UNAVAILABLE','Shared syllabi could not be loaded. Retry when connected.')
    shares.push(...result.data||[])
    if(!result.data||result.data.length<500)break
   }
  }
  if(shares.length>1000)throw new ApiError(503,'SHARING_CAPACITY','More than 1,000 shares are available. Remove old shares before loading this list; nothing was silently omitted.')
  return {shares}
 }
 if(input.operation==='open') {
  const result=identity.supportActor?{data:{snapshot:await supportAction(identity,'syllabi.open',input)},error:null}:await userDb(identity).from('edupulse_syllabus_shares').select('snapshot').eq('id',input.id).maybeSingle()
  if(result.error)throw new ApiError(503,'SHARING_UNAVAILABLE','This shared syllabus could not be opened. Retry when connected.')
  if(!result.data?.snapshot)throw new ApiError(404,'SHARE_UNAVAILABLE','This shared syllabus is no longer available.')
  return {syllabus:result.data.snapshot}
 }
 if(identity.supportActor)return supportAction(identity,'syllabi.command',input)
 const result=await userDb(identity).rpc('edupulse_syllabus_share',{command:input})
 if(result.error)throw new ApiError(result.error.code==='42501'?403:result.error.code==='22023'?400:result.error.code==='40001'?409:503,'SHARING_FAILED',['22023','40001'].includes(result.error.code)?result.error.message:'Sharing could not be confirmed. Refresh and retry.')
 return result.data
}
