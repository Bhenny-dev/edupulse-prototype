import * as THREE from 'three'

// The seams' 3D shards: one fixed, transparent canvas over the page that draws only while a
// section is arriving. A band of shards rushes in along the arriving section's top edge (from
// the side, from the centre, from below, in a spiral or tile by tile), holds as a faceted seam
// and fractures apart, the half above the edge lifting away and the half below rushing past
// the camera, while the camera rolls, pushes in and pans. The shards are satin, porcelain and
// blue gloss with a brushed surface (a procedural texture drives their roughness and relief).
// Every movement is a function of the scroll, so a seam plays backwards as well as forwards.
// createSeamScene returns null without WebGL.

const FOV = 32
const CAM_Z = 12
const PALETTE = [0xffffff, 0xf4f9ff, 0xdbeafe, 0x93c5fd, 0x2563eb]
const OUTLINES = {
  tri: [[0, 0.6], [0.55, -0.34], [-0.52, -0.3]],
  diamond: [[0, 0.62], [0.4, 0], [0, -0.62], [-0.4, 0]],
  pentagon: [[0, 0.55], [0.52, 0.17], [0.32, -0.45], [-0.32, -0.45], [-0.52, 0.17]],
  hex: [[0.5, 0], [0.25, 0.43], [-0.25, 0.43], [-0.5, 0], [-0.25, -0.43], [0.25, -0.43]],
}
const clamp01 = value => Math.min(1, Math.max(0, value))
const easeOut = t => 1 - (1 - t) ** 3
const easeInOut = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const halfHeight = distance => Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * distance

// A small seeded generator, so the shards and the texture are the same on every visit.
function random(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Brushed satin: fine horizontal strokes and a little grain, used as roughness and relief.
function brushedTexture() {
  const size = 256, rand = random(7), surface = document.createElement('canvas')
  surface.width = surface.height = size
  const context = surface.getContext('2d')
  context.fillStyle = '#d8d8d8'
  context.fillRect(0, 0, size, size)
  for (let i = 0; i < 700; i++) {
    const y = rand() * size, shade = Math.round(150 + rand() * 105)
    context.strokeStyle = `rgb(${shade} ${shade} ${shade} / 0.5)`
    context.lineWidth = 0.4 + rand() * 1.3
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(size, y + (rand() - 0.5) * 7)
    context.stroke()
  }
  for (let i = 0; i < 1800; i++) {
    const shade = Math.round(120 + rand() * 135)
    context.fillStyle = `rgb(${shade} ${shade} ${shade} / 0.4)`
    context.fillRect(rand() * size, rand() * size, 1, 1)
  }
  const texture = new THREE.CanvasTexture(surface)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.6, 1.6)
  return texture
}

