// Stable banner color per course code for Classroom-style class cards and class banners.
const TONES = ['sky', 'navy', 'teal', 'indigo', 'amber', 'rose']
export function toneFor(key = '') {
  let hash = 0
  for (const character of String(key)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}
