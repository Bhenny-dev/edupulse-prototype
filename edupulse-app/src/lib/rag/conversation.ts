type Turn = { role: string; content: string }
type ConversationInput = { message: string; history?: Turn[] }

export function profileName(text: string) {
  return /^(?:who is|do you know|sino si|kilala mo (?:ba )?si|profile of|find (?:the )?student(?: named)?)\s+([\p{L}\p{N}\s.'’\-]{3,100})[?!]?$/iu.exec(text.trim())?.[1]?.replace(/[.?!]+$/, '').trim() || ''
}
const personPronoun = /\b(?:he|him|his|she|her|hers|they|them|their|siya|sya|niya|nya|kanya|sila|nila)\b/i
const social = /\b(?:facebook|fb)\b/i
const newTopic = /^(?:new topic|different topic|change (?:the )?(?:topic|subject)|unrelated|instead|ibang usapan|iba naman)\b/i
export const conversationalFollowUp = (text: string) => !newTopic.test(text.trim()) && (personPronoun.test(text) || /\b(?:it|its|that|those|these|ito|iyan|iyon|yan)\b/i.test(text) || /^(?:and |also |what about |how about |paano naman |at |sa |on )/i.test(text.trim()))
const named = (text: string) => {
  const value=profileName(text.replace(/\s+(?:on|sa)\s+(?:facebook|fb)[?!]?$/i,''))
  return value&&!personPronoun.test(value)?value:''
}

/** History supplies search hints only. Private matches must be read again under current RLS. */
export function conversationSubject(input: ConversationInput) {
  const message=input.message.trim(), explicit=named(message)
  const followUp=conversationalFollowUp(message)||/^(?:on|sa)\s+(?:facebook|fb)[?!]?$/i.test(message)
  const personFollowUp=personPronoun.test(message)||followUp&&social.test(message)
  if(explicit)return {message,person:explicit,followUp:false,personFollowUp:false,ambiguous:false,social:social.test(message)}
  if(!followUp||!personFollowUp)return {message,person:'',followUp,personFollowUp:false,ambiguous:false,social:social.test(message)}
  let person='',ambiguous=false
  for(const turn of (input.history||[]).slice(-12).reverse()) {
    if(turn.role==='assistant') {
      const names=[...turn.content.matchAll(/(?:Registered student|Recorded instructor|Recorded faculty):\s*([^;\n]{3,100})/gi)].map(match=>match[1]!.trim())
      const unique=[...new Set(names)]
      if(unique.length){ambiguous=unique.length>1;person=ambiguous?'':unique[0]!;break}
    }
    if(turn.role==='user') {
      const previous=named(turn.content)
      if(previous){person=previous;break}
      if(!conversationalFollowUp(turn.content))break
    }
  }
  const resolved=person?message.replace(/\b(?:he|him|his|she|her|hers|they|them|their|siya|sya|niya|nya|kanya|sila|nila)\b/gi,person):message
  return {message:person&&resolved===message?`${message} ${person}`:resolved,person,followUp:true,personFollowUp,ambiguous,social:social.test(message)}
}