export function createSeamScene({ canvas, seams }) {
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
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80)
  camera.position.set(0, 0, CAM_Z)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.3))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(4, 6, 8)
  const rim = new THREE.DirectionalLight(0xbfdbfe, 1.2)
  rim.position.set(-6, -3, -4)
  scene.add(key, rim)

  const grain = brushedTexture()
  const extrude = outline => {
    const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.018, bevelSegments: 2, curveSegments: 1 })
    geometry.center()
    return geometry
  }
  const geometries = {
    tri: extrude(OUTLINES.tri),
    diamond: extrude(OUTLINES.diamond),
    pentagon: extrude(OUTLINES.pentagon),
    hex: extrude(OUTLINES.hex),
    ring: new THREE.TorusGeometry(0.42, 0.075, 16, 56, Math.PI * 1.15),
    tile: new THREE.BoxGeometry(0.84, 0.84, 0.07),
    prism: new THREE.CylinderGeometry(0.34, 0.34, 0.86, 3, 1),
  }

  const compact = () => window.innerWidth < 760
  const COUNT = 18
  const rand = random(42)
  const shards = Array.from({ length: COUNT }, (_, i) => {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.06, roughnessMap: grain, bumpMap: grain, bumpScale: 0.6, transparent: true, opacity: 0, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geometries.tri, material)
    mesh.visible = false
    scene.add(mesh)
    const sign = i % 2 ? -1 : 1
    return {
      mesh, material,
      u: -1 + (2 * (i + 0.5)) / COUNT + (rand() - 0.5) * 0.06, // place along the edge, left to right
      j: (rand() * 2 - 1) * (i % 3 === 0 ? 0.45 : 1), // above (+) or below (-) the edge
      z: (rand() - 0.5) * 2.4,
      size: 0.38 + rand() * 0.42,
      tilt: new THREE.Vector3((rand() - 0.5) * 0.9, (rand() - 0.5) * 0.9, rand() * Math.PI * 2),
      spin: new THREE.Vector3((1 + rand()) * sign, (0.8 + rand()) * -sign, (1.2 + rand()) * sign),
      tone: rand(),
    }
  })

  // Shapes and colours change with the seam: mostly white and pale blue, a little blue.
  let dressed = null
  function dress(seam) {
    if (dressed === seam) return
    dressed = seam
    shards.forEach((shard, i) => {
      shard.mesh.geometry = geometries[seam.shapes[i % seam.shapes.length]] || geometries.tri
      const tone = shard.tone < 0.34 ? 0 : shard.tone < 0.58 ? 1 : shard.tone < 0.78 ? 2 : shard.tone < 0.9 ? 3 : 4
      shard.material.color.setHex(PALETTE[tone])
      shard.material.roughness = tone === 4 ? 0.22 : 0.42
      shard.material.metalness = tone === 4 ? 0.3 : 0.06
      shard.material.emissive.setHex(PALETTE[tone])
      shard.material.emissiveIntensity = tone < 3 ? 0.16 : 0.05
    })
  }

  function layout() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact() ? 1.25 : 1.5))
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight)
    camera.updateProjectionMatrix()
    clearNext = true
  }

  let frame = 0, running = false, disposed = false, clearNext = true

  // The seam on screen: the one furthest into its passage (sections can be short).
  function activeSeam() {
    let best = null, weight = 0
    for (const seam of seams) {
      const w = seam.progress > 0 && seam.progress < 1 ? Math.sin(seam.progress * Math.PI) : 0
      if (w > weight) { weight = w; best = seam }
    }
    return best
  }

  function tick() {
    frame = 0
    if (disposed) return
    const seam = activeSeam()
    if (!seam) {
      running = false
      for (const shard of shards) shard.mesh.visible = false
      canvas.removeAttribute('data-seam')
      if (clearNext) { renderer.clear(); clearNext = false }
      return
    }
    frame = requestAnimationFrame(tick)
    clearNext = true
    dress(seam)
    canvas.dataset.seam = seam.id
    const p = seam.progress, wave = Math.sin(p * Math.PI)
    const halfH = halfHeight(CAM_Z), halfW = halfH * camera.aspect
    const top = seam.element.getBoundingClientRect().top
    const line = -((top / window.innerHeight) * 2 - 1) * halfH // the section's top edge, in the scene
    const scale = compact() ? 0.62 : 1

    // The camera rolls, pushes in and pans across the seam, and settles again.
    camera.position.set(seam.pan * (p - 0.5) * 2, line * 0.06, CAM_Z - seam.dolly * wave)
    camera.lookAt(seam.pan * (p - 0.5) * 0.6, line * 0.04, 0)
    camera.rotateZ(seam.roll * wave)

    for (const shard of shards) {
      const { mesh, material, u, j } = shard
      const order = seam.from === 'left' ? (u + 1) / 2 : seam.from === 'right' ? (1 - u) / 2 : seam.from === 'line' ? (u + 1) / 2 : Math.abs(u)
      const delay = order * 0.14
      const enter = easeOut(clamp01((p - delay) / 0.36))
      const leave = easeInOut(clamp01((p - 0.56 - delay * 0.5) / 0.34))
      const opacity = enter * (1 - leave) ** 1.6
      mesh.visible = opacity > 0.01
      if (!mesh.visible) continue
      const away = 1 - enter
      let x = u * halfW * 1.02, y = line + j * 0.62 * scale, z = shard.z
      if (seam.from === 'left') { x -= away * halfW * 1.5; z -= away * 2 }
      else if (seam.from === 'right') { x += away * halfW * 1.5; z -= away * 2 }
      else if (seam.from === 'centre') { x *= enter; y = line + (y - line) * enter; z -= away * 7 }
      else if (seam.from === 'below') { y -= away * halfH * 1.3; z += away * 1.5 }
      else if (seam.from === 'spiral') {
        // A flattened spiral: the band turns about its centre in depth, staying near the edge.
        const angle = away * Math.PI * 2.2, radius = enter
        const dx = x * radius, dy = (y - line) * radius
        x = dx * Math.cos(angle) - dy * Math.sin(angle)
        y = line + (dx * Math.sin(angle) + dy * Math.cos(angle)) * 0.22
        z -= away * 3 + Math.sin(angle) * 1.2
      }
      // The fracture: above the edge lifts and falls back, below rushes past the camera.
      const side = j >= 0 ? 1 : -1
      x += Math.sign(u || 1) * halfW * 0.28 * leave
      y += side * halfH * 0.6 * leave
      z += (side > 0 ? -2.6 : 2.4) * leave
      mesh.position.set(x, y, z)
      const flip = seam.from === 'line' ? (1 - enter) * Math.PI * 0.5 : 0
      mesh.rotation.set(
        shard.tilt.x + shard.spin.x * (away * 1.6 + leave * 1.2) + flip,
        shard.tilt.y + shard.spin.y * (away * 1.6 + leave * 1.2),
        shard.tilt.z + shard.spin.z * (away + leave) * 0.8,
      )
      mesh.scale.setScalar(shard.size * scale * (0.55 + 0.45 * enter))
      material.opacity = opacity
    }
    renderer.render(scene, camera)
  }

  const wake = () => {
    if (disposed || running) return
    running = true
    frame = requestAnimationFrame(tick)
  }
  const sizes = new ResizeObserver(() => { layout(); wake() })
  const onContextLost = event => { event.preventDefault(); dispose() }

  function dispose() {
    if (disposed) return
    disposed = true
    if (frame) cancelAnimationFrame(frame)
    sizes.disconnect()
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.removeAttribute('data-seam')
    for (const geometry of Object.values(geometries)) geometry.dispose()
    for (const shard of shards) shard.material.dispose()
    grain.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  canvas.addEventListener('webglcontextlost', onContextLost)
  sizes.observe(canvas)
  layout()
  // Compile the shards' material program before the first seam, so the first one never stutters.
  for (const shard of shards) shard.mesh.visible = true
  renderer.compileAsync(scene, camera).catch(() => undefined).then(() => {
    for (const shard of shards) shard.mesh.visible = false
    if (!disposed) wake()
  })
  return { wake, dispose }
}
