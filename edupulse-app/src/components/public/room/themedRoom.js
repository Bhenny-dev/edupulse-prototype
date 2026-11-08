import * as THREE from 'three'
import { createKit } from '../../landing/classroom/kit'
import { createRobots } from '../../landing/classroom/robot'
import { createCats } from './cat'
import { buildTheme } from './themes'

const FOV = 30
const LOOK = new THREE.Vector3(0, 1.25, -0.4)
const HOME = new THREE.Vector3(12.6, 9.4, 14.3)

// A themed classroom seen as a cut-away diorama, like the agent workspace: a floor, two walls with
// windows, the theme's props and their animations, robots and a cat or two. Props the theme names
// can be picked; the page shows what each stands for. DOM labels (one per pick key, passed in
// `labels`) follow their props on screen and are the accessible way to pick.
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
  const ticks = [], picks = new Map()
  const room = new THREE.Group()
  scene.add(room)
  const theme$ = buildTheme(theme, {
    THREE, kit, room, robot, cat, images,
    tick: fn => ticks.push(fn),
    pick: (key, group, lift = 1.6) => { group.userData.live = true; picks.set(key, { group, lift }); return group },
  })
  kit.bake(room)

  // ─── Picking: hover lifts a prop a little; a click (or its label) selects it ───
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
  let hovered = null, selected = null
  const pickAt = (clientX, clientY) => {
    const box = canvas.getBoundingClientRect()
    pointer.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects([...picks.values()].map(p => p.group), true)[0]
    if (!hit) return null
    for (const [key, { group }] of picks) { let o = hit.object; while (o) { if (o === group) return key; o = o.parent } }
    return null
  }
  const onMove = event => {
    pointerAim.set(((event.clientX / window.innerWidth) - 0.5) * 2, ((event.clientY / window.innerHeight) - 0.5) * 2)
    const key = pickAt(event.clientX, event.clientY)
    if (key !== hovered) { hovered = key; canvas.style.cursor = key ? 'pointer' : ''; onHover?.(key); wake() }
  }
  const onClick = event => { const key = pickAt(event.clientX, event.clientY); if (key) onPick?.(key) }
  const onLeave = () => { if (hovered) { hovered = null; canvas.style.cursor = ''; onHover?.(null); wake() } }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('click', onClick)
  canvas.addEventListener('pointerleave', onLeave)

  // ─── Camera: a slow sway with the pointer; a picked prop draws the view toward it ───
  const pointerAim = new THREE.Vector2()
  const target = LOOK.clone(), place = HOME.clone(), aim = LOOK.clone(), seat = HOME.clone()
  const size = { w: 1, h: 1 }
  let fit = 1
  function layout() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight)
    size.w = w
    size.h = h
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.75))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // A narrow screen steps back so the whole room stays in view.
    fit = Math.max(1, 1.24 / camera.aspect)
    // On a wide screen the room sits right of centre, clear of the words on the left.
    if (camera.aspect > 1.2 && w > 900) camera.setViewOffset(w, h, -w * 0.14, 0, w, h)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    wake()
  }
  function focus(key) {
    selected = key
    const p = key && picks.get(key)
    if (p) {
      const world = new THREE.Vector3()
      p.group.getWorldPosition(world)
      aim.copy(LOOK).lerp(world.setY(Math.max(0.8, world.y + 0.4)), 0.45)
      seat.copy(HOME).sub(LOOK).multiplyScalar(0.78).add(aim)
    } else { aim.copy(LOOK); seat.copy(HOME) }
    wake()
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
    theme$.setNight?.(night)
    wake()
  }

  // ─── The loop: runs while on screen; still (reduced motion or paused) draws only on change ───
  let still = startStill, paused = false, onScreen = true, disposed = false, frame = 0, running = false, dirty = true, clock = 0, last = 0
  const lift = new Map()
  function tick(now) {
    frame = requestAnimationFrame(tick)
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    const moving = !still && !paused
    if (moving) clock += dt
    if (moving || dirty) {
      for (const fn of ticks) fn(clock, dt)
      const k = 1 - Math.exp(-dt * 3.2)
      target.lerp(aim, k)
      const sway = moving ? 0.35 : 0
      place.lerp(new THREE.Vector3(seat.x - pointerAim.x * sway, seat.y + pointerAim.y * sway * 0.6, seat.z), k)
      const back = place.clone().sub(target).multiplyScalar(fit).add(target)
      camera.position.copy(back)
      camera.lookAt(target)
      for (const [key, p] of picks) {
        const goal = key === hovered || key === selected ? 1 : 0
        const was = lift.get(key) || 0, next = was + (goal - was) * k * 2
        lift.set(key, next)
        p.group.position.y = (p.group.userData.baseY ??= p.group.position.y) + next * 0.08
      }
      renderer.render(scene, camera)
      placeLabels()
      dirty = moving || Math.abs(target.distanceToSquared(aim)) > 1e-5 || place.distanceToSquared(seat) > 1e-4
    }
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
      el.classList.toggle('is-hot', key === hovered || key === selected)
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
  camera.position.copy(HOME)
  camera.lookAt(LOOK)

  // Compile before the first picture where the browser can, then show the room.
  renderer.compileAsync(scene, camera).catch(() => {}).then(() => { if (!disposed) { wake(); onReady?.() } })

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    seen.disconnect()
    sizes.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    document.removeEventListener('classroom:pause', onPause)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('click', onClick)
    canvas.removeEventListener('pointerleave', onLeave)
    kit.dispose()
    renderer.dispose()
  }

  return { focus, setNight, setStill: value => { still = Boolean(value); wake() }, dispose }
}
