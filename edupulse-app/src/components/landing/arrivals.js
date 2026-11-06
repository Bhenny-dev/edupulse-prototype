import { gsap, ScrollTrigger } from './motion'

// Section arrivals. When a block comes into view, scrolling down or back up, it eases in over
// about a second, however fast the reader scrolls, so it never rests half way:
//   - a card (a block with a surface) slides in from a side of the screen as it fades up: `from`
//     names the side. `fan` sends cards in a row outward (the left ones from the left, the right
//     ones from the right, the middle one from the edge it is arriving at); `bottom` and `fan`
//     come from the top instead when the reader is scrolling back up to them. Its icons and text
//     then rise into place one by one;
//   - a text block (a heading, a list without a surface) rises into place line by line.
// Blocks that come into view together follow one another. A block that leaves the view eases
// back out, so the same entrance plays again on the way back. Nothing is hidden by CSS: the
// caller runs this only without reduced motion, and the inline styles written here (`translate`,
// which leaves a component's own transform alone) are removed once a block is in place. The
// agent workspace, the sign-in form and the photographs keep their own entrances.
export const ARRIVALS = [
  {
    id: 'problem',
    blocks: [
      { sel: '.why-head', kind: 'text' },
      { sel: '.why-switch', kind: 'text', self: true },
      { sel: '.why-card', kind: 'card', from: 'fan', parts: '.why-icon, .why-area, .why-text, .why-state' },
      { sel: '.why-note', kind: 'text', self: true },
    ],
  },
  {
    id: 'features',
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.fs-copy', kind: 'card', from: 'left', parts: '.fs-count, .fs-steps, .fs-chapters' },
      { sel: '.fs-frame', kind: 'card', from: 'right', parts: '.fs-bar, .fs-caption' },
    ],
  },
  {
    id: 'flow',
    blocks: [
      { sel: '.flow-head', kind: 'text' },
      { sel: '.flow-card', kind: 'card', from: 'right' },
    ],
  },
  {
    id: 'roles',
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.role-tabs', kind: 'card', from: 'top', parts: '.role-tab' },
      { sel: '.role-panels', kind: 'card', from: 'bottom', parts: '.role-panel.is-active > *' },
    ],
  },
  {
    id: 'ai',
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.promises li', kind: 'card', from: 'left' },
    ],
  },
  { id: 'agents', blocks: [{ sel: '.agents-head', kind: 'text' }] },
  {
    id: 'impact',
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.evidence-item', kind: 'card', from: 'fan' },
      { sel: '.goals', kind: 'card', from: 'bottom', parts: '.goals h3, .goals li' },
    ],
  },
  {
    id: 'colleges',
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.college-card', kind: 'card', from: 'right' },
    ],
  },
  { id: 'campus', blocks: [{ sel: '.lp-head', kind: 'text' }] },
  {
    id: 'faq',
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.faq-item', kind: 'text', self: true },
    ],
  },
]

const TIME = 0.95 // seconds an entrance takes
const OUT = 1.6 // how much faster a block eases back out than it came in
const LAG = 0.07, MAX_LAG = 0.28 // seconds between blocks that come into view together
const ENTER = 0.9 // a block arrives when its top is above this share of the viewport's height...
const LEAVE = 112 // ...and leaves when its bottom has gone this many px from the top (the bar and a little more)
const RISE = 16 // px a part rises from
const ease = gsap.parseEase('power2.inOut') // a soft start and a soft landing

const clamp01 = value => Math.min(1, Math.max(0, value))
const smooth = (edge0, edge1, value) => { const t = clamp01((value - edge0) / (edge1 - edge0)); return t * t * (3 - 2 * t) }

const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
const wanted = (top, bottom, height, end) => (top < height * ENTER || (end && top < height)) && bottom > LEAVE

// How far a card travels and from where, chosen from where it stands now.
function slideOf(block, rect, height) {
  const width = window.innerWidth
  const x = Math.min(width * 0.2, 260), y = Math.min(height * 0.14, 130)
  const centre = rect.left - block.dx + rect.width / 2
  const side = block.spec.from !== 'fan' ? block.spec.from : centre < width * 0.38 ? 'left' : centre > width * 0.62 ? 'right' : 'bottom'
  if (side === 'left') return { x: -x, y: 0 }
  if (side === 'right') return { x, y: 0 }
  if (side === 'top') return { x: 0, y: -y }
  return { x: 0, y: rect.top - block.dy < 0 ? -y : y } // from above only when its top is already above the screen
}

