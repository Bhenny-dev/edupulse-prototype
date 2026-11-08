import * as THREE from 'three'

// The landing page's one decorative WebGL scene: satin facets that assemble around the
// EduPulse mark in the opening, then the hero's emblem: the blue Pulse ring tilted like an
// orbit around two porcelain medallions that carry the KCP crest and the CIT emblem, with blue
// and white planes drifting in the field behind them. One renderer, one render loop and one
// camera controller, which combines the entrance push-in, the aperture pull-back and a small,
// clamped pointer parallax. Every movement is damped with frame-rate independent easing, on
// long, even curves. The loop runs only while the canvas is on screen and the tab is visible,
// and the pixel ratio is capped. createLandingScene returns null without WebGL; the page then
// keeps its flat emblem (SVG ring and seal images). Materials compile in parallel
// (compileAsync) before the first frame, so starting the scene never stalls the opening.

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

// The hero's emblem, in units of the emblem box's width. The ring is a halo behind the seals,
// tipped back a little. The seals sit inside it on a diagonal, KCP above on the left and CIT
// below on the right, a little in front, each turned slightly towards the other. They turn in
// from edge-on (from opposite sides) as the hero arrives.
const RING = { radius: 0.45, z: -0.1 }
const SEALS = [
  { x: -0.15, y: 0.1, z: -0.04, radius: 0.19, turn: 0.18, phase: 0, delay: 0 },
  { x: 0.15, y: -0.1, z: 0.08, radius: 0.19, turn: -0.18, phase: 1.9, delay: 0.14 },
]
// Planes drifting in the field around the emblem, clear of the title on its left: outline,
// colour, offset from the emblem's centre, depth, size and opacity at rest. White and pale
// blue, with one blue accent.
const PLANES = [
  { outline: [[-0.5, 0.3], [0.5, 0.42], [0.42, -0.4], [-0.46, -0.32]], color: 0xffffff, x: 0.52, y: 0.4, z: -0.5, size: 0.28, opacity: 0.95 },
  { outline: [[0, 0.6], [0.52, -0.3], [-0.5, -0.36]], color: 0xdbeafe, x: -0.4, y: 0.42, z: -0.6, size: 0.24, opacity: 0.9 },
  { outline: [[-0.48, 0.22], [0.4, 0.34], [0.5, -0.2], [-0.38, -0.3]], color: 0x2563eb, x: 0.56, y: -0.42, z: -0.3, size: 0.13, opacity: 0.85 },
  { outline: [[0, 0.5], [0.36, 0.04], [0.02, -0.52], [-0.38, 0]], color: 0x93c5fd, x: -0.34, y: -0.52, z: -0.4, size: 0.16, opacity: 0.7 },
  { outline: [[-0.42, 0.3], [0.14, 0.5], [0.5, 0.04], [0.2, -0.42], [-0.46, -0.2]], color: 0xf4f9ff, x: 0.22, y: -0.62, z: -0.7, size: 0.22, opacity: 0.95 },
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
  let dirty = true, disposed = false

  const scene = new THREE.Scene()
  // Satin surfaces share one standard material program (only uniforms differ).
  const satin = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.08, transparent: true, opacity: 0, side: THREE.DoubleSide, ...extra })
  const facetShape = outline => {
    const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.045, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 2, curveSegments: 1 })
    geometry.center()
    return geometry
  }

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80)
  camera.position.set(0, 0, START_Z)
  const hemi = new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.25)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xffffff, 2.1)
  key.position.set(3, 5, 6)
  const fill = new THREE.DirectionalLight(0xffffff, 0.7)
  fill.position.set(-4, 2, 5)
  const rim = new THREE.DirectionalLight(0xbfdbfe, 1.3)
  rim.position.set(-5, -2, -4)
  scene.add(key, fill, rim)

  const facets = FACETS.map((facet, i) => {
    const material = satin(facet.color, { emissive: facet.color, emissiveIntensity: 0.22 }) // keeps the light facets satin-white
    const mesh = new THREE.Mesh(facetShape(facet.outline), material)
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

  // The medallions: a porcelain disc with a blue rim and a thin pale-blue bezel; the seal is
  // drawn from the hero's own image onto a white face. Until it has loaded the face is white.
  const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
  blank.needsUpdate = true
  const discBody = new THREE.CylinderGeometry(1, 1, 0.16, 96, 1).rotateX(Math.PI / 2)
  const discFace = new THREE.CircleGeometry(0.9, 96)
  const discRim = new THREE.TorusGeometry(1, 0.055, 24, 160)
  const discBezel = new THREE.TorusGeometry(0.91, 0.012, 12, 160)
  const sealImages = [...(anchor?.querySelectorAll('.hero-seal img') || [])]
  const textures = []
  const medallions = SEALS.map((seal, i) => {
    const materials = {
      body: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.14, transparent: true, opacity: 0 }),
      face: new THREE.MeshStandardMaterial({ map: blank, roughness: 0.45, metalness: 0, transparent: true, opacity: 0 }),
      rim: satin(0x2563eb, { roughness: 0.2, metalness: 0.35 }),
      bezel: satin(0x93c5fd, { roughness: 0.3 }),
    }
    const face = new THREE.Mesh(discFace, materials.face)
    const bezel = new THREE.Mesh(discBezel, materials.bezel)
    face.position.z = 0.082
    bezel.position.z = 0.084
    const group = new THREE.Group()
    group.add(new THREE.Mesh(discBody, materials.body), face, new THREE.Mesh(discRim, materials.rim), bezel)
    group.visible = false
    scene.add(group)
    return { ...seal, group, materials, image: sealImages[i] }
  })

  function sealTexture(image) {
    const size = 512, face = document.createElement('canvas')
    face.width = face.height = size
    const context = face.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, size, size)
    const fit = size * 0.84, ratio = image.naturalWidth / image.naturalHeight || 1
    const w = ratio >= 1 ? fit : fit * ratio, h = ratio >= 1 ? fit / ratio : fit
    context.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
    const texture = new THREE.CanvasTexture(face)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    textures.push(texture)
    return texture
  }
  for (const medallion of medallions) {
    const image = medallion.image
    if (!image) continue
    const apply = () => {
      if (disposed || !image.naturalWidth) return
      medallion.materials.face.map = sealTexture(image)
      dirty = true
    }
    if (image.complete) apply()
    else image.addEventListener('load', apply, { once: true })
  }

  const planes = PLANES.map((plane, i) => {
    const material = satin(plane.color, { emissive: plane.color, emissiveIntensity: 0.2 })
    const mesh = new THREE.Mesh(facetShape(plane.outline), material)
    mesh.visible = false
    scene.add(mesh)
    return { ...plane, mesh, material, phase: i * 1.37, delay: 0.1 + i * 0.05 }
  })

  // Layout: canvas size, the facets' ellipse around the mark, and the emblem placed over the
  // hero's emblem box (projected for the resting camera). The flat emblem shows wherever the
  // box's centre is off the canvas.
  const view = { rx: 3, ry: 1.8, scale: 1, emblem: { on: false, x: 0, y: 0, size: 1 } }
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
      view.emblem = {
        on: true,
        x: (((target.left + target.width / 2 - box.left) / box.width) * 2 - 1) * h * camera.aspect,
        y: -(((centreY / box.height) * 2 - 1) * h),
        size: (target.width / box.height) * 2 * h, // the box's width in world units
      }
    } else view.emblem.on = false
    anchor?.toggleAttribute('data-drawn', view.emblem.on)
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
  const stage = { arrive: 0, tiltX: 0, tiltY: 0, exit: 0 }
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

    // The emblem. Its arrival, the stage's tilt towards the pointer and its retreat as the hero
    // scrolls away are all damped again here, so the motion stays slow and even whatever drives it.
    stage.arrive = damp(stage.arrive, hero, 2.4, dt)
    stage.tiltX = damp(stage.tiltX, pointer.y * 0.12, 1.6, dt)
    stage.tiltY = damp(stage.tiltY, pointer.x * 0.24, 1.6, dt)
    const top = canvas.getBoundingClientRect().top
    stage.exit = damp(stage.exit, clamp01(-top / Math.max(1, canvas.clientHeight)), 3, dt)
    const { on, x: ex, y: ey, size } = view.emblem
    const arrive = easeInOut(clamp01(stage.arrive))
    const back = stage.exit * size * 0.9
    // A slow sweep of the key light across the porcelain and the ring.
    key.position.set(3 + Math.cos(clock * 0.28) * 3.2, 5 - Math.sin(clock * 0.21) * 1.2, 6 + Math.sin(clock * 0.28) * 2)

    ring.visible = on && arrive > 0.01
    if (ring.visible) {
      ring.position.set(ex, ey, RING.z * size - back)
      ring.scale.setScalar(size * RING.radius * (0.84 + 0.16 * arrive))
      ring.rotation.set(0.42 + Math.sin(clock * 0.3) * 0.05 + stage.tiltX, -0.3 + stage.tiltY * 0.6 + Math.sin(clock * 0.19) * 0.08 + (1 - arrive) * 0.9, 0.1)
      pulse.rotation.z = clock * 0.5
      for (const material of ringMaterials) material.opacity = arrive
    }
    for (const medallion of medallions) {
      const t = easeInOut(clamp01((clamp01(stage.arrive) - medallion.delay) / (1 - medallion.delay)))
      medallion.group.visible = on && t > 0.01
      if (!medallion.group.visible) continue
      const float = Math.sin(clock * 0.6 + medallion.phase)
      medallion.group.position.set(ex + medallion.x * size, ey + (medallion.y + 0.012 * float) * size, (medallion.z - (1 - t) * 0.5) * size - back)
      medallion.group.rotation.set(
        0.05 * Math.sin(clock * 0.31 + medallion.phase) + stage.tiltX,
        medallion.turn + 0.16 * Math.sin(clock * 0.36 + medallion.phase) + stage.tiltY + (1 - t) * Math.PI * 0.5 * Math.sign(medallion.x),
        0,
      )
      medallion.group.scale.setScalar(size * medallion.radius * (0.92 + 0.08 * t))
      for (const material of Object.values(medallion.materials)) material.opacity = t
    }
    for (const plane of planes) {
      const t = easeOut(clamp01((clamp01(stage.arrive) - plane.delay) / (1 - plane.delay)))
      plane.mesh.visible = on && t > 0.01
      if (!plane.mesh.visible) continue
      const drift = Math.sin(clock * 0.24 + plane.phase)
      plane.mesh.position.set(ex + (plane.x + 0.015 * drift) * size, ey + (plane.y + 0.02 * Math.cos(clock * 0.2 + plane.phase)) * size, (plane.z - (1 - t) * 0.6) * size - back * 1.4)
      plane.mesh.rotation.set(0.35 * Math.sin(plane.phase) + stage.tiltX * 0.5, 0.3 * Math.cos(plane.phase) + stage.tiltY * 0.5, plane.phase + clock * 0.03)
      plane.mesh.scale.setScalar(size * plane.size * (0.85 + 0.15 * t))
      plane.material.opacity = plane.opacity * t
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

  // Night (dark mode): the pale rays and shards take the blues of a night sky; the strong blues keep
  // their colour so the shapes still sparkle.
  const NIGHT = new THREE.Color(0.12, 0.16, 0.3)
  function setNight(night) {
    scene.traverse(object => {
      const material = object.material
      if (!material?.isMeshStandardMaterial) return
      const day = material.userData.day ??= { color: material.color.clone(), emissive: material.emissive.clone() }
      if (day.color.getHSL({ h: 0, s: 0, l: 0 }).l < 0.85) return
      material.color.copy(day.color)
      material.emissive.copy(day.emissive)
      if (night) { material.color.multiply(NIGHT); material.emissive.multiply(NIGHT) }
    })
    hemi.color.set(night ? 0xa9bbff : 0xffffff)
    hemi.groundColor.set(night ? 0x0f1830 : 0xdbeafe)
    key.intensity = night ? 1.3 : 2.1
    rim.color.set(night ? 0x6f8fe0 : 0xbfdbfe)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    running = false
    cancelAnimationFrame(frame)
    seen.disconnect()
    sizes.disconnect()
    anchor?.removeAttribute('data-drawn')
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('load', onLoad)
    document.removeEventListener('visibilitychange', update)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    scene.traverse(object => object.geometry?.dispose())
    for (const facet of facets) facet.material.dispose()
    for (const material of ringMaterials) material.dispose()
    for (const medallion of medallions) for (const material of Object.values(medallion.materials)) material.dispose()
    for (const plane of planes) plane.material.dispose()
    for (const texture of [blank, ...textures]) texture.dispose()
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
  // Compile every material in parallel, then start drawing. Hidden objects are skipped by the
  // compiler, so everything is briefly marked visible for it.
  const drawn = [...facets.map(facet => facet.mesh), ring, ...medallions.map(medallion => medallion.group), ...planes.map(plane => plane.mesh)]
  for (const object of drawn) object.visible = true
  renderer.compileAsync(scene, camera).catch(() => undefined).then(() => {
    if (disposed) return
    for (const object of drawn) object.visible = false
    ready = true
    dirty = true
    update()
    onReady?.()
  })
  return { setNight, dispose }
}
