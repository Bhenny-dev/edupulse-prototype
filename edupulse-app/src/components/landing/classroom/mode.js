// How the landing page is presented on this device, decided once before the first paint:
//   - 'full': the walk through the 3D school, with each section's content laid on a classroom surface;
//   - 'lite': narrow or portrait screens: the 3D school behind ordinary scrolling content;
//   - 'flat': reduced motion or no WebGL: the same classroom theme, complete and still, in CSS only.
let mode = 'flat'

let drawable
const canDraw = () => {
  if (drawable !== undefined) return drawable
  try {
    const probe = document.createElement('canvas')
    const context = probe.getContext('webgl2') || probe.getContext('webgl')
    if (context) context.getExtension('WEBGL_lose_context')?.loseContext()
    drawable = Boolean(context)
  } catch {
    drawable = false
  }
  return drawable
}
const FULL = '(min-width: 1024px) and (min-height: 560px) and (min-aspect-ratio: 1/1)'

// An automated browser (tests, documentation captures) gets the page without the 3D school, where
// every section and the sign-in panel are ordinary content it can scroll to and click. A test of the
// walk itself asks for it: localStorage 'edupulse-walk' = 'on'.
const automated = () => {
  if (!navigator.webdriver) return false
  try { return localStorage.getItem('edupulse-walk') !== 'on' } catch { return true }
}

// What fits this device now. The page compares it with the mode in use when the window or the motion
// setting changes: a page in 'flat' stays as it is however the window is resized (a capture of a tall
// section resizes it), and only a crossing that changes the mode reloads the page.
export function wantedMode() {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return reduced || automated() || !canDraw() ? 'flat' : window.matchMedia(FULL).matches ? 'full' : 'lite'
}
export function decideMode() {
  mode = wantedMode()
  return mode
}
export const currentMode = () => mode
export const isWorld = () => mode === 'full'
export const fullQuery = FULL
// A section's own entrance triggers: on the walk its content is laid on a surface, so the section's
// place in the page is what says when it arrives.
export function rectIn(element, ancestor) {
  let x = 0, y = 0, node = element
  while (node && node !== ancestor) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent }
  return { x, y, w: element.offsetWidth, h: element.offsetHeight }
}
export const triggerFor = element => (mode === 'full' ? element.closest('[data-room]') || element : element)
