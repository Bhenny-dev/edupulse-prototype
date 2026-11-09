export type PublicLine = {agent:string|null;text:string;topic?:string;mood?:string;source?:string|null}
export type PublicReply = PublicLine & {agent:string;mood:string;source:string|null;kind?:string}
export function respond(message:string,options?:{to?:string|null;last?:string|null;history?:PublicLine[]}):PublicReply
export function introduce(key:string):PublicReply
export const MOODS:Record<string,string>
