import * as THREE from 'three'

// The landing page's one decorative WebGL scene: satin facets that assemble around the
// EduPulse mark in the opening, and the blue Pulse ring beside the hero's product screen.
// One renderer, one render loop and one camera controller, which combines the entrance
// push-in, the aperture pull-back and a small, clamped pointer parallax. The loop runs only
// while the canvas is on screen and the tab is visible, skips frames when nothing changes,
// damps with frame-rate independent easing and caps the pixel ratio. createLandingScene
// returns null without WebGL; the page then keeps its SVG ring. All meshes share one material
// program, compiled in parallel (compileAsync) before the first frame, so starting the scene
// never stalls the opening.

const FOV = 30
const START_Z = 10.6
const REST_Z = 11
const damp = (from, to, lambda, dt) => from + (to - from) * (1 - Math.exp(-lambda * dt))
const clamp01 = value => Math.min(1, Math.max(0, value))
const easeOut = t => 1 - (1 - t) ** 3
const easeInOut = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const halfHeight = distance => Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * distance

// Facets around the mark: outline (unit shape), colour, polar angle, depth and size.
const FACETS = [
  { outline: [[0, 0.62], [0.56, -0.34], [-0.52, -0.3]], color: 0xffffff, angle: 200, z: 0.4, size: 0.95 },
  { outline: [[0, 0.55], [0.4, 0], [0, -0.55], [-0.32, 0.02]], color: 0xdbeafe, angle: 150, z: -0.5, size: 0.8 },
  { outline: [[-0.42, 0.3], [0.14, 0.5], [0.5, 0.04], [0.2, -0.42], [-0.46, -0.2]], color: 0xf4f9ff, angle: 104, z: 0.25, size: 0.82 },
  { outline: [[-0.48, 0.22], [0.4, 0.34], [0.5, -0.2], [-0.38, -0.3]], color: 0x2563eb, angle: 58, z: -0.2, size: 0.62 },
  { outline: [[0, 0.6], [0.52, -0.3], [-0.5, -0.36]], color: 0xdbeafe, angle: 12, z: 0.5, size: 0.9 },
  { outline: [[0, 0.5], [0.36, 0.04], [0.02, -0.52], [-0.38, 0]], color: 0xffffff, angle: -28, z: -0.4, size: 0.85 },
  { outline: [[-0.48, 0.24], [0.2, 0.46], [0.52, -0.06], [0.06, -0.44], [-0.4, -0.3]], color: 0x93c5fd, angle: -64, z: 0.3, size: 0.6 },
  { outline: [[-0.55, 0.16], [0.6, 0.18], [0.5, -0.12], [-0.6, -0.14]], color: 0xf4f9ff, angle: -118, z: -0.3, size: 0.8 },
]

