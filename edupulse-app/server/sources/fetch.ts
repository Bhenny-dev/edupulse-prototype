import {lookup} from 'node:dns/promises'
import {request as httpsRequest} from 'node:https'
import {request as httpRequest} from 'node:http'
import {BlockList,isIP} from 'node:net'
import {ApiError} from '../contracts.js'
import {SOURCE_BYTES} from './contracts.js'
const blocked=new BlockList()
for(const [ip,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked.addSubnet(ip,prefix,'ipv4')
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6')
for(const [ip,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16]] as const)blocked.addSubnet(ip,prefix,'ipv6')
export function isPublicAddress(address:string){const family=isIP(address);return family===4?!blocked.check(address,'ipv4'):family===6&&globalV6.check(address,'ipv6')&&!blocked.check(address,'ipv6')}
export function sourceUrl(value:string){
 let url:URL;try{url=new URL(value)}catch{throw new ApiError(400,'SOURCE_URL','Use a complete public HTTPS or HTTP source URL.')}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port&&url.port!==(url.protocol==='https:'?'443':'80')||isIP(url.hostname.replace(/^\[|\]$/g,''))||!url.hostname.includes('.')||/\.(?:local|localhost|internal|test|invalid)\.?$/i.test(url.hostname))throw new ApiError(400,'SOURCE_URL','Only public web sources on standard web ports can be read.')
 url.hash='';return url
}
type Address={address:string;family:number}
type Download={bytes:Uint8Array;mime:string;url:string;metadataOnly?:boolean}
type Response={status:number;headers:Record<string,string|undefined>;bytes:Uint8Array}
// DNS is checked and pinned into the socket lookup, including after each redirect.
// No browser cookies, authorization headers, source instructions or scripts are used.
async function requestPinned(url:URL,address:Address,signal:AbortSignal):Promise<Response>{
 return new Promise((resolve,reject)=>{
  const request=(url.protocol==='https:'?httpsRequest:httpRequest)(url,{method:'GET',signal,headers:{Accept:'application/pdf,text/html,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document','Accept-Encoding':'identity','User-Agent':'EduPulse source reader/0.4'},lookup:(_host,options,callback)=>{if(typeof options==='object'&&options.all)callback(null,[address]);else callback(null,address.address,address.family)}},response=>{
   const headers={location:response.headers.location,type:response.headers['content-type'],encoding:response.headers['content-encoding'],length:response.headers['content-length']}
   if(response.statusCode!==200){response.destroy();resolve({status:response.statusCode||0,headers,bytes:new Uint8Array()});return}
   if(headers.encoding&&headers.encoding!=='identity'||Number(headers.length)>SOURCE_BYTES){response.destroy();reject(new ApiError(413,'SOURCE_TOO_LARGE','This source is compressed or larger than 2 MB. Attach a readable chapter or smaller copy.'));return}
   const chunks:Buffer[]=[];let size=0
   response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>SOURCE_BYTES){response.destroy();reject(new ApiError(413,'SOURCE_TOO_LARGE','This source is larger than 2 MB. Attach a readable chapter or smaller copy.'))}else chunks.push(chunk)})
   response.on('end',()=>resolve({status:200,headers,bytes:Buffer.concat(chunks)}));response.on('error',reject)
  });request.on('error',reject);request.end()
 })
}
export async function downloadSource(value:string,signal:AbortSignal,dependencies:{resolve?:(host:string)=>Promise<Address[]>;request?:typeof requestPinned;allowCatalog?:boolean}={}):Promise<Download>{
 const abort=AbortSignal.any([signal,AbortSignal.timeout(15_000)])
 let url=sourceUrl(value)
 for(let redirects=0;redirects<=3;redirects++){
  abort.throwIfAborted()
  const addresses=await (dependencies.resolve||((host:string)=>lookup(host,{all:true,verbatim:true})))(url.hostname)
  abort.throwIfAborted()
  if(!addresses.length||addresses.some(address=>!isPublicAddress(address.address)))throw new ApiError(400,'SOURCE_URL','This address is not a public source. Internal and reserved networks cannot be read.')
  const result=await (dependencies.request||requestPinned)(url,addresses.find(address=>address.family===4)||addresses[0]!,abort)
  if([301,302,303,307,308].includes(result.status)&&result.headers.location&&redirects<3){url=sourceUrl(new URL(result.headers.location,url).href);continue}
  if(result.status!==200)throw new ApiError(422,'SOURCE_UNAVAILABLE','The source is unavailable, requires access, or redirected too many times. Attach an accessible copy instead.')
  if(!result.bytes.length||result.bytes.length>SOURCE_BYTES)throw new ApiError(413,'SOURCE_TOO_LARGE','Choose a readable source up to 2 MB.')
  const mime=(result.headers.type||'').split(';')[0]!.toLowerCase().trim()
  if(!['application/pdf','text/html','application/xhtml+xml','text/plain','text/markdown','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mime))throw new ApiError(422,'SOURCE_FORMAT','This link does not serve a supported PDF, DOCX, HTML or text document. Attach a readable copy instead.')
  let metadataOnly=false
  if(mime.includes('html')){
   const host=url.hostname.toLowerCase()
   metadataOnly=['openlibrary.org','books.google.com','www.worldcat.org','search.worldcat.org','www.goodreads.com','openalex.org'].includes(host)||/(?:^|\.)amazon\.[a-z.]+$/.test(host)||/\/(?:search|catalog|results)(?:\/|$)/i.test(url.pathname)
   if(metadataOnly&&!dependencies.allowCatalog)throw new ApiError(422,'SOURCE_METADATA_ONLY','This is a catalog or search listing, not readable teaching contents. Attach the book or a readable chapter instead.')
   const head=Buffer.from(result.bytes).toString('utf8').slice(0,100000)
   if(/<input\b[^>]*type\s*=\s*["']?password/i.test(head)||/<title[^>]*>[^<]*(?:sign in|log in|access denied|just a moment|verify you are human|captcha)/i.test(head))throw new ApiError(422,'SOURCE_ACCESS_REQUIRED','The link returned a sign-in, access or verification page. Its text was not retained as source content. Attach an accessible copy instead.')
  }
  return {bytes:result.bytes,mime,url:url.href,...(metadataOnly?{metadataOnly:true}:{})}
 }
 throw new ApiError(422,'SOURCE_UNAVAILABLE','The source could not be read.')
}
