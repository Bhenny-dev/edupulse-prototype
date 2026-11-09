import type { ChatCompletionRequestNonStreaming, ChatCompletion } from '@mlc-ai/web-llm'

type CompletionClient = {
  chat: { completions: { create(request:ChatCompletionRequestNonStreaming):Promise<ChatCompletion> } }
  interruptGenerate():void
  resetChat():Promise<void>
}

/** WebLLM's JSON-schema path requires a serialized schema, even for an open object.
 * The courseware graph still validates the exact teaching-content schema afterwards.
 */
export async function completeInBrowser(client:CompletionClient,system:string,prompt:string,signal:AbortSignal,json=false) {
  signal.throwIfAborted()
  const interrupt=()=>client.interruptGenerate()
  signal.addEventListener('abort',interrupt,{once:true})
  try {
    const response=await client.chat.completions.create({messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature:0.2,max_tokens:json?2200:1000,...(json?{response_format:{type:'json_object' as const,schema:JSON.stringify({type:'object'})}}:{})})
    signal.throwIfAborted()
    if(response.choices[0]?.finish_reason==='length')throw new Error('The on-device model reached its output limit. Nothing was applied; select a smaller section or use a larger provider model.')
    const text=response.choices[0]?.message.content?.trim()
    if(!text)throw new Error('The local model returned no text. Try a smaller prompt or the balanced model.')
    return text
  } catch(failure) {
    // Worker transports may reject with a string. LangGraph annotates errors;
    // preserving an Error here avoids hiding the cause behind pregelTaskId.
    if(failure instanceof Error)throw failure
    throw new Error(typeof failure==='string'?failure.slice(0,500):'The on-device model could not complete this request. Reload the model in AI settings and try again.')
  } finally {
    signal.removeEventListener('abort',interrupt)
    await client.resetChat().catch(()=>{})
  }
}
