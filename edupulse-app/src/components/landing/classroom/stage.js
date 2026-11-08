import { ScrollTrigger } from '../motion'
import { OPENING_TRIGGER, setJumper } from '../navigation'
import { rectIn } from './mode'
import { openingEnd } from './scope'
import { whenSettled } from '../settle'
import { ROOM_ORDER, ROOMS, MEASURE, FLIGHTS, LITE_LAYOUT } from './plan'

// The walk through the school. The page keeps its normal scroll: nothing intercepts the wheel, touch
// or keyboard. The scroll position only says how far along the walk the visitor is, and a damped copy
// of it (the "speed dial") drives the camera and every sheet in the same frame, so they cannot drift.
//
//   room hold   the camera rests square on the surface and the sheet is plain HTML at its own size;
//   flight      the camera moves on, and the sheet stays laid on its surface through a matrix.
//
// Each section stays in the document, in order, for keyboards and screen readers. Only its height
// (how long it holds plus how far the flight is) is set here.
const DAMPING = 7.5 // how quickly the walk catches up with the scroll
const LONGEST_LAG = 4.5 // viewports: the walk never trails further behind than this
const TRANSIT = 1.15 // viewports of scrolling per flight
const OUT_OF_SIGHT = 'translate3d(0, 60000px, 0)'
const POPS = {
  problem: '.why-head, .why-switch, .why-card, .why-note',
  features: '.fs-board .lp-head, .fs-count, .fs-steps, .fs-chapters, .fs-frame',
  flow: '.flow-head, .flow-phase',
  roles: '.lp-head, .role-tab, .role-panels',
  ai: '.pulse-copy .lp-head, .promises li, .pulse-demo',
  impact: '.lp-head, .evidence-item, .goals',
  colleges: '.lp-head, .cit-feature, .college-card',
  campus: '.lp-head, .photo-track li:not(.is-copy), .photo-rail-bar',
  faq: '.lp-head, .faq-item',
  login: '.signin-visual, .signin-form',
}
const POP_FRAMES = [{ opacity: 0, scale: 0.72, translate: '0 22px' }, { opacity: 1, scale: 1, translate: '0 0' }]
const POP_TIME = { duration: 560, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' }

// Night follows the app's dark mode, a class on the root element.
const isNight = () => document.documentElement.classList.contains('dark-mode')
function watchNight(apply) {
  apply(isNight())
  const watcher = new MutationObserver(() => apply(isNight()))
  watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => watcher.disconnect()
}

// The school is built once the page has settled (settle.js), never in the middle of the opening's entrance.
const whenIdle = start => whenSettled(start)

// The school's own time: stopped by the speed dial's pause control, so robots, plants and clouds hold
// still while the camera still follows the scroll.
function schoolClock() {
  let paused = false, stoppedAt = 0, lost = 0, now = 0
  const onChange = event => {
    if (event.detail === paused) return
    paused = event.detail
    if (paused) stoppedAt = now - lost
    else lost = now - stoppedAt
  }
  document.addEventListener('classroom:pause', onChange)
  return { read: time => { now = time; return paused ? stoppedAt : time - lost }, stop: () => document.removeEventListener('classroom:pause', onChange) }
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// Phones, portrait and small screens: the sections scroll as ordinary content with the school behind
// them. The camera holds on a section's room while it is read and flies on through the gaps between
// sections. Nothing is laid on a surface, so text and the on-screen keyboard behave as usual.
export function createLiteStage({ root, canvas, buildingUrl, onFail }) {
  const rooms = ROOM_ORDER.map(key => ({ key, section: root.querySelector(`[data-room="${key}"]`) })).filter(room => room.section)
  let world = null, disposed = false, frame = 0, last = 0, walked = window.scrollY, lastY = walked, segments = [], width = 0, height = 0
  const clock = schoolClock()

  function locate() {
    const H = window.innerHeight, scroll = window.scrollY
    const top = element => element.getBoundingClientRect().top + scroll
    const opening = ScrollTrigger.getById(OPENING_TRIGGER)
    const heroEnd = opening ? opening.end : 0
    const agents = root.querySelector('#agents'), workspace = root.querySelector('#workspace')
    const spots = rooms.map(room => ({ key: room.key, a: top(room.section) - H * 0.4, b: top(room.section) + room.section.offsetHeight - H * 0.5 }))
    const list = [{ kind: 'hero', a: -Infinity, b: heroEnd }, { kind: 'flight', key: 'hero>problem', a: heroEnd, b: spots[0].a }]
    spots.forEach((spot, i) => {
      const next = spots[i + 1]
      list.push({ kind: 'hold', key: spot.key, a: spot.a, b: next ? spot.b : Infinity })
      if (!next) return
      if (spot.key === 'ai' && agents && workspace) {
        const end = top(workspace) + workspace.offsetHeight - H
        const pin = ScrollTrigger.getById('lp-agents'), pinned = pin ? pin.start : top(agents)
        // The camera ends on the clock; the scope opens over it; then the scope covers the school.
        list.push({ kind: 'flight', key: 'ai>agents', a: spot.b, b: pinned })
        list.push({ kind: 'scope', a: pinned, b: openingEnd(pin, pinned) })
        list.push({ kind: 'opaque', a: openingEnd(pin, pinned), b: end })
        list.push({ kind: 'flight', key: 'workspace>impact', a: end, b: next.a })
      } else list.push({ kind: 'flight', key: `${spot.key}>${next.key}`, a: spot.b, b: next.a })
    })
    segments = list
  }
  // Only a real change of size counts: a phone's address bar sliding away is not one.
  function fit() {
    const W = document.documentElement.clientWidth, H = window.innerHeight
    if (world && (W !== width || Math.abs(H - height) > 140)) { width = W; height = H; world.resize(W, H) }
    locate()
  }
  const stateAt = y => {
    for (const s of segments) {
      if (y < s.a || y >= s.b) continue
      if (s.kind === 'flight') return { kind: 'flight', key: s.key, t: Math.min(1, Math.max(0, (y - s.a) / Math.max(1, s.b - s.a))) }
      if (s.kind === 'scope') return { kind: 'flight', key: 'ai>agents', t: 1, scope: true }
      return s.kind === 'hold' ? { kind: 'hold', key: s.key, pan: 0 } : { kind: s.kind }
    }
    return { kind: 'hero' }
  }
  function tick(now) {
    frame = requestAnimationFrame(tick)
    if (!world) return
    const time = now / 1000
    const dt = Math.min(0.1, last ? time - last : 1 / 60)
    last = time
    const y = window.scrollY
    // A jump (a link to a section, the End key) is a cut, as on the walk.
    if (Math.abs(y - lastY) > window.innerHeight * 3) walked = y
    lastY = y
    walked += (y - walked) * (1 - Math.exp(-dt * DAMPING))
    if (Math.abs(y - walked) < 0.2) walked = y
    const state = stateAt(walked)
    world.pose(state)
    root.classList.toggle('is-scope-aligned', Boolean(state.scope) || state.kind === 'opaque')
    world.frame(clock.read(time))
  }
  let timer = 0
  const fitSoon = () => { clearTimeout(timer); timer = setTimeout(fit, 120) }
  const sizes = new ResizeObserver(fitSoon)
  sizes.observe(root)
  window.addEventListener('resize', fitSoon)
  ScrollTrigger.addEventListener('refresh', locate)
  const onRole = event => world?.setRole(event.detail)
  document.addEventListener('classroom:role', onRole)
  const stopWorld = () => {
    cancelAnimationFrame(frame)
    world?.dispose()
    world = null
    canvas.style.display = 'none'
  }
  locate()
  frame = requestAnimationFrame(tick)
  let stopNight = null
  const cancelStart = whenIdle(() => import('./world.js').then(({ createWorld }) => {
    if (disposed) return
    world = createWorld({ canvas, buildingUrl, compact: true, onLost: stopWorld, onSlow: stopWorld })
    if (!world) { onFail?.(); return }
    stopNight = watchNight(night => world?.setNight(night))
    const { W, H, rooms: layout } = LITE_LAYOUT
    for (const room of rooms) if (layout[room.key]) world.measure(room.key, { W, H, items: {}, ...layout[room.key], panMax: 0 })
    width = document.documentElement.clientWidth
    height = window.innerHeight
    world.resize(width, height)
    world.whenReady.then(() => { if (!disposed) canvas.classList.add('is-ready') })
  }).catch(() => onFail?.()))

  return () => {
    disposed = true
    cancelStart()
    stopNight?.()
    cancelAnimationFrame(frame)
    clearTimeout(timer)
    sizes.disconnect()
    window.removeEventListener('resize', fitSoon)
    ScrollTrigger.removeEventListener('refresh', locate)
    document.removeEventListener('classroom:role', onRole)
    clock.stop()
    world?.dispose()
    world = null
  }
}

export function createStage({ root, canvas, wash, buildingUrl, onFail }) {
  const rooms = ROOM_ORDER.map(key => {
    const section = root.querySelector(`[data-room="${key}"]`)
    if (!section) return null
    const view = section.querySelector('.room-view')
    const pops = [...section.querySelectorAll(POPS[key])]
    pops.forEach(element => element.classList.add('pop'))
    view.setAttribute('data-waiting', '')
    return { key, section, view, pops, y: 0, hold: 0, panMax: 0, height: 0, transform: '', opacity: -1, arrived: false, parked: false, pointer: null, pan: -1 }
  }).filter(Boolean)
  const byKey = Object.fromEntries(rooms.map(room => [room.key, room]))

  let world = null, disposed = false, frame = 0, last = 0, walked = window.scrollY, lastY = walked, segments = []
  const marks = { agents: 0, open: 0, wsEnd: 0, H: window.innerHeight }
  const clock = schoolClock()

  // ─── Layout ───
  function measure() {
    const W = document.documentElement.clientWidth, H = window.innerHeight
    marks.H = H
    let changed = false
    rooms.forEach((room, i) => {
      const contentH = room.view.offsetHeight
      room.panMax = Math.max(0, contentH - H)
      const share = Number(room.section.dataset.hold || 0.36)
      room.hold = room.panMax > 0 ? Math.round(room.panMax + H * 0.18) : Math.round(H * share)
      const lastRoom = i === rooms.length - 1
      // The last room stays on the screen until the footer rises over it.
      const flight = lastRoom ? H : H * TRANSIT
      const height = Math.round(room.hold + flight)
      room.section.dataset.hold = String(share)
      room.section.dataset.holdPx = String(room.hold)
      if (Math.abs(height - room.height) > 0.5) {
        room.height = height
        room.section.style.height = `${height}px`
        changed = true
      }
    })
    if (world) {
      world.resize(W, H)
      for (const room of rooms) sendMeasurements(room, W, H)
    }
    return changed
  }
  function sendMeasurements(room, W, H) {
    const plan = ROOMS[room.key]
    const anchorElement = room.view.querySelector(plan.anchor)
    if (!anchorElement) return
    const items = {}
    for (const [name, selector] of Object.entries(MEASURE[room.key] || {})) items[name] = [...room.view.querySelectorAll(selector)].map(element => rectIn(element, room.view))
    world.measure(room.key, { W, H, anchor: rectIn(anchorElement, room.view), items, panMax: room.panMax })
  }
  function locate() {
    const H = window.innerHeight, scroll = window.scrollY
    rooms.forEach(room => { room.y = room.section.getBoundingClientRect().top + scroll })
    const opening = ScrollTrigger.getById(OPENING_TRIGGER)
    const heroEnd = opening ? opening.end : 0
    const agents = ScrollTrigger.getById('lp-agents')
    marks.agents = agents ? agents.start : (root.querySelector('#agents')?.getBoundingClientRect().top ?? 0) + scroll
    marks.open = openingEnd(agents, marks.agents)
    marks.wsEnd = byKey.impact ? byKey.impact.y - H : marks.agents
    marks.H = H
    const list = [{ kind: 'hero', a: -Infinity, b: heroEnd }, { kind: 'flight', key: 'hero>problem', a: heroEnd, b: rooms[0].y }]
    rooms.forEach((room, i) => {
      const next = rooms[i + 1], end = room.y + room.hold
      list.push({ kind: 'hold', key: room.key, a: room.y, b: next ? end : Infinity })
      if (!next) return
      if (room.key === 'ai') {
        // The camera ends on the clock, the scope opens over it, then the scope covers the school.
        list.push({ kind: 'flight', key: 'ai>agents', a: end, b: marks.agents })
        list.push({ kind: 'scope', a: marks.agents, b: marks.open })
        list.push({ kind: 'opaque', a: marks.open, b: marks.wsEnd })
        list.push({ kind: 'flight', key: 'workspace>impact', a: marks.wsEnd, b: next.y })
      } else list.push({ kind: 'flight', key: `${room.key}>${next.key}`, a: end, b: next.y })
    })
    segments = list
  }
  function relayout() {
    const changed = measure()
    if (changed) ScrollTrigger.refresh()
    else locate()
  }
  let relayoutTimer = 0
  const relayoutSoon = () => { clearTimeout(relayoutTimer); relayoutTimer = setTimeout(relayout, 90) }
  const sizes = new ResizeObserver(relayoutSoon)
  rooms.forEach(room => sizes.observe(room.view))
  window.addEventListener('resize', relayoutSoon)
  ScrollTrigger.addEventListener('refresh', locate)

  const stateAt = y => {
    for (const s of segments) {
      if (y < s.a || y >= s.b) continue
      if (s.kind === 'hold') {
        const room = byKey[s.key]
        return { kind: 'hold', key: s.key, pan: Math.min(room.panMax, Math.max(0, y - s.a)) }
      }
      if (s.kind === 'flight') return { kind: 'flight', key: s.key, t: Math.min(1, Math.max(0, (y - s.a) / Math.max(1, s.b - s.a))) }
      // While the scope opens the camera holds on the clock it draws over.
      if (s.kind === 'scope') return { kind: 'flight', key: 'ai>agents', t: 1, scope: true }
      return { kind: s.kind }
    }
    return { kind: 'hero' }
  }

  // ─── Sheets ───
  function arrive(room) {
    if (room.arrived) return
    room.arrived = true
    room.view.removeAttribute('data-waiting')
    room.pops.forEach((element, i) => element.animate(POP_FRAMES, { ...POP_TIME, delay: 60 + Math.min(i * 60, 480) }))
  }
  function setSheet(room, transform, opacity, interactive) {
    if (transform !== room.transform) { room.transform = transform; room.view.style.transform = transform }
    if (opacity !== room.opacity) { room.opacity = opacity; room.view.style.opacity = String(opacity) }
    if (interactive !== room.pointer) { room.pointer = interactive; room.view.style.pointerEvents = interactive ? 'auto' : 'none' }
    if (opacity > 0.02) arrive(room)
    else if (room.arrived) { room.arrived = false; room.view.setAttribute('data-waiting', '') }
  }
  const round = value => { const dpr = window.devicePixelRatio || 1; return Math.round(value * dpr) / dpr }
  function setPan(room, pan) {
    if (pan === room.pan) return
    room.pan = pan
    room.view.style.setProperty('--pan', `${round(pan)}px`)
  }

  function place(state) {
    const hold = state.kind === 'hold' ? state.key : null
    let from = null, to = null, flight = null
    if (state.kind === 'flight') {
      flight = FLIGHTS[state.key]
      const parts = state.key.split('>')
      from = byKey[parts[0]] || null
      to = byKey[parts[1]] || null
    }
    for (const room of rooms) {
      if (room.key === hold) {
        setPan(room, state.pan)
        setSheet(room, `translate3d(0, ${-round(state.pan)}px, 0)`, 1, true)
      } else if (room === from || room === to) {
        const pan = room === from ? room.panMax : 0
        setPan(room, pan)
        const opacity = room === from
          ? 1 - (flight.leave ? smooth(flight.leave[0], flight.leave[1], state.t) : 1)
          : (flight.enter ? smooth(flight.enter[0], flight.enter[1], state.t) : 0)
        const matrix = world && opacity > 0.001 ? world.sheetTransform(room.key, document.documentElement.clientWidth, room.view.offsetHeight) : null
        setSheet(room, matrix || OUT_OF_SIGHT, matrix || !world ? opacity : 0, false)
      } else setSheet(room, OUT_OF_SIGHT, 0, false)
    }
  }

  // A soft flash of light where the camera passes through a doorway; nothing else covers the school.
  function washAt(state) {
    if (state.kind !== 'flight') return 0
    const flash = FLIGHTS[state.key]?.flash
    if (!flash) return 0
    const d = (state.t - flash[0]) / 0.1
    return flash[1] * Math.exp(-d * d)
  }

  function tick(now) {
    frame = requestAnimationFrame(tick)
    const time = now / 1000
    const dt = Math.min(0.1, last ? time - last : 1 / 60)
    last = time
    const y = window.scrollY, H = marks.H
    // A jump (a link to a section, the End key) is a cut, not a blur through every room on the way.
    if (Math.abs(y - lastY) > H * 3) walked = y
    lastY = y
    walked += (y - walked) * (1 - Math.exp(-dt * DAMPING))
    if (Math.abs(y - walked) < 0.2) walked = y
    if (Math.abs(y - walked) > H * LONGEST_LAG) walked = y - Math.sign(y - walked) * H * LONGEST_LAG
    const state = stateAt(walked)
    world?.pose(state)
    place(state)
    const light = washAt(state)
    if (!cutting) wash.style.opacity = light > 0.002 ? light.toFixed(3) : '0'
    root.classList.toggle('is-scope-aligned', Boolean(state.scope) || state.kind === 'opaque')
    root.classList.toggle('is-past-workspace', walked > marks.wsEnd)
    world?.frame(clock.read(time))
  }

  // ─── Jumps ───
  // A long jump through the menu or the speed dial is a soft cut through white rather than a blur
  // through every room on the way.
  let jumping = null, cutting = false
  const jump = (y, done) => {
    clearTimeout(jumping)
    cutting = true
    wash.style.transition = 'opacity 240ms ease'
    wash.style.opacity = '1'
    jumping = setTimeout(() => {
      window.scrollTo(0, y)
      walked = lastY = y
      wash.style.transition = 'opacity 420ms ease'
      cutting = false
      done?.()
      jumping = setTimeout(() => { wash.style.transition = '' }, 460)
    }, 250)
  }
  setJumper(jump)

  // ─── Keyboard: focus moving into a sheet brings that sheet to the screen ───
  const onFocus = event => {
    const target = event.target
    if (!(target instanceof Element) || !target.matches(':focus-visible')) return
    const room = rooms.find(r => r.view.contains(target))
    if (!room) return
    const box = rectIn(target, room.view), H = marks.H
    const wanted = Math.min(room.panMax, Math.max(0, box.y - H * 0.4))
    const state = stateAt(window.scrollY)
    const here = state.kind === 'hold' && state.key === room.key
    if (here && box.y - state.pan > 90 && box.y + box.h - state.pan < H - 20) return
    window.scrollTo(0, Math.round(room.y + wanted + 1))
  }
  document.addEventListener('focusin', onFocus)

  const onRole = event => world?.setRole(event.detail)
  document.addEventListener('classroom:role', onRole)

  // ─── Start ───
  root.classList.add('is-staged')
  measure()
  ScrollTrigger.refresh()
  locate()
  frame = requestAnimationFrame(tick)
  document.fonts?.ready.then(() => { if (!disposed) relayout() })

  let stopNight = null
  const cancelStart = whenIdle(() => import('./world.js').then(({ createWorld }) => {
    if (disposed) return
    world = createWorld({ canvas, buildingUrl, onLost: () => onFail?.() })
    if (!world) { onFail?.(); return }
    stopNight = watchNight(night => world?.setNight(night))
    relayout()
    world.whenReady.then(() => { if (!disposed) canvas.classList.add('is-ready') })
  }).catch(() => onFail?.()))

  return () => {
    disposed = true
    cancelStart()
    stopNight?.()
    cancelAnimationFrame(frame)
    clearTimeout(relayoutTimer)
    clearTimeout(jumping)
    sizes.disconnect()
    setJumper(null)
    window.removeEventListener('resize', relayoutSoon)
    ScrollTrigger.removeEventListener('refresh', locate)
    document.removeEventListener('focusin', onFocus)
    document.removeEventListener('classroom:role', onRole)
    clock.stop()
    root.classList.remove('is-staged', 'is-past-workspace', 'is-scope-aligned')
    for (const room of rooms) {
      room.section.style.height = ''
      room.view.style.transform = ''
      room.view.style.opacity = ''
      room.view.style.pointerEvents = ''
      room.view.removeAttribute('data-waiting')
      room.pops.forEach(element => element.classList.remove('pop'))
    }
    world?.dispose()
    world = null
  }
}
