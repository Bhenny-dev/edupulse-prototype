import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// The pieces that build a card as it arrives (seams.js decides which cards and how far along
// each one is). One fixed, transparent canvas over the page, drawn only while a card is being
// built. For each card, faceted pieces cut from its own outline (triangles, fans, slats or
// tiles) travel in from the section's side as glowing wireframe and fill with the section's
// material under a studio light: brushed aluminium, iridescent glass, anodized blue, glazed
// ceramic, or a circuit board with glowing traces. The cluster swings in like a camera settling
// on the card, a blue frame locks onto the card's corners, and the pieces meet edge to edge
// exactly over the card, flash along their seams, cool into the card's own surface and dissolve
// as the card appears under them. Everything is a function of the card's progress, so it plays
// backwards as well. createSeamScene returns null without WebGL.

const FOV = 30
const CAM_Z = 14
const DEPTH = 0.07 // the pieces' thickness, in scene units

const FINISHES = {
  aluminium: { color: 0xdfe6ee, metalness: 1, roughness: 0.32, clearcoat: 0.001, iridescence: 0.001, glow: 0, env: 1.2, alpha: 1, brushed: true },
  glass: { color: 0xd6e8ff, metalness: 0.1, roughness: 0.03, clearcoat: 1, iridescence: 1, glow: 0, env: 2, alpha: 0.78 },
  anodized: { color: 0x2563eb, metalness: 0.82, roughness: 0.28, clearcoat: 0.7, iridescence: 0.001, glow: 0, env: 1.1, alpha: 1, brushed: true },
  ceramic: { color: 0xffffff, metalness: 0, roughness: 0.14, clearcoat: 1, iridescence: 0.001, glow: 0, env: 1, alpha: 1 },
  circuit: { color: 0x1e40af, metalness: 0.5, roughness: 0.36, clearcoat: 0.5, iridescence: 0.001, glow: 2.4, env: 0.9, alpha: 1, traces: true },
}
const TRACE_GLOW = 0x7cb8ff

