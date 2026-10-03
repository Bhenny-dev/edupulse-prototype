import { defineAgent } from './defineAgent'

export default defineAgent({
  id: 'general', zone: 'general', label: 'This page', roles: 'all',
  greeting: () => 'What would you like to do here? I can explain the selected control, help you prepare a draft, or guide you to the next part of the workflow.',
  intents: [
    { key: 'explain', label: 'Explain this component', steps: [
      { title: 'Review the selected component', body: 'The highlighted component is the context for our conversation. Ask what it does or what information belongs here. Sensitive fields and passwords are never read into the assistant.' },
      { title: 'Try the visible action', body: 'Use the page control when you are ready. I can explain an error or help prepare the text before you submit it.' },
      { title: 'Review the result', body: 'Check the page’s own saved/error state. Finishing this explanation does not mean a record was saved or an action was completed.' },
    ] },
  ],
})
