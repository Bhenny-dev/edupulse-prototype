import * as THREE from 'three'
import { createKit } from './kit'
import { buildSets } from './sets'
import { FOV, HERO, ROOMS, FLIGHTS } from './plan'

const smoother = t => t * t * t * (t * (t * 6 - 15) + 10)
const v3 = a => new THREE.Vector3(a[0], a[1], a[2])

// The 3D school: renderer, lighting (the same as the agent workspace), camera path and the matrix
// that lays a room's HTML sheet on its surface. It knows nothing about scrolling: the stage tells it
// where along the walk the visitor is, every frame. Returns null without WebGL.
export function createWorld({ canvas, buildingUrl, compact = false, onLost, onSlow }) {
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
  renderer.shadowMap.autoUpdate = false

  const onContextLost = event => { event.preventDefault(); onLost?.() }
  canvas.addEventListener('webglcontextlost', onContextLost)

  const scene = new THREE.Scene()
  // A portrait screen sees the same rooms from the same places, with a wider lens.
  const restFov = compact ? 56 : FOV
  const camera = new THREE.PerspectiveCamera(restFov, 1, 0.1, 340)
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0xd6bd9a, 0.62)
  // An even fill in place of a studio reflection map, which takes seconds to prepare on some machines.
  const fill = new THREE.AmbientLight(0xf2f5ff, 1.6)
  // At night a warm ceiling light hangs in front of the wall in view (indoors only).
  const lamp = new THREE.PointLight(0xffc98a, 0, 18, 1.3)
  scene.add(hemi, fill, lamp)
  const sun = new THREE.DirectionalLight(0xffe6c4, 3.2)
  sun.castShadow = !compact
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 44 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 2.5
  scene.add(sun, sun.target)
  // The sun keeps the same relation to the wall each room is looking at, so that wall is lit.
  const aimSun = (focus, normal) => {
    sun.target.position.copy(focus)
    const nx = normal && Math.abs(normal.y) < 0.5 ? normal.x : 0, nz = normal && Math.abs(normal.y) < 0.5 ? normal.z : 1
    sun.position.set(focus.x + nx * 7.5 - nz * 4.5, focus.y + 14, focus.z + nz * 7.5 + nx * 4.5)
    sun.target.updateMatrixWorld()
    sun.updateMatrixWorld()
    lamp.position.set(focus.x + nx * 2.6, focus.y + 3.4, focus.z + nz * 2.6)
    renderer.shadowMap.needsUpdate = true
  }

  const kit = createKit()
  const school = buildSets(kit, { buildingUrl })
  for (const set of Object.values(school.sets)) scene.add(set)

  // Dust in the light around the visitor (as in the workspace).
  const dustCount = 120
  const dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = -4 + ((i * 37) % 100) / 100 * 8
    dustPositions[i * 3 + 1] = 0.3 + ((i * 53) % 100) / 100 * 3.4
    dustPositions[i * 3 + 2] = -4 + ((i * 71) % 100) / 100 * 8
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const speck = document.createElement('canvas')
  speck.width = speck.height = 32
  const speckBrush = speck.getContext('2d')
  const speckFill = speckBrush.createRadialGradient(16, 16, 0, 16, 16, 16)
  speckFill.addColorStop(0, 'rgba(255,255,255,1)')
  speckFill.addColorStop(0.4, 'rgba(255,255,255,0.75)')
  speckFill.addColorStop(1, 'rgba(255,255,255,0)')
  speckBrush.fillStyle = speckFill
  speckBrush.fillRect(0, 0, 32, 32)
  const speckTexture = new THREE.CanvasTexture(speck)
  const dustMaterial = new THREE.PointsMaterial({ color: 0xfff7e6, map: speckTexture, size: 0.05, transparent: true, opacity: 0.6, depthWrite: false })
  const dust = new THREE.Points(dustGeometry, dustMaterial)
  dust.frustumCulled = false
  scene.add(dust)

  // Night: stars and the moon on a sky that travels with the camera.
  const sky = new THREE.Group()
  sky.visible = false
  scene.add(sky)
  const hash = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s) }
  const starField = (count, size, color, seed) => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const y = 0.05 + Math.pow(hash(i + seed), 0.85) * 0.95, r = Math.sqrt(1 - y * y), a = hash(i * 3.1 + seed * 7.7) * Math.PI * 2
      positions[i * 3] = Math.cos(a) * r * 300
      positions[i * 3 + 1] = y * 300
      positions[i * 3 + 2] = Math.sin(a) * r * 300
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({ color, map: speckTexture, size, sizeAttenuation: false, transparent: true, depthWrite: false, toneMapped: false })
    kit.geometries.add(geometry)
    kit.materials.add(material)
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    sky.add(points)
    return points
  }
  starField(1100, 2.2, 0xdfe8ff, 1)
  const brightStars = starField(90, 4.4, 0xfff1cc, 7)
  const moonFace = kit.paint(128, 128, g => {
    g.fillStyle = '#fff6dc'
    g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgba(190, 178, 152, 0.5)'
    for (const [x, y, r] of [[44, 50, 13], [80, 40, 8], [74, 84, 16], [40, 88, 7], [98, 70, 6]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
  })
  const haloFace = kit.paint(128, 128, g => {
    const glow = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    glow.addColorStop(0.25, 'rgba(255, 255, 255, 0.35)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    g.fillStyle = glow
    g.fillRect(0, 0, 128, 128)
  })
  const moonDirection = new THREE.Vector3(0.259, 0.189, -0.947).normalize()
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloFace, color: 0xc9d8ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonFace, transparent: true, depthWrite: false, toneMapped: false }))
  kit.materials.add(halo.material)
  kit.materials.add(moon.material)
  halo.scale.setScalar(64)
  moon.scale.setScalar(17)
  halo.position.copy(moonDirection).multiplyScalar(262)
  moon.position.copy(moonDirection).multiplyScalar(260)
  halo.renderOrder = 1
  moon.renderOrder = 2
  sky.add(halo, moon)
  const OUTDOORS = new Set(['campus', 'yard'])
  let night = false
  function setNight(value) {
    night = Boolean(value)
    sky.visible = night
    hemi.color.set(night ? 0x8193c9 : 0xfff6ea)
    hemi.groundColor.set(night ? 0x2a2433 : 0xd6bd9a)
    hemi.intensity = night ? 0.45 : 0.62
    fill.color.set(night ? 0xa4b4e8 : 0xf2f5ff)
    fill.intensity = night ? 0.6 : 1.6
    sun.color.set(night ? 0xc4d6ff : 0xffe6c4)
    sun.intensity = night ? 1.5 : 3.2
    school.setNight(night)
    renderer.shadowMap.needsUpdate = true
  }

  // ─── Rooms: each sheet's plane, scale and resting camera, from the page's measurements ───
  const size = { w: 1, h: 1 }
  const rooms = {}
  for (const [key, plan] of Object.entries(ROOMS)) {
    const normal = v3(plan.normal), up = v3(plan.up)
    const right = new THREE.Vector3().crossVectors(up, normal).normalize()
    const basis = new THREE.Matrix4().makeBasis(right, up, normal)
    rooms[key] = {
      key, plan, normal, up, right, at: v3(plan.at), focus: v3(plan.focus),
      quaternion: new THREE.Quaternion().setFromRotationMatrix(basis),
      scale: 0.005, centre: v3(plan.at), panMax: 0, model: new THREE.Matrix4(), measured: false,
    }
  }
  const focalAt = fov => (size.h / 2) / Math.tan(THREE.MathUtils.degToRad(fov) / 2)
  const distanceFor = viewH => viewH / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2))

  // The resting pose: straight on, at the distance where the sheet is drawn at its own size. Further
  // down a sheet taller than the screen, the camera slides along it, as the sheet itself does.
  const restPose = (room, pan = 0) => {
    const look = room.centre.clone().addScaledVector(room.up, -pan * room.scale)
    return { pos: look.clone().addScaledVector(room.normal, distanceFor(room.plan.viewH)), look, up: room.up.clone(), fov: restFov }
  }

  function measure(key, data) {
    const room = rooms[key]
    if (!room) return
    const { anchor, items } = data
    const u = room.plan.viewH / Math.max(1, data.H)
    room.scale = u
    room.panMax = data.panMax
    // The centre of the screen when the sheet is at rest, found from where its anchor must sit.
    const ax = anchor.x + anchor.w / 2, ay = anchor.y + anchor.h / 2
    room.centre.copy(room.at).addScaledVector(room.right, -(ax - data.W / 2) * u).addScaledVector(room.up, -(data.H / 2 - ay) * u)
    // DOM pixel (x, y) to world, as a matrix.
    const col0 = room.right.clone().multiplyScalar(u), col1 = room.up.clone().multiplyScalar(-u), col2 = room.normal.clone().multiplyScalar(u)
    const origin = room.centre.clone().addScaledVector(room.right, -(data.W / 2) * u).addScaledVector(room.up, (data.H / 2) * u)
    room.model.set(
      col0.x, col1.x, col2.x, origin.x,
      col0.y, col1.y, col2.y, origin.y,
      col0.z, col1.z, col2.z, origin.z,
      0, 0, 0, 1,
    )
    room.measured = true
    const P = (x, y, lift = 0) => new THREE.Vector3(x, y, lift / u).applyMatrix4(room.model)
    const S = px => px * u
    school.fits[key]?.({ P, S, anchor, items, width: data.W, quaternion: room.quaternion })
    curves.clear()
    renderer.shadowMap.needsUpdate = true
  }

  function resize(W, H) {
    size.w = W
    size.h = H
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr))
    renderer.setSize(W, H, false)
    camera.aspect = W / Math.max(1, H)
    camera.updateProjectionMatrix()
    curves.clear()
  }

  // ─── The walk ───
  const curves = new Map()
  const heroFov = compact ? 46 : HERO.fov
  const endpoints = (name, flight) => {
    const [from, to] = name.split('>')
    const start = flight.start ? { pos: v3(flight.start.pos), look: v3(flight.start.look), up: new THREE.Vector3(0, 1, 0), fov: compact ? restFov : flight.start.fov }
      : from === 'hero' ? { pos: v3(HERO.pos), look: v3(HERO.look), up: v3(HERO.up), fov: heroFov }
        : restPose(rooms[from], rooms[from].panMax)
    let end
    if (flight.end) {
      const clockAt = school.anchors.clock
      end = { pos: new THREE.Vector3(clockAt.x, clockAt.y, flight.end.pos[2]), look: new THREE.Vector3(clockAt.x, clockAt.y, flight.end.look[2]), up: new THREE.Vector3(0, 1, 0), fov: compact ? restFov : flight.end.fov }
    } else end = restPose(rooms[to], 0)
    return { start, end }
  }
  const curveFor = name => {
    if (curves.has(name)) return curves.get(name)
    const flight = FLIGHTS[name]
    const { start, end } = endpoints(name, flight)
    const mid = flight.via.map(([p, l, u]) => ({ pos: v3(p), look: v3(l), up: u ? v3(u) : new THREE.Vector3(0, 1, 0) }))
    const nodes = [start, ...mid, end]
    const make = key => new THREE.CatmullRomCurve3(nodes.map(n => n[key].clone()), false, 'centripetal')
    const built = { flight, pos: make('pos'), look: make('look'), up: make('up'), start, end, nodes }
    curves.set(name, built)
    return built
  }

  const allSets = Object.keys(school.sets)
  let shown = ''
  const showSets = names => {
    const key = names.join()
    if (key === shown) return
    shown = key
    for (const name of allSets) school.sets[name].visible = names.includes(name)
    renderer.shadowMap.needsUpdate = true
  }
  const doorNames = Object.keys(school.doors)
  const setDoors = (name, open) => {
    for (const leaf of school.doors[name] || []) leaf.hinge.rotation.y = leaf.base + leaf.dir * open * 1.72
  }

  const look = new THREE.Vector3(), up = new THREE.Vector3()
  const focus = new THREE.Vector3()
  let hidden = false, aimed = null, motion = 0
  const lastPos = new THREE.Vector3()

  function pose(state) {
    if (state.kind === 'opaque') {
      if (!hidden) { hidden = true; canvas.style.visibility = 'hidden' }
      return
    }
    if (hidden) { hidden = false; canvas.style.visibility = '' }
    let fov = restFov, target = null
    if (state.kind === 'hero') {
      showSets(HERO.sets)
      camera.position.fromArray(HERO.pos)
      look.fromArray(HERO.look)
      up.fromArray(HERO.up)
      fov = heroFov
      target = rooms.problem.focus
      for (const name of doorNames) setDoors(name, 0)
      if (aimed !== 'hero') { aimed = 'hero'; focus.set(0, 0, -12); aimSun(focus) }
    } else if (state.kind === 'hold') {
      const room = rooms[state.key]
      showSets(room.plan.sets)
      const rest = restPose(room, state.pan)
      camera.position.copy(rest.pos)
      look.copy(rest.look)
      up.copy(rest.up)
      fov = rest.fov
      target = room.focus
      for (const name of doorNames) setDoors(name, 0)
      if (aimed !== room.key) { aimed = room.key; aimSun(room.focus, room.normal) }
    } else {
      const walk = curveFor(state.key)
      const { flight } = walk
      const s = smoother(state.t)
      walk.pos.getPoint(s, camera.position)
      walk.look.getPoint(s, look)
      walk.up.getPoint(s, up).normalize()
      fov = THREE.MathUtils.lerp(walk.start.fov, walk.end.fov, s) + (flight.fovKick || 0) * Math.sin(Math.PI * s)
      const names = flight.sets.length > 1 && state.t > (flight.drop ?? 0.86) ? flight.sets.slice(1) : flight.sets
      showSets(names)
      for (const name of doorNames) {
        if (flight.door?.[0] === name) {
          const open = THREE.MathUtils.clamp((state.t - flight.door[1]) / (flight.door[2] - flight.door[1]), 0, 1)
          setDoors(name, open * open * (3 - 2 * open))
        } else setDoors(name, 0)
      }
      if (flight.door) renderer.shadowMap.needsUpdate = true
      const [from, to] = state.key.split('>')
      const room = state.t < 0.5 && rooms[from] ? rooms[from] : rooms[to] || rooms[from]
      if (room && aimed !== room.key) { aimed = room.key; aimSun(room.focus, room.normal) }
      target = room?.focus
    }
    if (target) dust.position.copy(target)
    dust.visible = state.kind !== 'hero' && !shown.includes('yard') && !shown.includes('campus')
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix() }
    camera.up.copy(up)
    camera.lookAt(look)
    camera.updateMatrixWorld()
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    motion = camera.position.distanceToSquared(lastPos)
    lastPos.copy(camera.position)
  }

  // ─── Laying a sheet on its surface: the page's pixels through the camera to the screen ───
  const screenMatrix = new THREE.Matrix4(), sheet = new THREE.Matrix4()
  function sheetTransform(key, width, height) {
    const room = rooms[key]
    if (!room?.measured) return null
    const f = focalAt(camera.fov), cx = size.w / 2, cy = size.h / 2
    screenMatrix.set(
      f, 0, -cx, 0,
      0, -f, -cy, 0,
      0, 0, 0, 1,
      0, 0, -1, 0,
    )
    sheet.multiplyMatrices(screenMatrix, camera.matrixWorldInverse).multiply(room.model)
    const e = sheet.elements
    // A corner behind the camera has no place on the screen.
    for (const [x, y] of [[0, 0], [width, 0], [0, height], [width, height]]) if (e[3] * x + e[7] * y + e[15] < 0.02) return null
    return `matrix3d(${e.join(',')})`
  }

  // ─── Frames ───
  // A slow machine drops resolution, then the shadows, rather than the walk's smoothness.
  const quality = { dpr: compact ? 1.25 : 1.75, level: 0 }
  let slow = 0, samples = 0, shadowClock = 0, last = 0
  const dropShadows = () => { renderer.shadowMap.enabled = false; sun.castShadow = false; quality.dpr = 0.8; for (const material of kit.materials) material.needsUpdate = true }
  // Without a graphics card (a remote desktop, a virtual machine) the walk starts at the cheap end.
  const gl = renderer.getContext()
  const about = gl.getExtension('WEBGL_debug_renderer_info')
  const software = about && /swiftshader|llvmpipe|software|basic render/i.test(String(gl.getParameter(about.UNMASKED_RENDERER_WEBGL)))
  if (software && import.meta.env.MODE !== 'capture') { quality.level = 3; dropShadows() }
  function adapt(dt) {
    if (import.meta.env.MODE === 'capture') return // documentation images keep the full picture
    samples++
    slow += dt
    if (samples < 45 && slow < 1.5) return
    const average = slow / samples
    samples = 0
    slow = 0
    if (average > 1 / 34 && quality.level < 3) {
      quality.level++
      if (quality.level === 1) quality.dpr = Math.min(quality.dpr, 1.25)
      if (quality.level === 2) quality.dpr = 1
      if (quality.level === 3) dropShadows()
      resize(size.w, size.h)
    } else if (average > 1 / 16 && quality.level === 3) onSlow?.()
  }
  function frame(time) {
    if (hidden || !ready) { last = 0; return }
    const dt = Math.min(0.2, last ? time - last : 1 / 60)
    last = time
    if (dt > 0) adapt(dt)
    for (const name of shown.split(',')) if (name) school.tickSet(name, time)
    if (dust.visible) dust.rotation.y = time * 0.012
    if (night) {
      sky.position.copy(camera.position)
      brightStars.material.opacity = 0.72 + 0.28 * Math.sin(time * 1.7)
      lamp.intensity = shown.split(',').every(name => !name || OUTDOORS.has(name)) ? 0 : 10
    } else lamp.intensity = 0
    shadowClock += dt
    if (renderer.shadowMap.enabled && shadowClock > 0.25) { shadowClock = 0; renderer.shadowMap.needsUpdate = true }
    renderer.render(scene, camera)
  }

  // Every room's materials are compiled before the first picture, in the background where the
  // browser allows it, so neither the opening nor the first look at a room stutters. A software
  // renderer compiles as it draws instead, which costs it less than waiting.
  let ready = software, alive = true
  const whenReady = (software ? Promise.resolve() : renderer.compileAsync(scene, camera).catch(() => {})).then(() => {
    if (!alive) return
    for (const texture of kit.textures) renderer.initTexture(texture)
    ready = true
  })

  function dispose() {
    alive = false
    canvas.removeEventListener('webglcontextlost', onContextLost)
    kit.dispose()
    dustGeometry.dispose()
    dustMaterial.dispose()
    speckTexture.dispose()
    renderer.dispose()
  }

  return { measure, resize, pose, sheetTransform, frame, dispose, whenReady, setNight, setRole: index => school.anchors.setRole?.(index), get moved() { return motion > 1e-7 } }
}