// Each cut splits a cell (x and y from -0.5 to 0.5, y up) into pieces.
const CUTS = {
  tri: (col, row) => ((col + row) % 2
    ? [[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]], [[0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]]
    : [[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5]], [[-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]]),
  fan: () => [
    [[-0.5, 0.5], [0, 0], [0.5, 0.5]], [[0.5, 0.5], [0, 0], [0.5, -0.5]],
    [[0.5, -0.5], [0, 0], [-0.5, -0.5]], [[-0.5, -0.5], [0, 0], [-0.5, 0.5]],
  ],
  slat: () => [[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]],
  grid: () => [[[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]],
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
const clamp01 = value => clamp(value, 0, 1)
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (edge0, edge1, value) => { const t = clamp01((value - edge0) / (edge1 - edge0)); return t * t * (3 - 2 * t) }
const easeInOut = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

// A small seeded generator, so the pieces and textures are the same on every visit.
function random(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvasTexture(size, paint) {
  const surface = document.createElement('canvas')
  surface.width = surface.height = size
  paint(surface.getContext('2d'), size)
  const texture = new THREE.CanvasTexture(surface)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  return texture
}

// Brushed metal: fine horizontal strokes and a little grain, used as roughness.
const brushedTexture = () => canvasTexture(256, (context, size) => {
  const rand = random(7)
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
})

// Circuit traces on black, used as the glow map: right-angled runs ending in pads.
const tracesTexture = () => canvasTexture(256, (context, size) => {
  const rand = random(11)
  context.fillStyle = '#000000'
  context.fillRect(0, 0, size, size)
  context.strokeStyle = context.fillStyle = '#ffffff'
  context.lineCap = context.lineJoin = 'round'
  for (let i = 0; i < 24; i++) {
    let x = Math.round(rand() * 15) * 16 + 8, y = Math.round(rand() * 15) * 16 + 8
    context.lineWidth = rand() < 0.3 ? 3 : 1.5
    context.beginPath()
    context.moveTo(x, y)
    for (let step = 0; step < 4; step++) {
      const run = 16 * (1 + Math.floor(rand() * 3)), turn = Math.floor(rand() * 3)
      if (turn === 0) x += run
      else if (turn === 1) y += run
      else { x += run * 0.7; y += run * 0.7 }
      context.lineTo(x, y)
    }
    context.stroke()
    context.beginPath()
    context.arc(x, y, 3.4, 0, Math.PI * 2)
    context.fill()
  }
})

const pixel = value => {
  const texture = new THREE.DataTexture(new Uint8Array([value, value, value, 255]), 1, 1)
  texture.needsUpdate = true
  return texture
}

export function createSeamScene({ canvas }) {
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
  // A studio environment for real reflections on metal, glass and glaze; it turns slowly, so
  // light travels across the pieces as they move.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const studio = new RoomEnvironment()
  scene.environment = pmrem.fromScene(studio, 0.04).texture
  studio.dispose?.()
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 0.55))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(4, 6, 8)
  scene.add(key)

  const textures = { brushed: brushedTexture(), traces: tracesTexture(), white: pixel(255) }
  const shapes = new Map()
  function shapeOf(points) {
    const id = points.join(';')
    if (shapes.has(id)) return shapes.get(id)
    const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length
    const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length
    const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 1, bevelEnabled: false, curveSegments: 1 })
    geometry.translate(-cx, -cy, -0.5)
    const shape = { geometry, edges: new THREE.EdgesGeometry(geometry, 1), centroid: { x: cx, y: cy } }
    shapes.set(id, shape)
    return shape
  }
  const armGeometry = new THREE.BoxGeometry(1, 1, 1)

  const pieceMaterial = () => new THREE.MeshPhysicalMaterial({
    roughnessMap: textures.white, emissiveMap: textures.white, clearcoat: 0.001, iridescence: 0.001,
    iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 420], transparent: true, opacity: 0,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  })
  const wireMaterial = () => new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0, depthWrite: false })

  const compact = () => canvas.clientWidth < 760
  let viewW = 1, viewH = 1, halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z, halfW = halfH
  function layout() {
    viewW = Math.max(1, canvas.clientWidth)
    viewH = Math.max(1, canvas.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact() ? 1.25 : 1.5))
    renderer.setSize(viewW, viewH, false)
    camera.aspect = viewW / viewH
    camera.updateProjectionMatrix()
    halfW = halfH * camera.aspect
  }

  // One cluster of pieces per card, built the first time the card arrives.
  const clusters = new Map()
  let seed = 1
  function build(block) {
    const { seam, rect } = block
    const cut = CUTS[seam.cut] ? seam.cut : 'grid'
    let rows, cols
    if (cut === 'slat') { rows = 1; cols = clamp(Math.round(rect.width / (compact() ? 72 : 100)), 3, 9) }
    else {
      rows = rect.height > 300 ? 2 : 1
      cols = clamp(Math.round((rect.width / Math.max(1, rect.height)) * rows), 1, cut === 'fan' ? 3 : 4)
      if (cut === 'fan' && rows * cols > 4) rows = 1
    }
    const rand = random(seed++ * 977)
    const finishes = seam.finishes?.length ? seam.finishes : ['ceramic']
    const group = new THREE.Group()
    scene.add(group)
    const pieces = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = CUTS[cut](c, r)
        cell.forEach((points, k) => {
          const shape = shapeOf(points)
          const finish = FINISHES[finishes[rand() < 0.66 ? 0 : 1] || finishes[0]] || FINISHES.ceramic
          const material = pieceMaterial()
          material.roughnessMap = finish.brushed ? textures.brushed : textures.white
          material.emissiveMap = finish.traces ? textures.traces : textures.white
          const mesh = new THREE.Mesh(shape.geometry, material)
          const wire = new THREE.LineSegments(shape.edges, wireMaterial())
          mesh.add(wire)
          mesh.visible = false
          group.add(mesh)
          const across = (c + 0.5 + shape.centroid.x * 0.9) / cols, down = (r + 0.5 - shape.centroid.y * 0.9) / rows
          const order = {
            left: across, right: 1 - across, below: 1 - down, line: across,
            centre: Math.min(1, Math.hypot(across - 0.5, down - 0.5) * 1.6),
            spiral: (r * cols * cell.length + c * cell.length + k) / Math.max(1, rows * cols * cell.length - 1),
          }[seam.from] ?? across
          pieces.push({
            mesh, wire, material, finish, base: new THREE.Color(finish.color), c, r, centroid: shape.centroid,
            delay: order * 0.14 + rand() * 0.03, reach: rand(), drift: rand() - 0.5, depth: rand(), flip: rand() < 0.5 ? 1 : -1,
            tilt: new THREE.Vector3((rand() - 0.5) * 1.4, (rand() - 0.5) * 1.4, (rand() - 0.5) * 1.8),
            spin: new THREE.Vector3((1 + rand()) * (rand() < 0.5 ? 1 : -1), (1 + rand()) * (rand() < 0.5 ? 1 : -1), (1 + rand()) * (rand() < 0.5 ? 1 : -1)),
          })
        })
      }
    }
    // The frame that locks onto the card's corners: two arms per corner.
    const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0, depthTest: false, depthWrite: false })
    const arms = Array.from({ length: 8 }, () => {
      const arm = new THREE.Mesh(armGeometry, frameMaterial)
      arm.visible = false
      arm.renderOrder = 10
      scene.add(arm)
      return arm
    })
    let surface = new THREE.Color(0xffffff)
    try { surface = new THREE.Color().setStyle(block.surface || '#ffffff') } catch { /* keep white */ }
    const cluster = { group, pieces, arms, frameMaterial, rows, cols, surface, used: 0 }
    clusters.set(block, cluster)
    return cluster
  }

  function hide(cluster) {
    cluster.group.visible = false
    for (const arm of cluster.arms) arm.visible = false
  }

  function release(block, cluster) {
    for (const piece of cluster.pieces) { piece.material.dispose(); piece.wire.material.dispose() }
    cluster.frameMaterial.dispose()
    scene.remove(cluster.group)
    for (const arm of cluster.arms) scene.remove(arm)
    clusters.delete(block)
  }

  function update(block, cluster) {
    const { p, rect, seam } = block
    const unit = (2 * halfH) / viewH // scene units per CSS pixel
    const W = rect.width * unit, H = rect.height * unit
    const cx = (rect.left + rect.width / 2 - viewW / 2) * unit
    const cy = (viewH / 2 - (rect.top + rect.height / 2)) * unit
    const cellW = W / cluster.cols, cellH = H / cluster.rows, gap = 3 * unit

    // The cluster swings in like a camera settling on the card, and rests by the time it lands.
    const rest = 1 - easeInOut(clamp01(p / 0.6))
    cluster.group.visible = true
    cluster.group.position.set(cx, cy, -(seam.dolly ?? 2) * rest)
    cluster.group.rotation.set(0.2 * rest * Math.sign(seam.pan || 1), (seam.pan ?? 0) * 0.6 * rest, (seam.roll ?? 0) * rest)

    const outline = smooth(0, 0.1, p) * (1 - smooth(0.34, 0.6, p)) // wireframe first
    const lock = smooth(0.5, 0.58, p) * (1 - smooth(0.58, 0.72, p)) // the seams flash as the pieces meet
    const solid = smooth(0.04, 0.3, p) // the material fills in
    const cool = smooth(0.52, 0.7, p) // and cools into the card's surface
    const dissolve = smooth(0.66, 0.86, p) // as the card appears under it
    const from = seam.from

    for (const piece of cluster.pieces) {
      const f = easeInOut(clamp01((p - piece.delay) / 0.5)), away = 1 - f
      const lx = -W / 2 + (piece.c + 0.5) * cellW + piece.centroid.x * cellW
      const ly = H / 2 - (piece.r + 0.5) * cellH + piece.centroid.y * cellH
      let x = lx, y = ly, z = 0
      // The pieces start close to the card (within about a card's size) and far in depth, so the
      // whole flight plays where the reader is looking.
      if (from === 'left' || from === 'right') {
        const side = from === 'left' ? -1 : 1
        x = lx + side * away * (W * (0.7 + 0.5 * piece.reach) + 1)
        y = ly + away * piece.drift * H * 0.9
        z = -away * (3 + piece.depth * 4)
      } else if (from === 'below') {
        x = lx + away * piece.drift * W * 0.7
        y = ly - away * (H * (0.7 + 0.5 * piece.reach) + 0.6)
        z = -away * (2.5 + piece.depth * 3)
      } else if (from === 'centre') {
        const spread = 0.12 + 0.88 * f
        x = lx * spread
        y = ly * spread
        z = -away * (7 + piece.depth * 5)
      } else if (from === 'spiral') {
        const angle = away * Math.PI * 2.2, radius = 0.2 + 0.8 * f
        x = (lx * Math.cos(angle) - ly * Math.sin(angle)) * radius
        y = (lx * Math.sin(angle) + ly * Math.cos(angle)) * radius
        z = -away * (4 + piece.depth * 3)
      } else {
        z = -away * 1.4 // line: each piece turns into place where it stands
      }
      piece.mesh.position.set(x, y, z)
      if (from === 'line') {
        const turn = away * Math.PI * 0.5 * piece.flip
        piece.mesh.rotation.set(seam.cut === 'slat' ? 0 : turn, seam.cut === 'slat' ? turn : 0, 0)
      } else {
        const spin = away * away
        piece.mesh.rotation.set(
          piece.tilt.x * away + piece.spin.x * spin,
          piece.tilt.y * away + piece.spin.y * spin,
          piece.tilt.z * away + piece.spin.z * spin * 0.6,
        )
      }
      const grow = from === 'line' ? 1 : 0.55 + 0.45 * f
      piece.mesh.scale.set(Math.max(0.001, cellW - gap) * grow, Math.max(0.001, cellH - gap) * grow, DEPTH)

      const { material, finish } = piece
      material.color.copy(piece.base).lerp(cluster.surface, cool)
      material.metalness = lerp(finish.metalness, 0, cool)
      material.roughness = lerp(finish.roughness, 0.6, cool)
      material.clearcoat = Math.max(0.001, lerp(finish.clearcoat, 0.001, cool))
      material.iridescence = Math.max(0.001, lerp(finish.iridescence, 0.001, cool))
      material.envMapIntensity = lerp(finish.env, 0.9, cool)
      if (finish.traces) {
        material.emissive.setHex(TRACE_GLOW)
        material.emissiveIntensity = finish.glow * (1 - cool) * (0.75 + 0.6 * lock)
      } else {
        material.emissive.copy(cluster.surface) // a cooled piece is as bright as the card under it
        material.emissiveIntensity = 0.42 * cool
      }
      material.opacity = solid * lerp(finish.alpha, 1, cool) * (1 - dissolve)
      material.depthWrite = material.opacity > 0.35
      const edge = Math.max(outline, lock * 0.95) * (1 - dissolve)
      piece.wire.material.opacity = edge
      piece.mesh.visible = material.opacity > 0.004 || edge > 0.004
    }

    // The frame: it closes in from just outside the card, holds while the pieces meet, then fades.
    const frame = smooth(0.3, 0.46, p) * (1 - smooth(0.68, 0.84, p))
    cluster.frameMaterial.opacity = frame * 0.95
    const spread = (1 - smooth(0.3, 0.56, p)) * 18 * unit
    const thick = 2 * unit, length = clamp(Math.min(rect.width, rect.height) * 0.14, 12, 28) * unit
    const cornersX = [-1, 1, 1, -1], cornersY = [1, 1, -1, -1]
    for (let i = 0; i < 4; i++) {
      const sx = cornersX[i], sy = cornersY[i]
      const x = cx + sx * (W / 2 + spread), y = cy + sy * (H / 2 + spread)
      const across = cluster.arms[i * 2], down = cluster.arms[i * 2 + 1]
      across.position.set(x - (sx * length) / 2, y - (sy * thick) / 2, 0.3)
      across.scale.set(length, thick, thick)
      down.position.set(x - (sx * thick) / 2, y - (sy * length) / 2, 0.3)
      down.scale.set(thick, length, thick)
      across.visible = down.visible = frame > 0.004
    }
  }

  let drawn = false, disposed = false
  function render(blocks) {
    if (disposed) return
    const now = performance.now()
    for (const cluster of clusters.values()) cluster.live = false
    for (const block of blocks) {
      const cluster = clusters.get(block) || build(block)
      cluster.live = true
      cluster.used = now
      update(block, cluster)
    }
    for (const [block, cluster] of clusters) {
      if (cluster.live) continue
      hide(cluster)
      if (now - cluster.used > 4000) release(block, cluster)
    }
    if (blocks.length) {
      scene.environmentRotation.y = now * 0.00016
      key.position.set(4 * Math.cos(now * 0.0004), 6, 8)
      renderer.render(scene, camera)
      canvas.dataset.building = String(blocks.length) // how many cards are being built
      drawn = true
    } else if (drawn) {
      renderer.clear()
      delete canvas.dataset.building
      drawn = false
    }
  }

  const sizes = new ResizeObserver(layout)
  const onContextLost = event => { event.preventDefault(); dispose() }
  function dispose() {
    if (disposed) return
    disposed = true
    sizes.disconnect()
    canvas.removeEventListener('webglcontextlost', onContextLost)
    delete canvas.dataset.building
    for (const [block, cluster] of [...clusters]) release(block, cluster)
    for (const shape of shapes.values()) { shape.geometry.dispose(); shape.edges.dispose() }
    armGeometry.dispose()
    for (const texture of Object.values(textures)) texture.dispose()
    scene.environment?.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  canvas.addEventListener('webglcontextlost', onContextLost)
  sizes.observe(canvas)
  layout()
  // Compile the pieces' programs before the first card, so the first one never stutters.
  const warm = new THREE.Mesh(shapeOf(CUTS.grid()[0]).geometry, pieceMaterial())
  warm.add(new THREE.LineSegments(shapeOf(CUTS.grid()[0]).edges, wireMaterial()))
  const warmArm = new THREE.Mesh(armGeometry, new THREE.MeshBasicMaterial({ transparent: true, depthTest: false }))
  scene.add(warm, warmArm)
  renderer.compileAsync(scene, camera).catch(() => undefined).then(() => {
    scene.remove(warm, warmArm)
    warm.material.dispose()
    warm.children[0].material.dispose()
    warmArm.material.dispose()
  })
  return { render, dispose }
}
