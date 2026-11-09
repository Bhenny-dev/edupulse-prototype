import {z} from 'zod'
export const SOURCE_BYTES=2_000_000, SOURCE_TEXT=150_000
export const sourceReference=z.object({kind:z.enum(['book','link']),title:z.string().trim().min(1).max(500),url:z.string().max(2000).default(''),authors:z.string().max(1000).default(''),year:z.string().max(40).default(''),publisher:z.string().max(500).default('')}).strict()
export const sourceCommand=z.discriminatedUnion('operation',[
 z.object({operation:z.literal('list'),references:z.array(sourceReference).max(80)}).strict(),
 z.object({operation:z.literal('read'),references:z.array(sourceReference).min(1).max(3),refresh:z.boolean().default(false)}).strict(),
 z.object({operation:z.literal('attach'),reference:sourceReference,name:z.string().min(1).max(255),base64:z.string().min(4).max(Math.ceil(SOURCE_BYTES/3)*4).regex(/^[A-Za-z0-9+/]+={0,2}$/)}).strict(),
 z.object({operation:z.literal('evidence'),references:z.array(sourceReference).max(80),focus:z.string().min(1).max(1500)}).strict(),
 z.object({operation:z.literal('review'),id:z.string().uuid()}).strict(),
 z.object({operation:z.literal('open'),id:z.string().uuid()}).strict(),
 z.object({operation:z.literal('remove'),id:z.string().uuid()}).strict(),
])
export type SourceReference=z.infer<typeof sourceReference>
export type SourceSnapshot={id:string;reference_key:string;reference:SourceReference;url:string;sha256:string;name:string;mime:string;size:number;text:string;base64:string;pages:number;truncated:boolean;created_at:string;warnings:string[]}
export type SourceSummary=Omit<SourceSnapshot,'text'|'base64'>&{versions:number;status:'retained'}
export type SourceStatus={reference:SourceReference;key:string;status:'retained'|'unread'|'unavailable'|'attachment-needed';message?:string;snapshot?:SourceSummary}
