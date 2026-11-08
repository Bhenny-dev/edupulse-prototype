import * as THREE from 'three'
import { createKit } from '../../landing/classroom/kit'
import { createRobots } from '../../landing/classroom/robot'
import { createCats } from './cat'
import { buildTheme } from './themes'

const FOV = 30
const VIEW = { az: 0.71, el: 0.42 } // the overview angles (radians), as in the agent workspace
const HOME = new THREE.Vector3(0, 1.25, -0.4) // the room's framing centre
// How to look at a prop on a wall when zooming in: square on, a little from below.
const FACES = { back: { az: 0, el: 0.08 }, side: { az: Math.PI / 2, el: 0.08 } }
const CORNERS = [[-6.2, 0, -4.7], [6.2, 0, -4.7], [-6.2, 0, 4.7], [6.2, 0, 4.7], [-6.2, 4.3, -4.7], [6.2, 4.3, -4.7], [-6.2, 4.3, 4.7]].map(([x, y, z]) => new THREE.Vector3(x, y, z))
const FLOOR = { x: [-5.6, 5.6], z: [-4.0, 4.2] }
const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2))

// A themed classroom seen as a cut-away diorama, like the agent workspace: a floor, two walls with
// windows, the theme's props and their animations, robots and a cat or two.
// - The camera orbits the room like the workspace's: a drag turns it, the wheel or a pinch zooms,
//   the mouse sways it a little.
// - Props the theme names can be picked; picking one glides the camera in close, square on to a
//   picture on a wall, and the page shows what it stands for beside it (`setInset` keeps the prop
//   in the part of the screen the page leaves free).
// - The cats can be petted, carried and annoyed (cat.js).
// - In the game room the robot walks to a cabinet, the camera looks over its shoulder at the
//   screen, and it presses the cabinet's buttons (`play`, `press`, `leave`). The page lays its game
//   over the screen (`setScreen`), fitted to the screen's corners.
// DOM labels (one per pick key, passed in `labels`) follow their props and are the accessible way to
// pick. Returns null without WebGL.
export function createThemedRoom({ canvas, theme, images, labels = {}, onPick, onHover, onReady, compact = false, still: startStill = false }) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  if (!renderer.getContext()) { renderer.dispose(); return null }
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 0.98
  renderer.shadowMap.enabled = !compact
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 120)
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0xd6bd9a, 0.62)
  const fill = new THREE.AmbientLight(0xf2f5ff, 1.6)
  const sun = new THREE.DirectionalLight(0xffe6c4, 3)
  sun.position.set(-5, 12, 9)
  sun.castShadow = !compact
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 34 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 3
  const lamp = new THREE.PointLight(0xffc98a, 0, 16, 1.4)
  lamp.position.set(0.5, 3.6, 0.8)
  scene.add(hemi, fill, sun, lamp)

  const kit = createKit()
  const { robot } = createRobots(kit)
  const { cat } = createCats(kit)
  const ticks = [], picks = new Map(), cats = []
  const room = new THREE.Group()
  scene.add(room)
  const built = buildTheme(theme, {
    THREE, kit, room, robot, images,
    cat: (parent, options) => { const made = cat(parent, { bounds: FLOOR, ...options }); cats.push(made); return made },
    tick: fn => ticks.push(fn),
    pick: (key, group, lift = 1.6, { face } = {}) => { group.userData.live = true; picks.set(key, { group, lift, face }); return group },
  })
  kit.bake(room)
  const arcade = built.arcade || null

  // ─── Camera: an orbit around a target, gliding between the room and a prop ───
  const cam = { az: VIEW.az, el: VIEW.el, dist: 20, target: HOME.clone() }
  const goal = { az: VIEW.az, el: VIEW.el, dist: 20, target: HOME.clone() }
  const orbit = { az: 0, el: 0 }, sway = { x: 0, y: 0, tx: 0, ty: 0 }
  const inset = { left: 0, bottom: 0 }, shift = { x: 0, y: 0 }
  const size = { w: 1, h: 1 }
  const v = new THREE.Vector3()
  let fit = 20, zoom = 1, selected = null, hovered = null
  const placeCamera = (target, az, el, dist) => {
    const ce = Math.cos(el)
    camera.position.set(target.x + dist * Math.sin(az) * ce, target.y + dist * Math.sin(el), target.z + dist * Math.cos(az) * ce)
    camera.lookAt(target)
    camera.updateMatrixWorld()
  }
  function layout() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight)
    size.w = w
    size.h = h
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.75))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.clearViewOffset()
    camera.updateProjectionMatrix()
    // The overview distance: the whole room in view, whatever the shape of the screen.
    let distance = 24
    for (let i = 0; i < 6; i++) {
      placeCamera(HOME, VIEW.az, VIEW.el, distance)
      let reach = 0
      for (const corner of CORNERS) { v.copy(corner).project(camera); reach = Math.max(reach, Math.abs(v.x), Math.abs(v.y)) }
      distance *= reach / 0.96
    }
    fit = distance
    aimAt(selected, true)
    wake()
  }
  // The distance that fits a sphere into the part of the screen the page leaves free.
  const distanceFor = radius => {
    const freeW = Math.max(160, size.w - inset.left) / size.w, freeH = Math.max(160, size.h - inset.bottom) / size.h
    return clamp((radius * 1.22) / (TAN * Math.min(freeH, camera.aspect * freeW)), 1.3, fit)
  }
  const bounds = new THREE.Box3(), sphere = new THREE.Sphere()
  function aimAt(key, keepOrbit = false) {
    const p = key && picks.get(key)
    if (!keepOrbit) { orbit.az = orbit.el = 0; zoom = 1 }
    if (!p) {
      goal.target.copy(HOME)
      goal.az = VIEW.az
      goal.el = VIEW.el
      goal.dist = fit
      return
    }
    if (playing === key && arcade) { aimAtScreen(); return }
    bounds.setFromObject(p.group).getBoundingSphere(sphere)
    const face = FACES[p.face]
    goal.target.copy(sphere.center)
    goal.az = face ? face.az : VIEW.az
    goal.el = face ? face.el : 0.34
    goal.dist = distanceFor(clamp(sphere.radius, 0.32, 2.2))
  }
  function focus(key) {
    selected = key && picks.has(key) ? key : null
    aimAt(selected)
    wake()
  }
  // The page's panel covers the left (wide screens) or the bottom (phones); the prop moves into
  // the rest of the screen.
  function setInset({ left = 0, bottom = 0 } = {}) {
    inset.left = left
    inset.bottom = bottom
    aimAt(selected, true)
    wake()
  }

  // ─── Pointer: tap to pick or pet; drag to turn the room or carry a cat; wheel or pinch to zoom ───
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), level = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const castAt = (x, y) => {
    const box = canvas.getBoundingClientRect()
    ndc.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
  }
  const catAt = (x, y) => { castAt(x, y); return ray.intersectObjects(cats.map(c => c.api.hit), false)[0]?.object.userData.cat ?? null }
  const pickAt = (x, y) => {
    castAt(x, y)
    const hit = ray.intersectObjects([...picks.values()].map(p => p.group), true)[0]
    if (!hit) return null
    for (const [key, { group }] of picks) { let o = hit.object; while (o) { if (o === group) return key; o = o.parent } }
    return null
  }
  const floorAt = (x, y, height = 0) => {
    castAt(x, y)
    level.constant = -height
    const point = ray.ray.intersectPlane(level, new THREE.Vector3())
    if (!point) return null
    point.x = clamp(point.x, FLOOR.x[0], FLOOR.x[1])
    point.z = clamp(point.z, FLOOR.z[0], FLOOR.z[1])
    return point
  }
  const pointers = new Map()
  let press = null, pinch = null, pointerFloor = null, locked = false
  const setHover = key => { if (key !== hovered) { hovered = key; onHover?.(key === 'cat' ? null : key) } canvas.style.cursor = key ? 'pointer' : '' }
  const onDown = event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    canvas.setPointerCapture?.(event.pointerId)
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom }
      if (press?.cat?.busy) press.cat.drop()
      press = null
      return
    }
    const who = locked ? null : catAt(event.clientX, event.clientY)
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, cat: who, drag: false, az: orbit.az, el: orbit.el }
    if (event.pointerType !== 'mouse') pointerFloor = floorAt(event.clientX, event.clientY)
  }
  const onMove = event => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      if (!locked) zoom = clamp(pinch.zoom * pinch.d / (Math.hypot(a.x - b.x, a.y - b.y) || 1), 0.5, 1.35)
      wake()
      return
    }
    if (event.pointerType === 'mouse') {
      const box = canvas.getBoundingClientRect()
      sway.tx = clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1, 1)
      sway.ty = clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1, 1)
    }
    if (event.pointerType === 'mouse' || press) pointerFloor = floorAt(event.clientX, event.clientY)
    if (press && press.id === event.pointerId) {
      const dx = event.clientX - press.x, dy = event.clientY - press.y
      if (!press.drag && Math.hypot(dx, dy) > 7) {
        press.drag = true
        if (press.cat) { press.cat.grab(); canvas.style.cursor = 'grabbing' }
      }
      if (press.drag && press.cat) { const at = floorAt(event.clientX, event.clientY, 0.62); if (at) press.cat.carry(at) }
      else if (press.drag && !locked) {
        orbit.az = clamp(press.az - dx * 0.005, -0.85, 0.85)
        orbit.el = clamp(press.el + dy * 0.003, -0.24, 0.34)
      }
      wake()
      return
    }
    if (event.pointerType === 'mouse' && !locked) setHover(catAt(event.clientX, event.clientY) ? 'cat' : pickAt(event.clientX, event.clientY))
    wake()
  }
  const onUp = event => {
    pointers.delete(event.pointerId)
    if (pinch) { if (pointers.size < 2) pinch = null; press = null; return }
    const p = press
    press = null
    if (event.pointerType !== 'mouse') pointerFloor = null
    if (!p || p.id !== event.pointerId) return
    if (p.cat) {
      if (p.drag) p.cat.drop()
      else p.cat.tap(clock, floorAt(event.clientX, event.clientY))
      canvas.style.cursor = ''
      wake()
      return
    }
    if (p.drag || locked) return
    const key = pickAt(event.clientX, event.clientY)
    if (key) onPick?.(key)
  }
  const onLeave = () => {
    sway.tx = sway.ty = 0
    pointerFloor = null
    setHover(null)
    wake()
  }
  const onWheel = event => {
    if (locked) return
    event.preventDefault()
    zoom = clamp(zoom * Math.exp(event.deltaY * 0.0012), 0.5, 1.35)
    wake()
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  // ─── The game room: the robot walks to a cabinet and plays it ───
  let playing = null, walk = null, screenEl = null, settledAt = 0
  const bot = arcade?.player || null
  const screenCorners = [[-0.39, 0.31], [0.39, 0.31], [0.39, -0.31], [-0.39, -0.31]].map(([x, y]) => new THREE.Vector3(x, y, 0.016))
  function aimAtScreen() {
    const cabinet = arcade.cabinets[playing]
    cabinet.screen.getWorldPosition(goal.target)
    goal.target.y -= 0.2 // between the screen and the buttons, so both are in view
    goal.az = -0.36
    goal.el = 0.22
    // Close enough to read the screen, far enough to keep the buttons and the robot's hand in view.
    goal.dist = clamp(Math.max(0.6 / TAN, 0.52 / (TAN * camera.aspect)), 2.2, 5.2)
    orbit.az = orbit.el = 0
    zoom = 1
  }
  const walkTo = (to, yaw) => new Promise(resolve => {
    if (!bot) { resolve(); return }
    bot.busy = true
    bot.setExcited(false)
    walk?.resolve()
    walk = { to: to.clone(), yaw, resolve }
    if (still) { bot.root.position.copy(to); bot.root.rotation.y = yaw; walk = null; resolve() }
    wake()
  })
  const stepWalk = dt => {
    if (!walk) return
    const pos = bot.root.position, dx = walk.to.x - pos.x, dz = walk.to.z - pos.z, d = Math.hypot(dx, dz)
    const turn = (yaw, rate) => { bot.root.rotation.y += Math.atan2(Math.sin(yaw - bot.root.rotation.y), Math.cos(yaw - bot.root.rotation.y)) * Math.min(1, dt * rate) }
    if (d > 0.02) {
      bot.setWalking(true)
      turn(Math.atan2(dx, dz), 9)
      const step = Math.min(d, dt * 1.15)
      pos.x += (dx / d) * step
      pos.z += (dz / d) * step
      return
    }
    bot.setWalking(false)
    turn(walk.yaw, 7)
    if (Math.abs(Math.atan2(Math.sin(walk.yaw - bot.root.rotation.y), Math.cos(walk.yaw - bot.root.rotation.y))) < 0.03) { const done = walk.resolve; walk = null; done() }
  }
  async function play(key) {
    if (!arcade?.cabinets[key]) return
    locked = true
    selected = key
    setHover(null)
    aimAt(key)
    wake()
    await walkTo(arcade.cabinets[key].stand, Math.PI)
    playing = key
    settledAt = clock + 0.9
    aimAtScreen()
    wake()
  }
  // A button (0, 1 or 2) or the joystick ('next' or 'prev'); resolves when the hand touches it.
  async function pressButton(which) {
    const cabinet = playing && arcade.cabinets[playing]
    if (!cabinet || !bot) return
    const part = typeof which === 'number' ? cabinet.buttons[which] : cabinet.stick
    const target = part.getWorldPosition(new THREE.Vector3())
    if (typeof which !== 'number') target.y += 0.14
    wake()
    if (still) { pulse(cabinet, which); return }
    await bot.pressAt(target, 1)
    pulse(cabinet, which)
  }
  const pulses = []
  const pulse = (cabinet, which) => { pulses.push({ cabinet, which, at: clock }); wake() }
  const stepPulses = () => {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const { cabinet, which, at } = pulses[i], k = clock - at, on = k < 0.22
      if (typeof which === 'number') {
        const button = cabinet.buttons[which]
        button.position.y = 1.03 - (on ? 0.014 : 0)
        button.material.emissiveIntensity = on ? 1.2 : 0.15
      } else cabinet.stick.rotation.z = on ? (which === 'next' ? -0.35 : 0.35) : 0
      if (!on || still) pulses.splice(i, 1)
    }
  }
  async function leave() {
    if (!arcade) return
    playing = null
    screenEl?.removeAttribute('data-on')
    aimAt(selected)
    wake()
    await walkTo(arcade.home, Math.PI)
    bot.busy = false
    locked = false
  }
  // The game's element is laid over the screen: sized to it and mapped onto its four corners.
  const corner = new THREE.Vector3()
  let screenSize = { w: 0, h: 0 }
  function placeScreen() {
    if (!screenEl) return
    const ready = playing && (still || clock > settledAt)
    if (!ready) { screenEl.removeAttribute('data-on'); return }
    const mesh = arcade.cabinets[playing].screen
    const points = screenCorners.map(local => { corner.copy(local).applyMatrix4(mesh.matrixWorld).project(camera); return [((corner.x + 1) / 2) * size.w, ((1 - corner.y) / 2) * size.h] })
    const w = Math.round(Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]))
    const h = Math.round(Math.hypot(points[3][0] - points[0][0], points[3][1] - points[0][1]))
    if (Math.abs(w - screenSize.w) > 3 || Math.abs(h - screenSize.h) > 3) { screenSize = { w, h }; screenEl.style.width = `${w}px`; screenEl.style.height = `${h}px` }
    screenEl.style.transform = quadTransform(screenSize.w, screenSize.h, points)
    screenEl.setAttribute('data-on', '')
  }

  // ─── Day and night ───
  let night = false
  function setNight(value) {
    night = Boolean(value)
    hemi.color.set(night ? 0x8193c9 : 0xfff6ea)
    hemi.groundColor.set(night ? 0x2a2433 : 0xd6bd9a)
    hemi.intensity = night ? 0.45 : 0.62
    fill.color.set(night ? 0xa4b4e8 : 0xf2f5ff)
    fill.intensity = night ? 0.65 : 1.6
    sun.color.set(night ? 0xc4d6ff : 0xffe6c4)
    sun.intensity = night ? 1.4 : 3
    lamp.intensity = night ? 9 : 0
    kit.setNight(night)
    built.setNight?.(night)
    wake()
  }

  // ─── The loop: runs while on screen; still (reduced motion or paused) moves only what people do ───
  let still = startStill, paused = false, onScreen = true, disposed = false, frame = 0, running = false, dirty = true, clock = 0, last = 0
  const lift = new Map()
  function tick(now) {
    frame = requestAnimationFrame(tick)
    // Capped so a slow frame cannot jump things far, loose enough that a slow device still keeps time.
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
    last = now
    const idle = !still && !paused
    const busy = Boolean(walk || pulses.length || press?.drag || bot?.busy || cats.some(c => c.api.active))
    if (idle || busy) clock += dt
    if (!(idle || busy || dirty)) return
    if (idle) for (const fn of ticks) fn(clock, dt)
    else if (bot?.busy) bot.update(clock)
    for (const c of cats) c.update(clock, pointerFloor)
    stepWalk(dt)
    stepPulses()

    sway.x += (sway.tx - sway.x) * Math.min(1, dt * 2.5)
    sway.y += (sway.ty - sway.y) * Math.min(1, dt * 2.5)
    const aimAz = goal.az + orbit.az + (idle && !playing ? sway.x * 0.05 : 0)
    const aimEl = clamp(goal.el + orbit.el + (idle && !playing ? sway.y * 0.03 : 0), -0.16, 1.1)
    const k = still ? 1 : 1 - Math.exp(-dt * 3.2)
    cam.az += (aimAz - cam.az) * k
    cam.el += (aimEl - cam.el) * k
    cam.dist += (goal.dist * zoom - cam.dist) * k
    cam.target.lerp(goal.target, k)
    // The view slides aside for the page's panel while a prop is in focus.
    const sx = selected ? -inset.left / 2 : 0, sy = selected ? inset.bottom / 2 : 0
    shift.x += (sx - shift.x) * k
    shift.y += (sy - shift.y) * k
    if (Math.abs(shift.x) > 0.5 || Math.abs(shift.y) > 0.5) camera.setViewOffset(size.w, size.h, shift.x, shift.y, size.w, size.h)
    else camera.clearViewOffset()
    placeCamera(cam.target, cam.az, cam.el, cam.dist)
    const gliding = Math.abs(aimAz - cam.az) + Math.abs(aimEl - cam.el) + Math.abs(goal.dist * zoom - cam.dist) / fit + cam.target.distanceTo(goal.target) + Math.abs(sx - shift.x) / 100 + Math.abs(sy - shift.y) / 100 > 1e-3

    for (const [key, p] of picks) {
      const want = !playing && (key === hovered || key === selected) ? 1 : 0
      const was = lift.get(key) || 0, next = was + (want - was) * k * 2
      lift.set(key, next)
      p.group.position.y = (p.group.userData.baseY ??= p.group.position.y) + next * (p.face ? 0 : 0.08)
    }
    renderer.render(scene, camera)
    placeLabels()
    placeScreen()
    dirty = idle || busy || gliding || (playing && clock <= settledAt)
  }
  const scratch = new THREE.Vector3()
  function placeLabels() {
    for (const [key, p] of picks) {
      const el = labels[key]
      if (!el) continue
      p.group.getWorldPosition(scratch)
      scratch.y += p.lift
      scratch.project(camera)
      const x = ((scratch.x + 1) / 2) * size.w, y = ((1 - scratch.y) / 2) * size.h
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
      el.classList.toggle('is-hot', key === hovered)
      el.classList.toggle('is-away', Boolean(selected) || scratch.z > 1)
    }
  }
  function update() {
    const should = onScreen && !document.hidden && !disposed
    if (should && !running) { running = true; last = 0; frame = requestAnimationFrame(tick) }
    else if (!should && running) { running = false; cancelAnimationFrame(frame) }
  }
  function wake() { dirty = true; update() }
  const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update() })
  seen.observe(canvas)
  const sizes = new ResizeObserver(layout)
  sizes.observe(canvas)
  const onVisibility = () => update()
  document.addEventListener('visibilitychange', onVisibility)
  const onPause = event => { paused = Boolean(event.detail); wake() }
  document.addEventListener('classroom:pause', onPause)
  layout()
  cam.dist = goal.dist
  placeCamera(cam.target, cam.az, cam.el, cam.dist)

  // Compile before the first picture where the browser can, then show the room.
  renderer.compileAsync(scene, camera).catch(() => {}).then(() => { if (!disposed) { wake(); onReady?.() } })

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    seen.disconnect()
    sizes.disconnect()
    walk?.resolve()
    document.removeEventListener('visibilitychange', onVisibility)
    document.removeEventListener('classroom:pause', onPause)
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('pointerleave', onLeave)
    canvas.removeEventListener('wheel', onWheel)
    kit.dispose()
    renderer.dispose()
  }

  return {
    focus, setInset, setNight, dispose,
    setStill: value => { still = Boolean(value); wake() },
    play, press: pressButton, leave,
    setScreen: element => { screenEl = element; wake() },
  }
}

// A CSS transform that maps an element of size w by h onto four points on the screen (top left,
// top right, bottom right, bottom left), so the game sits on the cabinet's screen in perspective.
function quadTransform(w, h, [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const adj = m => [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ]
  const mul = (a, b) => {
    const c = new Array(9).fill(0)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) c[3 * i + j] += a[3 * i + k] * b[3 * k + j]
    return c
  }
  const basis = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const m = [ax, bx, cx, ay, by, cy, 1, 1, 1], inv = adj(m)
    const s = [inv[0] * dx + inv[1] * dy + inv[2], inv[3] * dx + inv[4] * dy + inv[5], inv[6] * dx + inv[7] * dy + inv[8]]
    return mul(m, [s[0], 0, 0, 0, s[1], 0, 0, 0, s[2]])
  }
  const t = mul(basis(x0, y0, x1, y1, x3, y3, x2, y2), adj(basis(0, 0, w, 0, 0, h, w, h)))
  const n = t.map(value => value / t[8])
  return `matrix3d(${[n[0], n[3], 0, n[6], n[1], n[4], 0, n[7], 0, 0, 1, 0, n[2], n[5], 0, n[8]].map(value => value.toFixed(8)).join(',')})`
}