export function setupArrivals(page) {
  let cancelled = false, frame = 0, last = 0
  const blocks = []
  for (const { id, blocks: specs } of ARRIVALS) {
    const section = page.querySelector(`#${id}`)
    if (!section) continue
    for (const spec of specs) {
      for (const element of section.querySelectorAll(spec.sel)) {
        if (element.closest('[data-arrival]')) continue // a block inside another block arrives with it
        element.setAttribute('data-arrival', spec.kind)
        blocks.push({ spec, element, t: 0, goal: false, slide: { x: 0, y: 0 }, dx: 0, dy: 0, drawn: -1, parts: null })
      }
    }
  }

  const partsOf = block => {
    const { self, parts } = block.spec
    if (self) return [block.element]
    if (parts) return [...block.element.querySelectorAll(parts)]
    return [...block.element.children].filter(child => !child.matches('[data-split], .sr-only'))
  }

  // Removes only what draw() wrote.
  function clear(block) {
    for (const element of [block.element, ...(block.parts || [])]) {
      element.style.opacity = ''
      element.style.translate = ''
      element.style.willChange = ''
    }
    block.element.removeAttribute('data-arriving')
    block.parts = null
    block.dx = block.dy = 0
  }

  // The block's styles for how far it has come (t, in seconds).
  function draw(block) {
    const p = clamp01(block.t / TIME)
    if (p === block.drawn) return
    block.drawn = p
    if (p >= 1) { clear(block); return }
    const { element, spec } = block
    const card = spec.kind === 'card', moving = p > 0
    element.toggleAttribute('data-arriving', moving)
    if (!block.parts) block.parts = partsOf(block)
    if (card) {
      const away = 1 - ease(p)
      block.dx = block.slide.x * away
      block.dy = block.slide.y * away
      element.style.opacity = String(smooth(0, 0.5, p))
      element.style.translate = `${block.dx.toFixed(2)}px ${block.dy.toFixed(2)}px`
      element.style.willChange = moving ? 'opacity, translate' : ''
    }
    const first = card ? 0.3 : 0, step = card ? 0.04 : 0.08, most = card ? 0.16 : 0.32, span = card ? 0.4 : 0.55
    block.parts.forEach((part, k) => {
      const start = first + Math.min(k * step, most)
      const v = smooth(start, start + span, p)
      const rise = (1 - v) * RISE
      part.style.opacity = String(v)
      part.style.translate = `0 ${rise.toFixed(2)}px`
      part.style.willChange = v > 0 && v < 1 ? 'opacity, translate' : ''
      if (part === element) block.dy = rise
    })
  }

  // Reads every block's place (without its own offset), then advances and draws each one, so no
  // layout read follows a write within a frame.
  function tick(now) {
    frame = 0
    if (cancelled) return
    const dt = last ? Math.min(0.25, (now - last) / 1000) : 1 / 60 // real time, so a slow device still takes about a second
    last = now
    const height = window.innerHeight, end = atEnd()
    let turn = 0, moving = false
    for (const block of blocks) {
      const rect = block.element.getBoundingClientRect()
      const goal = wanted(rect.top - block.dy, rect.bottom - block.dy, height, end)
      if (goal === block.goal) continue
      block.goal = goal
      if (block.t <= 0 || block.t >= TIME) block.slide = slideOf(block, rect, height)
      if (goal && block.t <= 0) block.t = -Math.min(turn++ * LAG, MAX_LAG)
    }
    for (const block of blocks) {
      const t = block.goal ? Math.min(TIME, block.t + dt) : Math.max(0, block.t - dt * OUT)
      if (t !== block.t) { block.t = t; moving = true }
      draw(block)
    }
    if (moving) frame = requestAnimationFrame(tick)
    else last = 0
  }
  const wake = () => { if (!frame && !cancelled) frame = requestAnimationFrame(tick) }

  // Start where the page is: blocks in view are in place, the rest wait, with no animation.
  const height = window.innerHeight, end = atEnd()
  for (const block of blocks) {
    const rect = block.element.getBoundingClientRect()
    block.goal = wanted(rect.top, rect.bottom, height, end)
    block.t = block.goal ? TIME : 0
    block.slide = slideOf(block, rect, height)
    draw(block)
  }

  window.addEventListener('scroll', wake, { passive: true })
  window.addEventListener('resize', wake)
  ScrollTrigger.addEventListener('refresh', wake)

  return () => {
    cancelled = true
    if (frame) cancelAnimationFrame(frame)
    window.removeEventListener('scroll', wake)
    window.removeEventListener('resize', wake)
    ScrollTrigger.removeEventListener('refresh', wake)
    for (const block of blocks) {
      if (!block.parts) block.parts = partsOf(block)
      clear(block)
      block.element.removeAttribute('data-arrival')
    }
  }
}
