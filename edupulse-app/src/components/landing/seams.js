import { ScrollTrigger } from './motion'

// Section arrivals. Every block of an arriving section settles in as it comes up the screen,
// so the transition ends in the section's own content rather than beside it:
//   - a card (a block with a surface) is built where it will stand: faceted pieces in the
//     section's materials travel in from the section's side, a blue frame locks onto the card's
//     corners, the pieces assemble edge to edge into the card's exact outline, cool from metal,
//     glass or circuit board into the card's own surface, and dissolve as the card fades in
//     under them (scene/seamScene.js); then its icons and text rise into place one by one;
//   - a text block (a heading, a list without a surface) rises into place line by line.
// Each block follows its own position on screen through a short damping, so a block that is
// half way in stays half way in, scrolling back plays it backwards, and blocks side by side
// cascade. Nothing is hidden by CSS: the caller runs this only without reduced motion, and the
// inline opacity and transform written here are removed once a block has settled. Without WebGL
// the cards still settle, rising instead of being built. Pinned stages, the sign-in form and the
// photographs keep their own entrances.
export const SEAMS = [
  {
    id: 'problem', from: 'below', cut: 'tri', finishes: ['glass', 'anodized'], roll: 0.12, dolly: 2.4, pan: 0.4,
    blocks: [
      { sel: '.why-head', kind: 'text' },
      { sel: '.why-switch', kind: 'text', self: true },
      { sel: '.why-card', kind: 'card', parts: '.why-icon, .why-area, .why-text, .why-state' },
      { sel: '.why-note', kind: 'text', self: true },
    ],
  },
  {
    id: 'features', from: 'right', cut: 'slat', finishes: ['aluminium', 'anodized'], roll: -0.1, dolly: 2, pan: -0.5,
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.fs-copy', kind: 'text', parts: '.fs-count, .fs-steps, .fs-chapters' },
      { sel: '.fs-frame', kind: 'card', fixed: true, parts: '.fs-bar, .fs-caption' },
    ],
  },
  {
    id: 'flow', from: 'left', cut: 'grid', finishes: ['circuit', 'aluminium'], roll: 0.1, dolly: 1.6, pan: 0.5,
    blocks: [
      { sel: '.flow-head', kind: 'text' },
      { sel: '.flow-card', kind: 'card' },
    ],
  },
  {
    id: 'roles', from: 'centre', cut: 'fan', finishes: ['anodized', 'glass'], roll: -0.14, dolly: 3, pan: 0,
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.role-tabs', kind: 'card', parts: '.role-tab' },
      { sel: '.role-panels', kind: 'card', parts: '.role-panel.is-active > *' },
    ],
  },
  {
    id: 'ai', from: 'spiral', cut: 'tri', finishes: ['circuit', 'glass'], roll: 0.16, dolly: 2.2, pan: 0.2,
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.promises li', kind: 'text' },
    ],
  },
  { id: 'agents', blocks: [{ sel: '.agents-head', kind: 'text' }] },
  {
    id: 'workspace', from: 'centre', cut: 'grid', finishes: ['aluminium', 'ceramic'], roll: 0.1, dolly: 3.2, pan: 0,
    blocks: [
      { sel: '.ws-head', kind: 'text' },
      { sel: '.ws-stage', kind: 'card', fixed: true, parts: false },
    ],
  },
  {
    id: 'impact', from: 'below', cut: 'fan', finishes: ['anodized', 'glass'], roll: -0.12, dolly: 2.4, pan: -0.3,
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.evidence-item', kind: 'card' },
      { sel: '.goals', kind: 'card', parts: '.goals h3, .goals li' },
    ],
  },
  {
    id: 'colleges', from: 'line', cut: 'slat', finishes: ['glass', 'aluminium'], roll: 0.08, dolly: 1.4, pan: 0.6,
    blocks: [
      { sel: '.lp-head', kind: 'text' },
      { sel: '.college-card', kind: 'card' },
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

// A block starts when its centre reaches START of the viewport's height (it is half in view)
// and has settled when its centre reaches START - SPAN, so it is built where the reader can see
// it. Blocks side by side start one after another (LAG per sibling). At the end of the page
// every block has settled.
const START = 1, SPAN = 0.42, LAG = 0.07, MAX_LAG = 0.28
const DAMPING = 0.14 // seconds: how quickly a block catches up with the scroll
const RISE = 16 // px a part rises from

const clamp01 = value => Math.min(1, Math.max(0, value))
const smooth = (edge0, edge1, value) => { const t = clamp01((value - edge0) / (edge1 - edge0)); return t * t * (3 - 2 * t) }

// The first surface in a block (its own background, or that of a child), for the pieces to cool into.
function surfaceOf(element) {
  for (const node of [element, ...element.children, ...[...element.children].flatMap(child => [...child.children])]) {
    const colour = getComputedStyle(node).backgroundColor
    if (colour && colour !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(colour)) return colour
  }
  return 'rgb(255, 255, 255)'
}

const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
function goalOf(block, rect, height, end) {
  if (end && rect.top < height) return 1
  const centre = rect.top + Math.min(rect.height, height) / 2
  const raw = (height * START - centre) / (height * SPAN)
  return clamp01((raw - block.lag) / (1 - block.lag))
}

export function setupSeams(page, canvas) {
  let scene = null, cancelled = false, frame = 0, last = 0
  const blocks = []
  for (const seam of SEAMS) {
    const section = page.querySelector(`#${seam.id}`)
    if (!section) continue
    for (const spec of seam.blocks) {
      [...section.querySelectorAll(spec.sel)].forEach((element, i) => {
        if (element.closest('[data-seam-block]')) return // a block inside another block settles with it
        element.setAttribute('data-seam-block', spec.kind)
        blocks.push({ seam, spec, element, lag: Math.min(i * LAG, MAX_LAG), p: 0, goal: 0, drawn: -1, parts: null, surface: null, rect: null })
      })
    }
  }

  const partsOf = block => {
    const { self, parts } = block.spec
    if (self) return [block.element]
    if (parts === false) return []
    if (parts) return [...block.element.querySelectorAll(parts)]
    return [...block.element.children].filter(child => !child.matches('[data-split], .sr-only'))
  }

  // Removes only what draw() wrote: a fixed card's transform belongs to its own component.
  function clear(block) {
    const { kind, fixed } = block.spec
    if (kind === 'card') {
      block.element.style.opacity = ''
      if (!fixed) block.element.style.transform = ''
    }
    for (const part of block.parts || []) {
      part.style.opacity = ''
      part.style.transform = ''
      part.style.willChange = ''
    }
    block.parts = null
  }

  // The block's styles for its progress p (0 waiting, 1 settled).
  function draw(block) {
    const { p, spec } = block
    if (p === block.drawn) return
    block.drawn = p
    if (p >= 1) { clear(block); block.element.removeAttribute('data-settling'); return }
    block.element.toggleAttribute('data-settling', p > 0)
    if (!block.parts) block.parts = partsOf(block)
    const built = spec.kind === 'card' && scene
    if (spec.kind === 'card') {
      // With pieces the card appears under them as they dissolve, in place (the pieces are fitted
      // to where it stands, so it must not move); without them it rises into place.
      const shown = built ? smooth(0.62, 0.82, p) : smooth(0.1, 0.55, p)
      block.element.style.opacity = String(shown)
      if (!spec.fixed) block.element.style.transform = built ? '' : `translate3d(0, ${((1 - shown) * RISE * 1.5).toFixed(2)}px, 0)`
    }
    const first = spec.kind !== 'card' ? 0.12 : built ? 0.7 : 0.35
    const step = spec.kind !== 'card' ? 0.08 : 0.035
    const span = spec.kind !== 'card' ? 0.4 : 0.2
    block.parts.forEach((part, k) => {
      const start = first + Math.min(k * step, spec.kind !== 'card' ? 0.32 : 0.12)
      const v = smooth(start, start + span, p)
      part.style.opacity = String(v)
      part.style.transform = `translate3d(0, ${((1 - v) * RISE).toFixed(2)}px, 0)`
      part.style.willChange = v > 0 && v < 1 ? 'opacity, transform' : ''
    })
  }

  // Reads every block's place, then catches each block up with it, then draws (no layout
  // read follows a write within a frame).
  function tick(now) {
    frame = 0
    if (cancelled) return
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    const height = window.innerHeight, end = atEnd()
    for (const block of blocks) {
      block.rect = block.element.getBoundingClientRect()
      block.goal = goalOf(block, block.rect, height, end)
    }
    const rate = 1 - Math.exp(-dt / DAMPING)
    let moving = false
    const building = []
    for (const block of blocks) {
      if (block.p !== block.goal) {
        block.p += (block.goal - block.p) * rate
        if (Math.abs(block.goal - block.p) < 0.002) block.p = block.goal
        moving = true
      }
      draw(block)
      if (scene && block.spec.kind === 'card' && block.p > 0 && block.p < 1 && block.rect.bottom > 0 && block.rect.top < height) {
        block.surface ||= surfaceOf(block.element)
        building.push(block)
      }
    }
    scene?.render(building)
    if (moving) frame = requestAnimationFrame(tick)
    else last = 0
  }
  const wake = () => { if (!frame && !cancelled) frame = requestAnimationFrame(tick) }

  // Start where the page is: blocks already passed are settled, the rest wait, with no animation.
  const height = window.innerHeight, end = atEnd()
  for (const block of blocks) {
    block.p = block.goal = goalOf(block, block.element.getBoundingClientRect(), height, end)
    draw(block)
  }

  window.addEventListener('scroll', wake, { passive: true })
  window.addEventListener('resize', wake)
  ScrollTrigger.addEventListener('refresh', wake)

  // The pieces load in their own chunk (three.js), after the page has settled.
  if (canvas) {
    import('./scene/seamScene.js').then(({ createSeamScene }) => {
      if (cancelled) return
      scene = createSeamScene({ canvas })
      wake()
    }).catch(() => undefined)
  }

  return () => {
    cancelled = true
    if (frame) cancelAnimationFrame(frame)
    window.removeEventListener('scroll', wake)
    window.removeEventListener('resize', wake)
    ScrollTrigger.removeEventListener('refresh', wake)
    for (const block of blocks) {
      if (!block.parts) block.parts = partsOf(block)
      clear(block)
      block.element.removeAttribute('data-seam-block')
      block.element.removeAttribute('data-settling')
    }
    scene?.dispose()
  }
}
