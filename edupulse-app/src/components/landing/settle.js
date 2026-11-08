// The 3D scenes of the landing page are built once the page has settled: at the reader's first
// touch of it (the pointer, the wheel, a key or a finger) or twenty seconds after
// it loaded, whichever comes first, and only when the browser has a moment. Building a scene is the
// heaviest work the page does, so it never competes with the first paint, the page's own scripts
// or the first input. A test that asks for the walk (the same opt-in as classroom/mode.js) does not
// wait: nothing touches the page there. Returns a function that cancels the wait.
const eager = () => { try { return localStorage.getItem('edupulse-walk') === 'on' } catch { return false } }
const TOUCHES = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart']

export function whenSettled(start, { after = eager() ? 0 : 20000, timeout = 2000 } = {}) {
  let done = false, timer = 0, idle = 0
  const cancel = () => {
    done = true
    clearTimeout(timer)
    if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle)
    for (const name of TOUCHES) window.removeEventListener(name, go, true)
  }
  function go() {
    if (done) return
    cancel()
    if (window.requestIdleCallback) idle = window.requestIdleCallback(start, { timeout })
    else timer = window.setTimeout(start, 0)
    done = true
  }
  for (const name of TOUCHES) window.addEventListener(name, go, { capture: true, passive: true })
  timer = window.setTimeout(go, after)
  return cancel
}
