// Keep the editor's existing bullet character compatible with Markdown lists,
// without changing literal examples inside backtick or tilde code fences.
export function prepareCoursewareMarkdown(value) {
  let fence = null
  return String(value ?? '').replace(/\r\n?/g, '\n').split('\n').map(line => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (marker) {
      if (!fence) fence = marker[1]
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null
      return line
    }
    return fence ? line : line.replace(/^(\s*)•\s+/, '$1- ')
  }).join('\n')
}
