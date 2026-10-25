/** Exact lightweight intents only: never swallow a task, distress disclosure or attached source. */
export function quickReply(message: string): string | null {
  const text = message.trim().replace(/[.!?]+$/g, '').trim().toLowerCase()
  if (/^(?:hi|hello|hey|yo|good morning|good afternoon|good evening)(?:[, ]+(?:pulse|there|team))?$/.test(text)) return 'Hi! What would you like to work on? I can open a page, help with a file, or prepare a draft for your review.'
  if (/^(?:thanks|thank you|thanks pulse|thank you pulse|salamat|salamat po)$/.test(text)) return 'You’re welcome! I’m here when you’re ready for the next step.'
  if (/^(?:kumusta|kamusta)(?: pulse)?$/.test(text)) return 'Kumusta! Ano ang gusto mong gawin? Maaari kitang gabayan sa pahina, file, o draft mo.'
  if (/^(?:how are you|how are you doing)(?: pulse)?$/.test(text)) return 'Ready to help, with the workspace crew on standby. How’s your day going?'
  if (/^(?:bye|goodbye|see you|good night)(?: pulse)?$/.test(text)) return 'See you! Your saved conversations will be here when you come back.'
  return null
}