export function createLandingScene({ canvas, anchor, inputs, onReady, onLost }) {
  // Without WebGL there is nothing to do (and three would log an error while failing).
  const probe = document.createElement('canvas')
  const probeContext = probe.getContext('webgl2') || probe.getContext('webgl')
  if (!probeContext) return null
  probeContext.getExtension('WEBGL_lose_context')?.loseContext()
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  } catch {
    return null
  }
  if (!renderer.getContext()) { renderer.dispose(); return null }
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.NeutralToneMapping

  const scene = new THREE.Scene()
  // Satin surfaces: one standard material program for every mesh (only uniforms differ).
  const satin = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.08, transparent: true, opacity: 0, side: THREE.DoubleSide, ...extra })

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80)
  camera.position.set(0, 0, START_Z)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.25))
  const key = new THREE.DirectionalLight(0xffffff, 2.1)
  key.position.set(3, 5, 6)
  const fill = new THREE.DirectionalLight(0xffffff, 0.7)
  fill.position.set(-4, 2, 5)
  const rim = new THREE.DirectionalLight(0xbfdbfe, 1.3)
  rim.position.set(-5, -2, -4)
  scene.add(key, fill, rim)

  const facets = FACETS.map((facet, i) => {
    const shape = new THREE.Shape(facet.outline.map(([x, y]) => new THREE.Vector2(x, y)))
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 2, curveSegments: 1 })
    geometry.center()
    const material = satin(facet.color, { emissive: facet.color, emissiveIntensity: 0.22 }) // keeps the light facets satin-white
    const mesh = new THREE.Mesh(geometry, material)
    mesh.visible = false
    scene.add(mesh)
    const sign = i % 2 ? -1 : 1
    const angle = THREE.MathUtils.degToRad(facet.angle)
    return {
      mesh, material, angle, z: facet.z, size: facet.size, delay: i * 0.035,
      rest: new THREE.Vector3(0.35 * Math.sin(i * 1.7), 0.5 * Math.cos(i * 1.3), angle + 0.4),
      spin: new THREE.Vector3(1.1 * sign, -0.9 * sign, 1.5 * sign),
    }
  })

  const ringMaterials = [
    satin(0x2563eb, { roughness: 0.22, metalness: 0.28 }),
    satin(0xdbeafe, { roughness: 0.4 }),
    satin(0x93c5fd, { roughness: 0.2, emissive: 0x3b82f6, emissiveIntensity: 0.4 }),
  ]
  const ring = new THREE.Group()
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(1, 0.094, 32, 72, Math.PI * 0.42), ringMaterials[2])
  ring.add(
    new THREE.Mesh(new THREE.TorusGeometry(1, 0.085, 48, 180), ringMaterials[0]),
    new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.014, 16, 160), ringMaterials[1]),
    pulse,
  )
  ring.visible = false
  scene.add(ring)

  // Layout: canvas size, the facets' ellipse around the mark, and the ring placed over the
  // hero's ring anchor (projected for the resting camera).
  const view = { rx: 3, ry: 1.8, scale: 1, ring: { on: false, x: 0, y: 0, r: 1 } }
  let dirty = true, disposed = false
  function layout() {
    if (disposed) return
    const box = canvas.getBoundingClientRect()
    if (!box.width || !box.height) return
    const compact = box.width < 760
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75))
    renderer.setSize(box.width, box.height, false)
    camera.aspect = box.width / box.height
    camera.updateProjectionMatrix()
    const portrait = camera.aspect < 1
    view.rx = halfHeight(10) * camera.aspect * (portrait ? 0.9 : 0.72)
    view.ry = halfHeight(10) * (portrait ? 0.6 : 0.66)
    view.scale = portrait ? 0.6 : 1
    const target = anchor?.getBoundingClientRect()
    const centreY = target ? target.top + target.height / 2 - box.top : -1
    if (target && target.width > 8 && centreY > 0 && centreY < box.height) {
      const h = halfHeight(REST_Z)
      view.ring = {
        on: true,
        x: (((target.left + target.width / 2 - box.left) / box.width) * 2 - 1) * h * camera.aspect,
        y: -(((centreY / box.height) * 2 - 1) * h),
        r: (target.width / box.height) * h * 0.82,
      }
    } else view.ring.on = false
    dirty = true
  }

  const fine = window.matchMedia('(pointer: fine)')
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  const onPointer = event => {
    if (!fine.matches) return
    pointer.tx = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1))
    pointer.ty = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1))
  }

  const cam = { x: 0, y: 0, z: START_Z }
  const seenInputs = { intro: -1, aperture: -1, hero: -1 }
  let frame = 0, last = 0, clock = 0, running = false, onScreen = true

  function tick(now) {
    frame = requestAnimationFrame(tick)
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    clock += dt
    const intro = clamp01(inputs.intro), aperture = clamp01(inputs.aperture), hero = clamp01(inputs.hero)
    const changed = intro !== seenInputs.intro || aperture !== seenInputs.aperture || hero !== seenInputs.hero
    Object.assign(seenInputs, { intro, aperture, hero })

    // The camera: pushes in during the entrance, pulls back as the aperture opens, and
    // follows the pointer a little. Shallow, damped, no roll and no noise.
    pointer.x = damp(pointer.x, pointer.tx, 2.5, dt)
    pointer.y = damp(pointer.y, pointer.ty, 2.5, dt)
    const near = START_Z - 0.8 * easeOut(intro)
    const goal = { x: pointer.x * 0.18, y: -pointer.y * 0.1, z: near + (REST_Z - near) * easeInOut(aperture) }
    cam.x = damp(cam.x, goal.x, 3.5, dt)
    cam.y = damp(cam.y, goal.y, 3.5, dt)
    cam.z = damp(cam.z, goal.z, 4.5, dt)
    const moving = Math.abs(cam.x - goal.x) + Math.abs(cam.y - goal.y) + Math.abs(cam.z - goal.z) > 1e-4
    camera.position.set(cam.x, cam.y, cam.z)
    camera.lookAt(0, 0, 0)

    const out = easeInOut(aperture)
    for (const facet of facets) {
      const t = easeOut(clamp01((intro - facet.delay) / (1 - facet.delay)))
      const opacity = t * (1 - out)
      facet.mesh.visible = opacity > 0.01
      if (!facet.mesh.visible) continue
      const spread = 1 + (1 - t) * 1.1 + out * 1.4
      facet.mesh.position.set(Math.cos(facet.angle) * view.rx * spread, Math.sin(facet.angle) * view.ry * spread, facet.z - (1 - t) * 3.5 + out * 1.2)
      facet.mesh.rotation.set(facet.rest.x + facet.spin.x * (1 - t + out * 0.5), facet.rest.y + facet.spin.y * (1 - t), facet.rest.z + facet.spin.z * (1 - t))
      facet.mesh.scale.setScalar(facet.size * view.scale * (0.85 + 0.15 * t))
      facet.material.opacity = opacity
    }

    const arrive = easeOut(hero)
    ring.visible = view.ring.on && arrive > 0.01
    if (ring.visible) {
      ring.position.set(view.ring.x, view.ring.y, 0)
      ring.scale.setScalar(view.ring.r * (0.72 + 0.28 * arrive))
      ring.rotation.set(0.95 + Math.sin(clock * 0.35) * 0.05, -0.38 + Math.sin(clock * 0.22) * 0.12 + (1 - arrive) * 0.8, 0.1)
      pulse.rotation.z = clock * 0.55
      for (const material of ringMaterials) material.opacity = arrive
    }

    if (dirty || changed || moving || ring.visible) {
      renderer.render(scene, camera)
      dirty = false
    }
  }

  let ready = false
  const update = () => {
    const should = ready && onScreen && !document.hidden && !disposed
    if (should && !running) { running = true; last = 0; frame = requestAnimationFrame(tick) }
    else if (!should && running) { running = false; cancelAnimationFrame(frame) }
  }
  const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update() })
  const sizes = new ResizeObserver(layout)
  const onLoad = () => layout()
  const onContextLost = event => { event.preventDefault(); dispose(); onLost?.() }

  function dispose() {
    if (disposed) return
    disposed = true
    running = false
    cancelAnimationFrame(frame)
    seen.disconnect()
    sizes.disconnect()
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('load', onLoad)
    document.removeEventListener('visibilitychange', update)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    scene.traverse(object => object.geometry?.dispose())
    for (const facet of facets) facet.material.dispose()
    for (const material of ringMaterials) material.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('load', onLoad)
  document.addEventListener('visibilitychange', update)
  canvas.addEventListener('webglcontextlost', onContextLost)
  seen.observe(canvas)
  sizes.observe(canvas)
  if (anchor) sizes.observe(anchor)
  document.fonts?.ready.then(onLoad)
  layout()
  // Compile the shared material program in parallel, then start drawing. Hidden objects are
  // skipped by the compiler, so everything is briefly marked visible for it.
  for (const facet of facets) facet.mesh.visible = true
  ring.visible = true
  renderer.compileAsync(scene, camera).catch(() => undefined).then(() => {
    if (disposed) return
    for (const facet of facets) facet.mesh.visible = false
    ring.visible = false
    ready = true
    dirty = true
    update()
    onReady?.()
  })
  return { dispose }
}
