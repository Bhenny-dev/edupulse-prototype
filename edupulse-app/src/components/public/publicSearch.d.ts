import type {PublicLine} from './pulseTalk.js'
export type PublicMatch={id:string;head:string;body:string;source:string;owner:string;agent?:string;person?:boolean;score:number;coverage:number;titleHits:number;corrections:{from:string;to:string}[]}
export function rankPublicInfo(message:string):PublicMatch[]
export function publicContext(message:string,history?:PublicLine[]):Omit<PublicMatch,'score'|'coverage'|'titleHits'|'corrections'>|null
