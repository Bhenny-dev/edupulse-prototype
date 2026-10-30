import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { AGENT_COLORS } from '../agentLook.js'

// The agent workspace: a cosy studio where Pulse's nine agents work, drawn like the portraits
// in the agents scope (white toy robots, face screens, ears and antenna in each agent's colour).
// It grows from the in-app office (components/pulse/office): an open dollhouse room, articulated
// figures that sit, stand, walk and wave, mugs that steam. Each agent works at its own station
// (typing, drawing on the whiteboard, reading, comparing two papers, watching the door). A tap
// on a figure (generous invisible hit volumes) picks it: the page writes the conversation; the
// figure stands, turns to the camera and waves, and the camera glides in. A request flies from
// agent to agent as a paper plane with a trail, the camera following it. When the section first
// appears the room assembles itself: the floor settles, the walls rise, the furniture drops in
// and the agents hop to their places. Static furniture is merged per material (few draw calls);
// one renderer, rendering only on screen in a visible tab and only while something moves. With
// `still` (reduced motion, or the page's pause control) nothing idles and every change jumps.
// createWorkspaceScene returns null without WebGL.

const FOV = 32
const VIEW = { az: 0.78, el: 0.5 } // the overview angles (radians)
const HOME = new THREE.Vector3(0.5, 0.85, -0.4) // the room's framing centre: the Comparator on the sofa
const DOOR = new THREE.Vector3(8.6, 2.3, 2.6) // requests fly in through the doorway
const damp = (from, to, lambda, dt) => from + (to - from) * (1 - Math.exp(-lambda * dt))
const dampAngle = (from, to, lambda, dt) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * (1 - Math.exp(-lambda * dt))
const clamp01 = value => Math.min(1, Math.max(0, value))
const easeInOut = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutBack = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
const lerp = (a, b, t) => a + (b - a) * t

// Where each agent works: position, facing (0 faces the camera side, PI the back wall), what it
// does there, the seat height when seated, and where it steps to when it stands up to talk.
const STATIONS = {
  guardian: { x: 5.1, z: 1.75, yaw: Math.PI / 2, pose: 'podium', step: [-0.1, 0.35] },
  planner: { x: 3.55, z: -4.4, yaw: Math.PI, pose: 'board', step: [0, 0.85] },
  researcher: { x: 0.35, z: -3.05, yaw: Math.PI, pose: 'desk', seat: 0.47, step: [0.82, 0.25] },
  librarian: { x: -5.45, z: -2.05, yaw: Math.PI / 2, pose: 'read', seat: 0.42, step: [0.75, 0.15] },
  ranker: { x: -2.85, z: -3.05, yaw: Math.PI, pose: 'desk', seat: 0.47, step: [0.82, 0.25] },
  comparator: { x: 0.55, z: -0.42, yaw: 0, pose: 'sofa', seat: 0.42, step: [0, 0.72] },
  writer: { x: -4.3, z: 2.5, yaw: 0, pose: 'desk', seat: 0.47, step: [0.85, -0.05] },
  verifier: { x: -0.65, z: 2.75, yaw: 0, pose: 'desk', seat: 0.47, step: [-0.82, -0.05] },
  corrector: { x: 1.75, z: 2.75, yaw: 0, pose: 'desk', seat: 0.47, step: [0.82, -0.05] },
}

export function createWorkspaceScene({ canvas, stage, order, labels = {}, bubble, still: startStill = false, onPick, onHover, onReady, onLost }) {
  const probe = document.createElement('canvas')
  const probeContext = probe.getContext('webgl2') || probe.getContext('webgl')
  if (!probeContext) return null
  probeContext.getExtension('WEBGL_lose_context')?.loseContext()
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
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const studio = new RoomEnvironment()
  const environment = pmrem.fromScene(studio, 0.04).texture
  studio.dispose?.()
  pmrem.dispose()
  scene.environment = environment
  scene.environmentIntensity = 0.36

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 160)
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0xd6bd9a, 0.62))
  const sun = new THREE.DirectionalLight(0xffe6c4, 3.2)
  sun.position.set(-4.5, 11, 7.5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 34 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 4
  scene.add(sun)

  // Registries for disposal.
  const geometries = new Set(), materials = new Set(), textures = new Set()
  const mat = (color, extra = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra })
    materials.add(material)
    return material
  }
  const put = (geometry, material, parent, x = 0, y = 0, z = 0, cast = true) => {
    geometries.add(geometry)
    const item = new THREE.Mesh(geometry, material)
    item.position.set(x, y, z)
    item.castShadow = cast
    item.receiveShadow = true
    parent.add(item)
    return item
  }
  const box = (parent, w, h, d, x, y, z, material, r = 0, cast = true) => put(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), material, parent, x, y, z, cast)
  const cyl = (parent, rt, rb, h, x, y, z, material, seg = 20, cast = true) => put(new THREE.CylinderGeometry(rt, rb, h, seg), material, parent, x, y, z, cast)
  const ball = (parent, r, x, y, z, material, sx = 1, sy = 1, sz = 1, cast = true) => {
    const item = put(new THREE.SphereGeometry(r, 18, 12), material, parent, x, y, z, cast)
    item.scale.set(sx, sy, sz)
    return item
  }
  const live = item => { item.userData.live = true; return item }
  const paint = (w, h, draw, repeat) => {
    const surface = document.createElement('canvas')
    surface.width = w
    surface.height = h
    draw(surface.getContext('2d'), w, h)
    const texture = new THREE.CanvasTexture(surface)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat) }
    textures.add(texture)
    return texture
  }

  // Textures, painted once.
  const planks = paint(512, 512, (g, w, h) => {
    g.fillStyle = '#b98d5e'
    g.fillRect(0, 0, w, h)
    const rows = 16, rh = h / rows
    for (let r = 0; r < rows; r++) {
      let x = -((r * 97) % 200)
      while (x < w) {
        const length = 170 + ((r * 31 + Math.abs(x)) % 5) * 34
        const shade = ((r * 7 + Math.floor(Math.abs(x) / 41)) % 5) * 5
        g.fillStyle = `rgb(${226 - shade}, ${189 - shade}, ${142 - shade})`
        g.fillRect(x + 1, r * rh + 1, length - 2, rh - 2)
        g.strokeStyle = 'rgba(120, 78, 40, 0.14)'
        g.beginPath()
        g.moveTo(x + 6, r * rh + rh / 2)
        g.bezierCurveTo(x + length * 0.3, r * rh + rh / 2 + 3, x + length * 0.6, r * rh + rh / 2 - 3, x + length - 6, r * rh + rh / 2)
        g.stroke()
        x += length
      }
    }
  }, [3, 2.2])
  const rugTexture = paint(256, 256, (g, w, h) => {
    g.fillStyle = '#dbe6f8'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 12
    g.strokeRect(16, 16, w - 32, h - 32)
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#c8daf6' : '#eaf1fd'; g.fillRect(44, 44 + i * 24, w - 88, 12) }
  })
  const screenTexture = paint(256, 512, (g, w, h) => {
    g.fillStyle = '#0f1d38'
    g.fillRect(0, 0, w, h)
    for (let y = 12, i = 0; y < h; y += 18, i++) {
      g.fillStyle = i % 6 === 0 ? '#60a5fa' : i % 4 === 0 ? '#5eead4' : 'rgba(191, 219, 254, 0.5)'
      g.fillRect(16 + ((i * 13) % 34), y, 40 + ((i * 53) % 150), 7)
    }
  }, [1, 0.45])
  const skyTexture = paint(128, 128, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#b9d6fb')
    sky.addColorStop(1, '#f2f8ff')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(255, 255, 255, 0.85)'
    for (const [x, y, r] of [[30, 40, 15], [46, 34, 19], [63, 42, 13], [92, 82, 11], [104, 76, 15], [116, 84, 10]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
    g.fillStyle = '#a7d3a1'
    g.fillRect(0, h - 18, w, 18)
  })
  const boardTexture = paint(256, 160, (g, w, h) => {
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, w, h)
    g.lineWidth = 4
    g.lineCap = 'round'
    g.strokeStyle = '#2563eb'
    g.strokeRect(20, 22, 60, 38)
    g.strokeRect(150, 22, 74, 38)
    g.strokeRect(84, 100, 74, 38)
    g.beginPath()
    g.moveTo(82, 41); g.lineTo(146, 41); g.moveTo(186, 62); g.lineTo(152, 98); g.moveTo(50, 62); g.lineTo(86, 98)
    g.stroke()
    g.strokeStyle = '#f59e0b'
    g.beginPath(); g.arc(214, 124, 15, 0, Math.PI * 2); g.stroke()
  })
  const posterTexture = paint(128, 160, (g, w, h) => {
    g.fillStyle = '#eef4ff'
    g.fillRect(0, 0, w, h)
    for (const [x, y, r, c] of [[44, 58, 30, '#93c5fd'], [84, 92, 24, '#fbbf24'], [52, 118, 16, '#2563eb']]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
  })
  const shaftTexture = paint(64, 256, (g, w, h) => {
    const light = g.createLinearGradient(0, 0, 0, h)
    light.addColorStop(0, 'rgba(255, 246, 225, 0.85)')
    light.addColorStop(1, 'rgba(255, 246, 225, 0)')
    g.fillStyle = light
    g.fillRect(0, 0, w, h)
  })

  const M = {
    floor: mat(0xffffff, { map: planks, roughness: 0.72 }),
    wall: mat(0xe4ecf7, { roughness: 0.95 }),
    wallWarm: mat(0xf8f1e7, { roughness: 0.95 }),
    fairy: mat(0xffe2a8, { emissive: 0xffc768, emissiveIntensity: 1.6, roughness: 0.4 }),
    fairyAlt: mat(0xffe9bd, { emissive: 0xffd58f, emissiveIntensity: 1.2, roughness: 0.4 }),
    fur: mat(0xf2a15f, { roughness: 0.85 }),
    blanket: mat(0xf6b2a4, { roughness: 0.95 }),
    wainscot: mat(0xdcbc93, { roughness: 0.7 }),
    trim: mat(0xffffff, { roughness: 0.5 }),
    oak: mat(0xd8b88e, { roughness: 0.55 }),
    walnut: mat(0xa77b52, { roughness: 0.5 }),
    white: mat(0xffffff, { roughness: 0.42 }),
    frost: mat(0xe2e8f0, { roughness: 0.5 }),
    ink: mat(0x1e293b, { roughness: 0.3 }),
    steel: mat(0x94a3b8, { roughness: 0.35, metalness: 0.55 }),
    screen: mat(0x0f1d38, { emissive: 0xffffff, emissiveMap: screenTexture, emissiveIntensity: 0.95, roughness: 0.25 }),
    sky: mat(0xffffff, { emissive: 0xffffff, emissiveMap: skyTexture, emissiveIntensity: 0.9, roughness: 0.2 }),
    board: mat(0xffffff, { map: boardTexture, roughness: 0.4 }),
    poster: mat(0xffffff, { map: posterTexture, roughness: 0.7 }),
    rug: mat(0xffffff, { map: rugTexture, roughness: 1 }),
    sofa: mat(0xc6d6ee, { roughness: 0.95 }),
    cushion: mat(0xf8d49b, { roughness: 0.95 }),
    pillow: mat(0xfbcfe8, { roughness: 0.95 }),
    leaf: mat(0x3e9d6a, { roughness: 0.6 }),
    leafDeep: mat(0x2c7a52, { roughness: 0.6 }),
    pot: mat(0xf3e6d6, { roughness: 0.7 }),
    clay: mat(0xd9906a, { roughness: 0.75 }),
    blue: mat(0x2563eb, { roughness: 0.4 }),
    soft: mat(0x93c5fd, { roughness: 0.45 }),
    amber: mat(0xf59e0b, { roughness: 0.45 }),
    lampGlow: mat(0xfff2cc, { emissive: 0xffd88a, emissiveIntensity: 1.4, roughness: 0.4 }),
    paper: mat(0xffffff, { roughness: 0.8, side: THREE.DoubleSide }),
    steam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }),
    shaft: new THREE.MeshBasicMaterial({ map: shaftTexture, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
  }
  materials.add(M.steam).add(M.shaft).add(M.hit)

  // ─── The room, built in batches that assemble one after another ───
  const batches = []
  const batch = (kind, delay) => { const group = new THREE.Group(); scene.add(group); batches.push({ group, kind, delay }); return group }
  const steam = [], sways = [], screens = [], cats = []

  const floor = batch('floor', 0)
  box(floor, 14.2, 0.26, 10.2, 0, -0.13, 0, M.floor, 0, false)
  box(floor, 14.4, 0.12, 10.4, 0, -0.32, 0, M.walnut, 0.05, false)

  const walls = batch('wall', 0.22)
  box(walls, 14.2, 3.1, 0.2, 0, 1.55, -5.1, M.wall)
  box(walls, 0.2, 3.1, 10.2, -7.1, 1.55, 0, M.wallWarm)
  box(walls, 14.2, 0.95, 0.04, 0, 0.475, -4.99, M.wainscot, 0, false)
  box(walls, 0.04, 0.95, 10.2, -6.99, 0.475, 0, M.wainscot, 0, false)
  box(walls, 14.2, 0.06, 0.08, 0, 0.97, -4.96, M.trim, 0, false)
  box(walls, 0.08, 0.06, 10.2, -6.96, 0.97, 0, M.trim, 0, false)
  box(walls, 14.2, 0.12, 0.06, 0, 0.06, -4.97, M.trim, 0, false)
  box(walls, 0.06, 0.12, 10.2, -6.97, 0.06, 0, M.trim, 0, false)
  box(walls, 14.3, 0.1, 0.32, 0, 3.12, -5.08, M.trim, 0.03)
  box(walls, 0.32, 0.1, 10.3, -7.08, 3.12, 0, M.trim, 0.03)
  // Windows: sky, white frames, a sill, and soft light falling into the room.
  const windowAt = (parent, x, z, rotY) => {
    const frame = new THREE.Group()
    frame.position.set(x, 1.95, z)
    frame.rotation.y = rotY
    parent.add(frame)
    box(frame, 1.5, 1.4, 0.02, 0, 0, 0.005, M.sky, 0, false)
    for (const [w, h, fx, fy] of [[1.62, 0.08, 0, 0.72], [1.62, 0.08, 0, -0.72], [0.08, 1.52, 0.77, 0], [0.08, 1.52, -0.77, 0], [0.04, 1.4, 0, 0], [1.5, 0.04, 0, 0]]) box(frame, w, h, 0.07, fx, fy, 0.04, M.trim, 0.015, false)
    box(frame, 1.75, 0.06, 0.24, 0, -0.78, 0.11, M.oak, 0.02)
  }
  windowAt(walls, -1.25, -5.0, 0)
  windowAt(walls, 1.95, -5.0, 0)
  windowAt(walls, -7.0, 1.5, Math.PI / 2)
  box(walls, 1.9, 1.15, 0.04, 3.55, 1.6, -4.97, M.frost, 0.02)
  box(walls, 1.8, 1.05, 0.02, 3.55, 1.6, -4.94, M.board, 0, false)
  box(walls, 1.2, 0.05, 0.1, 3.55, 1.02, -4.9, M.frost, 0.02)
  box(walls, 0.62, 0.8, 0.03, -6.97, 1.85, -4.1, M.trim, 0.01, false).rotation.y = Math.PI / 2
  box(walls, 0.54, 0.72, 0.01, -6.95, 1.85, -4.1, M.poster, 0, false).rotation.y = Math.PI / 2
  // A wall clock with moving hands.
  const clockFace = new THREE.Group()
  clockFace.position.set(-4.45, 2.35, -4.97)
  walls.add(clockFace)
  cyl(clockFace, 0.32, 0.32, 0.05, 0, 0, 0, M.ink, 40, false).rotation.x = Math.PI / 2
  cyl(clockFace, 0.28, 0.28, 0.06, 0, 0, 0.004, M.white, 40, false).rotation.x = Math.PI / 2
  const hourHand = live(new THREE.Group()), minuteHand = live(new THREE.Group())
  clockFace.add(hourHand, minuteHand)
  box(hourHand, 0.025, 0.15, 0.01, 0, 0.065, 0.04, M.ink, 0, false)
  box(minuteHand, 0.018, 0.22, 0.01, 0, 0.1, 0.045, M.blue, 0, false)
  // String lights along the tops of both walls, in three swags each.
  for (let i = 0; i <= 26; i++) ball(walls, 0.04, -6.7 + (i / 26) * 13.2, 2.82 - Math.sin(((i % 9) / 9) * Math.PI) * 0.22, -4.93, i % 2 ? M.fairy : M.fairyAlt, 1, 1.2, 1, false)
  for (let i = 0; i <= 17; i++) ball(walls, 0.04, -6.93, 2.82 - Math.sin(((i % 9) / 9) * Math.PI) * 0.2, -4.6 + (i / 17) * 8.4, i % 2 ? M.fairyAlt : M.fairy, 1, 1.2, 1, false)

  // Light shafts and dust in the window light (decor, not baked).
  const shafts = new THREE.Group()
  scene.add(shafts)
  for (const x of [-1.25, 1.95]) {
    const shaft = put(new THREE.PlaneGeometry(1.4, 4.2), M.shaft, shafts, x + 0.55, 1.55, -3.4, false)
    shaft.rotation.set(-0.95, 0.12, 0)
  }
  const dustCount = 160
  const dustPositions = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = -2.4 + ((i * 37) % 100) / 100 * 5.6
    dustPositions[i * 3 + 1] = 0.4 + ((i * 53) % 100) / 100 * 2.4
    dustPositions[i * 3 + 2] = -4.6 + ((i * 71) % 100) / 100 * 3
  }
  const dustGeometry = new THREE.BufferGeometry()
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  geometries.add(dustGeometry)
  const dustMaterial = new THREE.PointsMaterial({ color: 0xfff7e6, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false })
  materials.add(dustMaterial)
  const dust = new THREE.Points(dustGeometry, dustMaterial)
  scene.add(dust)

  // Small furniture helpers.
  const mug = (parent, x, y, z, material) => {
    cyl(parent, 0.07, 0.06, 0.12, x, y + 0.06, z, material, 16)
    put(new THREE.TorusGeometry(0.04, 0.012, 6, 12), material, parent, x + 0.075, y + 0.06, z).rotation.y = Math.PI / 2
    for (let i = 0; i < 3; i++) {
      const puff = live(ball(parent, 0.035, x, y + 0.2 + i * 0.1, z, M.steam, 0.8, 1.6, 0.8, false))
      steam.push({ puff, y: y + 0.18, phase: i * 0.33 + x * 0.1 })
    }
  }
  const plant = (parent, x, z, size = 1, tall = false) => {
    cyl(parent, 0.2 * size, 0.15 * size, 0.36 * size, x, 0.18 * size, z, M.pot, 20)
    const crown = live(new THREE.Group())
    crown.position.set(x, 0.36 * size, z)
    parent.add(crown)
    if (tall) {
      for (let i = 0; i < 7; i++) {
        const blade = put(new THREE.ConeGeometry(0.06 * size, (0.8 + (i % 3) * 0.25) * size, 6), i % 2 ? M.leaf : M.leafDeep, crown, Math.sin(i * 2.3) * 0.08 * size, (0.4 + (i % 3) * 0.12) * size, Math.cos(i * 2.3) * 0.08 * size)
        blade.rotation.set(Math.cos(i) * 0.18, 0, Math.sin(i * 1.7) * 0.18)
      }
    } else {
      for (let i = 0; i < 9; i++) {
        const leaf = ball(crown, 0.2 * size, Math.sin(i * 2.4) * 0.22 * size, (0.18 + (i % 4) * 0.13) * size, Math.cos(i * 2.4) * 0.22 * size, i % 3 ? M.leaf : M.leafDeep, 1.1, 0.42, 0.75)
        leaf.rotation.set(Math.sin(i) * 0.5, i * 0.7, Math.cos(i * 1.3) * 0.5)
      }
    }
    sways.push({ crown, phase: x + z })
  }
  const trailing = (parent, x, y, z) => {
    cyl(parent, 0.1, 0.08, 0.14, x, y + 0.07, z, M.clay, 16)
    const crown = live(new THREE.Group())
    crown.position.set(x, y + 0.12, z)
    parent.add(crown)
    for (let i = 0; i < 8; i++) ball(crown, 0.07, Math.sin(i * 2.1) * 0.12, 0.05 - i * 0.075, 0.07 + Math.cos(i * 2.1) * 0.05, i % 2 ? M.leaf : M.leafDeep, 1, 0.6, 1)
    sways.push({ crown, phase: x })
  }
  const chair = (parent, x, z, yaw, seat) => {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    group.rotation.y = yaw
    parent.add(group)
    box(group, 0.52, 0.08, 0.5, 0, seat - 0.04, 0, M.white, 0.03)
    box(group, 0.5, 0.5, 0.07, 0, seat + 0.3, -0.24, M.soft, 0.03)
    cyl(group, 0.03, 0.03, seat - 0.1, 0, (seat - 0.1) / 2 + 0.05, 0, M.steel, 10)
    cyl(group, 0.24, 0.26, 0.04, 0, 0.04, 0, M.ink, 24)
  }
  const desk = (parent, x, z, width) => {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    parent.add(group)
    box(group, width, 0.05, 0.72, 0, 0.72, 0, M.oak, 0.02)
    for (const dx of [-1, 1]) box(group, 0.05, 0.7, 0.62, dx * (width / 2 - 0.08), 0.35, 0, M.white, 0.02)
    box(group, 0.36, 0.4, 0.56, width / 2 - 0.3, 0.42, 0, M.white, 0.03)
    return group
  }
  const monitor = (parent, x, z, facing) => {
    const group = new THREE.Group()
    group.position.set(x, 0.745, z)
    group.rotation.y = facing
    parent.add(group)
    box(group, 0.64, 0.4, 0.04, 0, 0.36, 0, M.ink, 0.02)
    const face = put(new THREE.PlaneGeometry(0.58, 0.34), M.screen, group, 0, 0.36, 0.022, false)
    screens.push(face)
    cyl(group, 0.025, 0.025, 0.16, 0, 0.08, -0.02, M.steel, 10)
    box(group, 0.2, 0.02, 0.14, 0, 0.01, -0.02, M.steel, 0.008)
  }
  const laptopAt = (parent, x, z, facing) => {
    const group = new THREE.Group()
    group.position.set(x, 0.745, z)
    group.rotation.y = facing
    parent.add(group)
    box(group, 0.46, 0.02, 0.32, 0, 0.01, 0, M.frost, 0.008)
    const lid = new THREE.Group()
    lid.position.set(0, 0.02, -0.16)
    lid.rotation.x = -0.28
    group.add(lid)
    box(lid, 0.46, 0.3, 0.016, 0, 0.15, 0, M.frost, 0.008)
    put(new THREE.PlaneGeometry(0.42, 0.26), M.screen, lid, 0, 0.15, 0.009, false)
    put(new THREE.CircleGeometry(0.03, 16), M.blue, lid, 0, 0.16, -0.0095, false).rotation.y = Math.PI
  }

  // Back wall: the Ranker's and the Researcher's desks, the Planner's whiteboard.
  const backDesks = batch('drop', 0.5)
  for (const key of ['ranker', 'researcher']) {
    const s = STATIONS[key]
    desk(backDesks, s.x, s.z - 0.72, 1.4)
    chair(backDesks, s.x, s.z + 0.14, Math.PI, s.seat)
    if (key === 'researcher') { monitor(backDesks, s.x - 0.33, s.z - 0.92, 0.18); monitor(backDesks, s.x + 0.33, s.z - 0.92, -0.18) }
    else monitor(backDesks, s.x, s.z - 0.92, 0)
    box(backDesks, 0.44, 0.02, 0.14, s.x, 0.755, s.z - 0.55, M.white, 0.006)
    mug(backDesks, s.x - 0.55, 0.745, s.z - 0.55, key === 'ranker' ? M.amber : M.white)
  }
  // Props: the Researcher's magnifier, the Ranker's chart blocks.
  const magnifier = new THREE.Group()
  magnifier.position.set(STATIONS.researcher.x + 0.6, 0.86, STATIONS.researcher.z - 0.5)
  magnifier.rotation.set(-0.3, 0.2, 0.5)
  backDesks.add(magnifier)
  put(new THREE.TorusGeometry(0.09, 0.02, 10, 24), M.blue, magnifier)
  cyl(magnifier, 0.018, 0.022, 0.15, 0, -0.17, 0, M.ink, 10)
  ;[[0.2, M.blue], [0.14, M.soft], [0.08, M.frost]].forEach(([h, m], i) => box(backDesks, 0.08, h, 0.08, STATIONS.ranker.x + 0.45 + i * 0.1, 0.745 + h / 2, STATIONS.ranker.z - 0.5, m, 0.015))
  plant(backDesks, -6.35, -4.45, 1.25)
  plant(backDesks, 5.05, -4.5, 0.95, true)
  // Shelves and warm pendant lamps over the two desks.
  for (const key of ['ranker', 'researcher']) {
    const x = STATIONS[key].x, z = STATIONS[key].z - 0.72
    box(backDesks, 1.3, 0.05, 0.26, x, 2.2, -4.86, M.oak, 0.02)
    ;[M.blue, M.amber, M.soft, M.white, M.pillow].forEach((spine, i) => box(backDesks, 0.07, 0.2 + (i % 3) * 0.04, 0.18, x - 0.5 + i * 0.09, 2.33 + (i % 3) * 0.02, -4.85, spine, 0.01))
    trailing(backDesks, x + 0.4, 2.225, -4.86)
    cyl(backDesks, 0.008, 0.008, 0.62, x, 2.81, z, M.ink, 6, false)
    put(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.white, backDesks, x, 2.4, z)
    ball(backDesks, 0.075, x, 2.38, z, M.lampGlow, 1, 1, 1, false)
  }

  // The Planner's corner and the coffee nook.
  const nook = batch('drop', 0.62)
  box(nook, 1.7, 0.86, 0.62, 5.95, 0.43, -4.62, M.white, 0.03)
  box(nook, 1.76, 0.05, 0.68, 5.95, 0.885, -4.62, M.oak, 0.02)
  box(nook, 0.34, 0.42, 0.32, 5.5, 1.12, -4.66, M.ink, 0.05)
  cyl(nook, 0.1, 0.1, 0.06, 5.5, 0.94, -4.5, M.steel, 16)
  mug(nook, 6.15, 0.91, -4.5, M.white)
  mug(nook, 6.45, 0.91, -4.55, M.soft)
  box(nook, 1.6, 0.05, 0.26, 5.95, 2.05, -4.86, M.oak, 0.02)
  plant(nook, 6.4, -4.86 + 0.05, 0.45)
  for (let i = 0; i < 3; i++) cyl(nook, 0.07, 0.07, 0.18, 5.4 + i * 0.22, 2.17, -4.84, i === 1 ? M.amber : M.frost, 14)

  // The Librarian's bookshelf and armchair.
  const library = batch('drop', 0.74)
  box(library, 0.42, 2.3, 2.6, -6.78, 1.15, -2.05, M.oak, 0.03)
  const spines = [M.blue, M.soft, M.amber, M.white, M.leaf, M.pillow, M.frost, M.cushion]
  for (let shelf = 0; shelf < 4; shelf++) {
    box(library, 0.4, 0.04, 2.5, -6.66, 0.35 + shelf * 0.55, -2.05, M.walnut, 0.01)
    let z = -3.2
    let i = shelf * 3
    while (z < -0.95) {
      const thick = 0.07 + ((i * 7) % 4) * 0.02, tall = 0.32 + ((i * 5) % 3) * 0.06
      box(library, 0.26, tall, thick, -6.62, 0.37 + shelf * 0.55 + tall / 2, z + thick / 2, spines[i % spines.length], 0.01)
      z += thick + 0.015
      i++
    }
  }
  const armchair = new THREE.Group()
  armchair.position.set(STATIONS.librarian.x - 0.15, 0, STATIONS.librarian.z)
  armchair.rotation.y = Math.PI / 2
  library.add(armchair)
  box(armchair, 0.86, 0.36, 0.8, 0, 0.22, 0, M.sofa, 0.1)
  box(armchair, 0.86, 0.6, 0.2, 0, 0.6, -0.36, M.sofa, 0.08)
  for (const dx of [-1, 1]) box(armchair, 0.16, 0.5, 0.78, dx * 0.43, 0.38, 0, M.sofa, 0.07)
  box(armchair, 0.56, 0.12, 0.5, 0, 0.44, 0.06, M.cushion, 0.05)
  plant(library, -6.35, 0.35, 0.8)

  // The lounge: rug, sofa (the Comparator's seat), coffee table, floor lamp.
  const lounge = batch('drop', 0.86)
  box(lounge, 4.4, 0.03, 3.1, 0.55, 0.015, 0.3, M.rug, 0.01, false)
  const sofa = new THREE.Group()
  sofa.position.set(STATIONS.comparator.x, 0, STATIONS.comparator.z - 0.12)
  lounge.add(sofa)
  box(sofa, 2.5, 0.4, 0.9, 0, 0.24, 0, M.sofa, 0.12)
  box(sofa, 2.5, 0.66, 0.26, 0, 0.62, -0.36, M.sofa, 0.12)
  for (const dx of [-1, 1]) box(sofa, 0.24, 0.56, 0.92, dx * 1.24, 0.36, 0, M.sofa, 0.1)
  box(sofa, 0.62, 0.12, 0.6, -0.65, 0.48, 0.06, M.cushion, 0.05)
  box(sofa, 0.62, 0.12, 0.6, 0.65, 0.48, 0.06, M.cushion, 0.05)
  box(sofa, 0.4, 0.34, 0.14, -0.86, 0.72, -0.18, M.pillow, 0.07).rotation.z = 0.15
  box(sofa, 0.62, 0.05, 0.98, 1.05, 0.62, 0.02, M.blanket, 0.02).rotation.z = -0.32
  box(lounge, 1.3, 0.06, 0.66, 0.55, 0.42, 0.98, M.oak, 0.03)
  for (const [dx, dz] of [[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]]) cyl(lounge, 0.03, 0.025, 0.4, 0.55 + dx, 0.2, 0.98 + dz, M.walnut, 8)
  mug(lounge, 0.2, 0.45, 1.05, M.white)
  box(lounge, 0.34, 0.06, 0.26, 0.85, 0.48, 0.95, M.blue, 0.01).rotation.y = 0.2
  cyl(lounge, 0.03, 0.03, 1.6, -1.05, 0.8, -1.1, M.walnut, 8)
  cyl(lounge, 0.18, 0.26, 0.04, -1.05, 0.02, -1.1, M.walnut, 20)
  cyl(lounge, 0.2, 0.3, 0.32, -1.05, 1.72, -1.1, M.lampGlow, 24)
  cyl(lounge, 0.3, 0.32, 0.34, 2.3, 0.17, 0.25, M.soft, 24)
  // A cat asleep on the rug.
  const cat = live(new THREE.Group())
  cat.position.set(-0.7, 0.03, 1.25)
  cat.rotation.y = 0.6
  lounge.add(cat)
  const catBody = ball(cat, 0.22, 0, 0.13, 0, M.fur, 1.2, 0.62, 0.9)
  ball(cat, 0.12, 0.21, 0.15, 0.1, M.fur)
  for (const side of [-1, 1]) put(new THREE.ConeGeometry(0.045, 0.09, 8), M.fur, cat, 0.2, 0.27, 0.1 + side * 0.06)
  const tail = put(new THREE.TorusGeometry(0.17, 0.035, 8, 20, Math.PI * 1.1), M.fur, cat, -0.03, 0.06, 0)
  tail.rotation.x = -Math.PI / 2
  cats.push({ body: catBody, tail })

  // The front row: the Writer's desk and the review bench of the Verifier and the Corrector.
  const front = batch('drop', 1.0)
  {
    const s = STATIONS.writer
    desk(front, s.x, s.z + 0.72, 1.4)
    chair(front, s.x, s.z - 0.14, 0, s.seat)
    laptopAt(front, s.x - 0.1, s.z + 0.62, Math.PI)
    for (let i = 0; i < 4; i++) box(front, 0.3, 0.012, 0.4, s.x + 0.45, 0.756 + i * 0.012, s.z + 0.72, M.paper, 0, false).rotation.y = i * 0.07
    const pencil = new THREE.Group()
    pencil.position.set(s.x + 0.45, 0.82, s.z + 0.7)
    pencil.rotation.set(0, 0.6, Math.PI / 2)
    front.add(pencil)
    cyl(pencil, 0.02, 0.02, 0.24, 0, 0, 0, M.amber, 6)
    put(new THREE.ConeGeometry(0.02, 0.05, 6), M.cushion, pencil, 0, 0.145, 0)
    mug(front, s.x - 0.55, 0.745, s.z + 0.85, M.pillow)
  }
  box(front, 4.2, 0.06, 0.8, 0.55, 0.74, 3.5, M.oak, 0.03)
  for (const dx of [-1.95, 1.95]) box(front, 0.08, 0.72, 0.7, 0.55 + dx, 0.36, 3.5, M.white, 0.02)
  for (const key of ['verifier', 'corrector']) {
    const s = STATIONS[key]
    chair(front, s.x, s.z - 0.14, 0, s.seat)
    laptopAt(front, s.x, s.z + 0.62, Math.PI)
  }
  const badge = new THREE.Group()
  badge.position.set(STATIONS.verifier.x + 0.52, 0.92, 3.6)
  front.add(badge)
  cyl(badge, 0.13, 0.13, 0.035, 0, 0, 0, M.blue, 28).rotation.x = Math.PI / 2
  box(badge, 0.065, 0.028, 0.02, -0.035, -0.012, 0.022, M.white, 0.009).rotation.z = -0.8
  box(badge, 0.12, 0.028, 0.02, 0.028, 0.02, 0.022, M.white, 0.009).rotation.z = 0.85
  cyl(front, 0.03, 0.05, 0.05, STATIONS.verifier.x + 0.52, 0.795, 3.6, M.ink, 12)
  const wrench = new THREE.Group()
  wrench.position.set(STATIONS.corrector.x + 0.55, 0.9, 3.62)
  wrench.rotation.z = -0.55
  front.add(wrench)
  box(wrench, 0.05, 0.24, 0.035, 0, -0.04, 0, M.blue, 0.015)
  put(new THREE.TorusGeometry(0.055, 0.022, 8, 18, Math.PI * 1.45), M.blue, wrench, 0, 0.12, 0).rotation.z = Math.PI * 0.775
  // A pendant lamp over the bench.
  cyl(front, 0.008, 0.008, 0.8, 0.55, 2.7, 3.5, M.ink, 6, false)
  put(new THREE.SphereGeometry(0.26, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.white, front, 0.55, 2.3, 3.5)
  ball(front, 0.1, 0.55, 2.27, 3.5, M.lampGlow, 1, 1, 1, false)
  plant(front, -5.9, 3.7, 0.7)

  // The Guardian's podium by the doorway.
  const door = batch('drop', 1.12)
  {
    const s = STATIONS.guardian
    box(door, 0.5, 0.98, 0.7, s.x + 0.55, 0.49, s.z, M.white, 0.04)
    box(door, 0.56, 0.05, 0.78, s.x + 0.55, 1.0, s.z, M.oak, 0.02)
    box(door, 0.04, 0.5, 0.42, s.x + 0.81, 0.55, s.z, M.blue, 0.015)
    const shield = new THREE.Shape()
    shield.moveTo(0, 0.17); shield.lineTo(0.135, 0.12); shield.lineTo(0.125, -0.02)
    shield.quadraticCurveTo(0.1, -0.13, 0, -0.19); shield.quadraticCurveTo(-0.1, -0.13, -0.125, -0.02); shield.lineTo(-0.135, 0.12); shield.closePath()
    const emblem = put(new THREE.ExtrudeGeometry(shield, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 6 }), M.white, door, s.x + 0.84, 0.58, s.z)
    emblem.rotation.y = Math.PI / 2
    // The doorway and its mat.
    for (const dz of [-0.62, 0.62]) box(door, 0.12, 2.3, 0.12, 6.75, 1.15, s.z + dz, M.trim, 0.03)
    box(door, 0.14, 0.12, 1.36, 6.75, 2.32, s.z, M.trim, 0.03)
    box(door, 0.9, 0.02, 1.1, 6.2, 0.01, s.z, M.soft, 0.008, false)
    plant(door, 6.35, -0.55, 0.9, true)
  }

  // Merge each batch's static meshes per material: a few draw calls instead of hundreds.
  function bake(group) {
    group.updateMatrixWorld(true)
    const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert()
    const buckets = new Map(), merged = []
    group.traverse(object => {
      if (!object.isMesh) return
      for (let p = object; p && p !== group; p = p.parent) if (p.userData.live) return
      let geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld))
      for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name)
      if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2))
      geometry.clearGroups()
      const key = `${object.material.uuid}:${object.castShadow}`
      if (!buckets.has(key)) buckets.set(key, { material: object.material, cast: object.castShadow, parts: [] })
      buckets.get(key).parts.push(geometry)
      merged.push(object)
    })
    for (const object of merged) object.removeFromParent()
    const prune = node => { for (const child of [...node.children]) { prune(child); if (!child.isMesh && !child.children.length && !child.userData.live) child.removeFromParent() } }
    prune(group)
    for (const { material, cast, parts } of buckets.values()) {
      const geometry = mergeGeometries(parts, false)
      parts.forEach(part => part.dispose())
      if (!geometry) continue
      geometries.add(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = cast
      mesh.receiveShadow = true
      group.add(mesh)
    }
  }
  batches.forEach(({ group }) => bake(group))

  // ─── The agents ───
  const botWhite = mat(0xffffff, { roughness: 0.28 })
  const visor = mat(0x0f172a, { roughness: 0.16 })
  const eyeMaterial = mat(0x93c5fd, { emissive: 0x93c5fd, emissiveIntensity: 1.5, roughness: 0.3 })
  const stem = mat(0xcbd5e1, { roughness: 0.4 })
  const capsule = (r, length) => new THREE.CapsuleGeometry(r, length, 6, 14)
  const rounded = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r)
  const v = new THREE.Vector3(), w3 = new THREE.Vector3()

  const rigs = order.map((key, index) => {
    const s = STATIONS[key] || STATIONS.comparator
    const color = new THREE.Color(AGENT_COLORS[key] || '#3b82f6')
    const accent = mat(color, { roughness: 0.36 })
    const glow = mat(color, { emissive: color, emissiveIntensity: 0.5, roughness: 0.3 })
    const palm = mat(color.clone().lerp(new THREE.Color(0xffffff), 0.62), { roughness: 0.4 })
    const root = new THREE.Group()
    root.visible = false
    scene.add(root)
    const pelvis = new THREE.Group()
    pelvis.position.y = 0.56
    root.add(pelvis)
    const legs = [-1, 1].map(side => {
      const hip = new THREE.Group()
      hip.position.set(side * 0.1, 0, 0)
      pelvis.add(hip)
      put(capsule(0.07, 0.14), botWhite, hip, 0, -0.13, 0)
      const knee = new THREE.Group()
      knee.position.y = -0.27
      hip.add(knee)
      put(capsule(0.064, 0.13), botWhite, knee, 0, -0.12, 0)
      put(rounded(0.15, 0.07, 0.22, 0.03), accent, knee, 0, -0.25, 0.04)
      return { hip, knee, side }
    })
    const torso = new THREE.Group()
    pelvis.add(torso)
    put(capsule(0.2, 0.2), botWhite, torso, 0, 0.25, 0).scale.set(1, 1, 0.86)
    put(rounded(0.22, 0.16, 0.05, 0.04), accent, torso, 0, 0.27, 0.165)
    put(new THREE.SphereGeometry(0.025, 12, 8), glow, torso, 0, 0.27, 0.193, false)
    put(new THREE.TorusGeometry(0.135, 0.035, 10, 26), accent, torso, 0, 0.48, 0).rotation.x = Math.PI / 2
    const head = new THREE.Group()
    head.position.y = 0.78
    torso.add(head)
    put(rounded(0.5, 0.4, 0.42, 0.15), botWhite, head)
    put(rounded(0.4, 0.26, 0.05, 0.08), visor, head, 0, -0.01, 0.195)
    const eyes = [-0.085, 0.085].map(x => put(rounded(0.055, 0.095, 0.02, 0.026), eyeMaterial, head, x, 0.012, 0.222, false))
    const mouth = put(rounded(0.1, 0.022, 0.02, 0.01), eyeMaterial, head, 0, -0.07, 0.222, false)
    mouth.scale.x = 0.55
    for (const x of [-0.27, 0.27]) put(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 18), accent, head, x, 0, 0).rotation.z = Math.PI / 2
    put(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), stem, head, 0, 0.26, 0, false)
    put(new THREE.SphereGeometry(0.045, 14, 10), glow, head, 0, 0.35, 0, false)
    const arms = [-1, 1].map(side => {
      const shoulder = new THREE.Group()
      shoulder.position.set(side * 0.235, 0.42, 0)
      torso.add(shoulder)
      put(capsule(0.055, 0.1), botWhite, shoulder, 0, -0.1, 0)
      const elbow = new THREE.Group()
      elbow.position.y = -0.2
      shoulder.add(elbow)
      put(capsule(0.05, 0.09), botWhite, elbow, 0, -0.09, 0)
      const grip = new THREE.Group()
      grip.position.y = -0.2
      elbow.add(grip)
      put(new THREE.SphereGeometry(0.058, 14, 10), palm, grip)
      return { shoulder, elbow, grip, side, sx: 0, sz: side * 0.12, ex: -0.15 }
    })
    // What each agent holds while it works.
    if (key === 'guardian') {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0.17); shape.lineTo(0.135, 0.12); shape.lineTo(0.125, -0.02)
      shape.quadraticCurveTo(0.1, -0.13, 0, -0.19); shape.quadraticCurveTo(-0.1, -0.13, -0.125, -0.02); shape.lineTo(-0.135, 0.12); shape.closePath()
      const shield = put(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 }), accent, arms[0].grip, -0.02, -0.06, 0.08)
      shield.rotation.set(Math.PI / 2, 0, 0)
    }
    if (key === 'planner') cyl(arms[1].grip, 0.018, 0.018, 0.14, 0, -0.06, 0.03, accent, 8).rotation.x = Math.PI / 2
    if (key === 'librarian') {
      const book = new THREE.Group()
      book.position.set(0, 0.16, 0.34)
      book.rotation.x = -0.6
      torso.add(book)
      for (const side of [-1, 1]) {
        const half = new THREE.Group()
        half.rotation.y = side * 0.25
        book.add(half)
        box(half, 0.18, 0.24, 0.02, side * 0.09, 0, 0, accent, 0.006)
        box(half, 0.16, 0.22, 0.014, side * 0.085, 0, 0.012, M.paper, 0.004, false)
      }
    }
    if (key === 'comparator') for (const arm of arms) box(arm.grip, 0.17, 0.22, 0.008, 0, -0.02, 0.07, M.paper, 0.004, false).rotation.x = -1.2
    const ring = put(new THREE.TorusGeometry(0.42, 0.026, 8, 40), glow, scene, 0, 0.03, 0, false)
    ring.rotation.x = -Math.PI / 2
    ring.visible = false
    const hit = put(new THREE.CylinderGeometry(0.46, 0.46, 1.75, 12), M.hit, root, 0, 0.85, 0, false)
    hit.userData.key = key
    const home = new THREE.Vector3(s.x, 0, s.z)
    const seated = s.pose === 'desk' || s.pose === 'read' || s.pose === 'sofa'
    return {
      key, index, s, root, pelvis, torso, head, eyes, mouth, arms, legs, ring, hit, glow,
      home, greet: new THREE.Vector3(s.x + s.step[0], 0, s.z + s.step[1]), pos: home.clone(), yaw: s.yaw, sit: seated ? 1 : 0, seated,
      mode: 'work', look: new THREE.Vector3(), talkUntil: 0, waveAt: -9, throwAt: -9, catchAt: -9, shakeUntil: 0,
      blinkAt: 2 + index * 0.37, blinkUntil: 0, phase: index * 0.9, hop: 0, hx: 0, hy: 0, walk: 0,
    }
  })
  const byKey = Object.fromEntries(rigs.map(rig => [rig.key, rig]))
  const hits = rigs.map(rig => rig.hit)

  // The paper plane and its trail.
  const planeShape = new THREE.BufferGeometry()
  planeShape.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0.3, -0.22, 0.02, -0.18, 0, 0, -0.16,
    0, 0, 0.3, 0, 0, -0.16, 0.22, 0.02, -0.18,
    0, 0, 0.3, 0, -0.07, -0.14, 0, 0, -0.16,
  ]), 3))
  planeShape.computeVertexNormals()
  geometries.add(planeShape)
  const plane = new THREE.Group()
  plane.visible = false
  scene.add(plane)
  put(planeShape, M.paper, plane, 0, 0, 0, true)
  const flights = []
  let fall = null

  // ─── Camera: an orbit around a target, gliding between the room, an agent and a flight ───
  const cam = { az: VIEW.az, el: VIEW.el, dist: 20, target: HOME.clone() }
  const goal = { az: VIEW.az, el: VIEW.el, dist: 20, target: HOME.clone() }
  const orbit = { az: 0, el: 0 }, sway = { x: 0, y: 0, tx: 0, ty: 0 }
  let fit = 20, compact = false, quality = 1
  const size = { w: 1, h: 1 }
  const corners = (wide) => (wide
    ? [[-6.4, 0, -4.6], [6.6, 0, -4.6], [-6.2, 0, 4.4], [6.6, 0, 3.8], [-6.4, 2.7, -4.8], [5.6, 2.7, -4.8], [-6.6, 2.5, 3.2]]
    : [[-5.4, 0, -4.4], [6.4, 0, -4.4], [-5.4, 0, 4.2], [6.4, 0, 4.2], [-5.4, 2.4, -4.6], [5.4, 2.4, -4.6]]).map(([x, y, z]) => new THREE.Vector3(x, y, z))
  const place = (target, az, el, dist) => {
    const ce = Math.cos(el)
    camera.position.set(target.x + dist * Math.sin(az) * ce, target.y + dist * Math.sin(el), target.z + dist * Math.cos(az) * ce)
    camera.lookAt(target)
    camera.updateMatrixWorld()
  }
  const toScreen = world => {
    v.copy(world).project(camera)
    return { x: ((v.x + 1) / 2) * size.w, y: ((1 - v.y) / 2) * size.h, front: v.z < 1 }
  }

  let still = startStill, dirty = true, disposed = false, focused = null, speaker = null, hovered = null
  let revealed = false, revealAt = 0, bubbleBox = { w: 0, h: 0 }
  function layout() {
    if (disposed) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    size.w = rect.width
    size.h = rect.height
    compact = rect.width < 640
    stage?.toggleAttribute('data-compact', compact)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75) * quality)
    renderer.setSize(rect.width, rect.height, false)
    camera.aspect = rect.width / rect.height
    camera.updateProjectionMatrix()
    const points = corners(!compact)
    let distance = 24
    for (let i = 0; i < 6; i++) {
      place(HOME, VIEW.az, VIEW.el, distance)
      let reach = 0
      for (const point of points) { v.copy(point).project(camera); reach = Math.max(reach, Math.abs(v.x), Math.abs(v.y)) }
      distance *= reach / 0.99
    }
    fit = distance
    for (const rig of rigs) rig.hit.scale.setScalar(compact ? 1.5 : 1)
    if (!focused && !flights.length) goal.dist = fit
    if (!revealed || still) { cam.dist = goal.dist }
    dirty = true
    wake()
  }

  function placeOverlay() {
    scene.updateMatrixWorld()
    for (const rig of rigs) {
      const label = labels[rig.key]
      if (!label) continue
      rig.head.getWorldPosition(w3)
      w3.y += 0.42
      const { x, y } = toScreen(w3)
      label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`
      label.classList.toggle('is-speaking', rig === speaker)
      label.classList.toggle('is-hidden', !rig.root.visible)
    }
    if (bubble && speaker) {
      speaker.head.getWorldPosition(w3)
      w3.y += 0.36
      const { x, y } = toScreen(w3)
      const left = Math.min(Math.max(x - 34, 10), size.w - bubbleBox.w - 10)
      const top = Math.max(y - 4, bubbleBox.h + 10)
      bubble.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0) translate(0, -100%)`
      bubble.style.setProperty('--tail', `${Math.min(Math.max(x - left, 20), bubbleBox.w - 20).toFixed(1)}px`)
    }
  }

  // Pointer: tap to pick an agent; a mouse also hovers, drags to orbit a little, and sways the
  // camera. A phone's scroll never picks an agent and never moves the camera.
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2()
  const pick = event => {
    const rect = canvas.getBoundingClientRect()
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.intersectObjects(hits, false).find(hit => hit.object.parent.visible)?.object.userData.key ?? null
  }
  let down = null
  const onDown = event => { down = { x: event.clientX, y: event.clientY, t: performance.now(), mouse: event.pointerType === 'mouse', drag: false, az: orbit.az, el: orbit.el } }
  const onUp = event => {
    if (!down) return
    const { drag, t } = down
    down = null
    stage?.removeAttribute('data-dragging')
    if (drag || performance.now() - t > 700) return
    const key = pick(event)
    if (key) onPick?.(key)
  }
  const onMove = event => {
    if (event.pointerType !== 'mouse') return
    const rect = canvas.getBoundingClientRect()
    sway.tx = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1))
    sway.ty = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1))
    if (down?.mouse && event.buttons & 1) {
      const dx = event.clientX - down.x, dy = event.clientY - down.y
      if (!down.drag && Math.hypot(dx, dy) > 8) { down.drag = true; stage?.setAttribute('data-dragging', '') }
      if (down.drag) {
        orbit.az = Math.max(-0.65, Math.min(0.55, down.az - dx * 0.005))
        orbit.el = Math.max(-0.22, Math.min(0.3, down.el + dy * 0.003))
      }
    }
    const key = down?.drag ? hovered : pick(event)
    if (key !== hovered) { hovered = key; onHover?.(key) }
    wake()
  }
  const onLeave = () => {
    down = null
    stage?.removeAttribute('data-dragging')
    sway.tx = sway.ty = 0
    if (hovered) { hovered = null; onHover?.(null) }
    wake()
  }

  // ─── The frame loop ───
  let frame = 0, last = 0, clock = 0, running = false, onScreen = false, ready = false, idle = 0, pace = 1 / 60, paced = 0
  const now = new Date()
  let clockTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

  function animateRig(rig, dt) {
    const s = rig.s
    const t = clock + rig.phase
    const greeting = rig.mode !== 'work'
    const target = greeting ? rig.greet : rig.home
    const away = Math.hypot(target.x - rig.pos.x, target.z - rig.pos.z)
    if (still) rig.pos.copy(target)
    else if (away > 0.005) {
      const stepSize = Math.min(away, dt * 1.7 * Math.min(1, away / 0.25 + 0.35))
      rig.pos.x += ((target.x - rig.pos.x) / away) * stepSize
      rig.pos.z += ((target.z - rig.pos.z) / away) * stepSize
    }
    const walking = !still && away > 0.03
    rig.walk = still ? 0 : damp(rig.walk, walking ? 1 : 0, 10, dt)
    const sitGoal = rig.seated && !greeting && away < 0.06 ? 1 : 0
    rig.sit = still ? sitGoal : damp(rig.sit, sitGoal, 6, dt)
    let yawGoal = s.yaw
    if (rig.mode === 'greet') yawGoal = Math.atan2(camera.position.x - rig.pos.x, camera.position.z - rig.pos.z)
    else if (rig.mode === 'turn') yawGoal = Math.atan2(rig.look.x - rig.pos.x, rig.look.z - rig.pos.z)
    else if (walking) yawGoal = Math.atan2(target.x - rig.pos.x, target.z - rig.pos.z)
    rig.yaw = still ? yawGoal : dampAngle(rig.yaw, yawGoal, 8, dt)

    // Hop in when the room first assembles.
    const hop = still ? (revealed ? 1 : 0) : clamp01((clock - revealAt - 1.25 - rig.index * 0.09) / 0.55)
    rig.root.visible = revealed && (still || hop > 0)
    const lift = revealed ? easeOutBack(hop) : 0
    rig.root.scale.setScalar(Math.max(0.001, lift))
    rig.root.position.set(rig.pos.x, still ? 0 : Math.sin(hop * Math.PI) * 0.35, rig.pos.z)
    rig.root.rotation.y = rig.yaw

    const gait = Math.sin(clock * 9 + rig.phase)
    const seatY = (s.seat || 0.47) + 0.02
    rig.pelvis.position.y = lerp(0.56, seatY, rig.sit) + rig.walk * Math.abs(gait) * 0.03 + (still || rig.sit > 0.5 ? 0 : Math.sin(t * 1.6) * 0.008)
    rig.pelvis.position.z = -0.1 * rig.sit
    for (const { hip, knee, side } of rig.legs) {
      hip.rotation.x = -Math.PI / 2 * rig.sit + rig.walk * gait * 0.55 * side
      knee.rotation.x = Math.PI / 2 * rig.sit + rig.walk * Math.max(0, -gait * side) * 0.6
    }

    // Arms: the station's work, then waving, throwing, catching or raising the shield.
    const [left, right] = rig.arms
    const pose = { l: [0.05, -0.12, -0.15], r: [0.05, 0.12, -0.15] } // [shoulder x, shoulder z, elbow x]
    if (!greeting && !walking && rig.sit > 0.4 || (!greeting && !walking && !rig.seated)) {
      if (s.pose === 'desk') { pose.l = [-0.95, -0.1, -0.6 + Math.sin(t * 15) * 0.1]; pose.r = [-0.95, 0.1, -0.6 + Math.sin(t * 15 + Math.PI) * 0.1] }
      if (s.pose === 'board') { pose.r = [-2.3 + Math.sin(t * 2.2) * 0.18, 0.2 + Math.sin(t * 1.7) * 0.22, -0.35] }
      if (s.pose === 'read') { pose.l = [-0.85, 0.3, -1.15]; pose.r = [-0.85, -0.3, -1.15] }
      if (s.pose === 'sofa') { pose.l = [-0.95, -0.28, -0.8]; pose.r = [-0.95, 0.28, -0.8] }
      if (s.pose === 'podium') { pose.l = [-0.7, -0.05, -0.55]; pose.r = [-0.7, 0.05, -0.55] }
    }
    if (walking) { pose.l = [gait * 0.45, -0.1, -0.2]; pose.r = [-gait * 0.45, 0.1, -0.2] }
    const waved = clock - rig.waveAt
    if (rig.mode === 'greet' && waved >= 0 && waved < 2.6 && !still) pose.r = [-0.15, 2.45 + Math.sin(waved * 11) * 0.32, -0.25]
    if (rig.mode === 'greet' && still) pose.r = [-0.15, 2.45, -0.25]
    const thrown = clock - rig.throwAt
    if (thrown >= 0 && thrown < 0.6) { const p = thrown / 0.6; pose.r = [p < 0.45 ? lerp(-0.2, -2.9, p / 0.45) : lerp(-2.9, -1.1, (p - 0.45) / 0.55), 0.1, -0.2] }
    const caught = clock - rig.catchAt
    if (caught > -0.45 && caught < 0.5) { pose.l = [-1.9, 0.15, -0.35]; pose.r = [-1.9, -0.15, -0.35] }
    if (clock < rig.shakeUntil) pose.l = [-1.55, 0.35, -0.5]
    for (const [arm, [sx, sz, ex]] of [[left, pose.l], [right, pose.r]]) {
      arm.sx = still ? sx : damp(arm.sx, sx, 12, dt)
      arm.sz = still ? sz : damp(arm.sz, sz, 12, dt)
      arm.ex = still ? ex : damp(arm.ex, ex, 12, dt)
      arm.shoulder.rotation.set(arm.sx, 0, arm.sz)
      arm.elbow.rotation.x = arm.ex
    }

    // Head, eyes, mouth and antenna.
    let headYaw = 0, headPitch = 0
    if (!greeting && !still) {
      if (s.pose === 'desk') headPitch = 0.12 + Math.sin(t * 1.1) * 0.05
      if (s.pose === 'read') headPitch = 0.38
      if (s.pose === 'sofa') headYaw = Math.sin(t * 1.15) * 0.5
      if (s.pose === 'podium') headYaw = Math.sin(t * 0.55) * 0.55
      if (s.pose === 'board') headYaw = Math.sin(t * 0.6) * 0.2
    }
    const talking = !still && clock < rig.talkUntil
    if (talking) headPitch += Math.sin(clock * 8) * 0.05
    if (!still && clock < rig.shakeUntil) headYaw = Math.sin(clock * 20) * 0.38
    rig.hx = still ? headPitch : damp(rig.hx, headPitch, 8, dt)
    rig.hy = still ? headYaw : damp(rig.hy, headYaw, 8, dt)
    rig.head.rotation.set(rig.hx, rig.hy, 0)
    if (!still && clock > rig.blinkAt) { rig.blinkUntil = clock + 0.12; rig.blinkAt = clock + 2.6 + ((rig.index * 7 + Math.floor(clock)) % 5) * 0.55 }
    const happy = rig.mode === 'greet'
    for (const eye of rig.eyes) {
      eye.scale.y = !still && clock < rig.blinkUntil ? 0.15 : happy ? 0.62 : 1
      eye.position.y = happy ? 0.024 : 0.012
    }
    rig.mouth.scale.x = talking ? 0.4 + 0.75 * Math.abs(Math.sin(clock * 16)) : happy ? 1 : 0.55
    rig.glow.emissiveIntensity = rig === speaker ? (talking ? 1.4 + Math.sin(clock * 12) * 0.5 : 1.3) : 0.5
    rig.ring.visible = rig.root.visible && rig === focused
    if (rig.ring.visible) { rig.ring.position.set(rig.pos.x, 0.03, rig.pos.z); rig.ring.rotation.z += dt * 0.8; rig.ring.scale.setScalar(1 + Math.sin(clock * 3) * 0.06) }
    return walking || talking || rig.sit % 1 > 0.002 || (revealed && !still && hop < 1)
  }

  function tick(time) {
    frame = requestAnimationFrame(tick)
    const dt = last ? Math.min(0.25, (time - last) / 1000) : 1 / 60
    last = time
    clock += dt
    let active = false
    // A device that cannot keep up gets fewer pixels rather than a slow animation.
    pace = pace * 0.9 + dt * 0.1
    if (++paced > 24 && pace > 0.045 && quality > 0.55) { quality *= 0.8; paced = 0; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75) * quality); renderer.setSize(size.w, size.h, false) }

    // The room assembles once, then the agents hop in.
    const building = revealed && !still && clock - revealAt < 2.4
    for (const { group, kind, delay } of batches) {
      const p = still ? (revealed ? 1 : 0) : revealed ? clamp01((clock - revealAt - delay) / 0.7) : 0
      group.visible = revealed && (still || p > 0)
      if (kind === 'floor') { const e = 1 - (1 - p) ** 3; group.scale.set(0.82 + 0.18 * e, 1, 0.82 + 0.18 * e); group.position.y = -0.5 * (1 - e) }
      if (kind === 'wall') group.scale.y = Math.max(0.001, 1 - (1 - p) ** 3)
      if (kind === 'drop') group.position.y = 2.6 * (1 - easeOutBack(p))
    }
    shafts.visible = dust.visible = revealed && (still || clock - revealAt > 1.4)
    if (building) active = true
    // Marks the stage once the room has assembled and every agent is in place.
    if (revealed && (still || clock - revealAt > 2.9) && stage && !stage.hasAttribute('data-assembled')) stage.setAttribute('data-assembled', '')

    // Camera: the goal (room, agent or flight), the user's orbit and the mouse sway.
    if (flights[0]?.curve) {
      const flight = flights[0]
      goal.target.copy(plane.visible ? plane.position : flight.to).setY(Math.max(0.8, (plane.visible ? plane.position.y : flight.to.y) - 0.4))
      goal.dist = fit * (compact ? 0.62 : 0.56)
      goal.el = VIEW.el - 0.06
    }
    sway.x = damp(sway.x, sway.tx, 2.5, dt)
    sway.y = damp(sway.y, sway.ty, 2.5, dt)
    const aimAz = goal.az + orbit.az + (still ? 0 : sway.x * 0.05)
    const aimEl = Math.max(0.22, Math.min(1.05, goal.el + orbit.el + (still ? 0 : sway.y * 0.03)))
    const swoop = building ? 1 - easeInOut(clamp01((clock - revealAt) / 2.2)) : 0
    const settle = still ? 1 : 1 - Math.exp(-3.2 * dt)
    cam.az += (aimAz - cam.az) * settle
    cam.el += (aimEl + swoop * 0.42 - cam.el) * settle
    cam.dist += (goal.dist * (1 + swoop * 0.3) - cam.dist) * settle
    cam.target.lerp(goal.target, settle)
    const moving = Math.abs(aimAz - cam.az) + Math.abs(aimEl + swoop * 0.42 - cam.el) + Math.abs(goal.dist - cam.dist) / fit + cam.target.distanceTo(goal.target) > 1e-3
    place(cam.target, cam.az, cam.el, cam.dist)
    if (moving) active = true

    // Agents.
    for (const rig of rigs) if (animateRig(rig, dt)) active = true

    // Requests in flight, and a declined one falling to the floor.
    for (let i = flights.length - 1; i >= 0; i--) {
      const flight = flights[i]
      if (flight.wait > 0) { flight.wait -= still ? flight.wait : dt; active = true; continue }
      if (!flight.curve) {
        flight.from = flight.source()
        flight.to = flight.dest()
        const middle = flight.from.clone().lerp(flight.to, 0.5)
        middle.y = Math.max(flight.from.y, flight.to.y) + 0.8 + flight.from.distanceTo(flight.to) * 0.12
        flight.curve = new THREE.QuadraticBezierCurve3(flight.from, middle, flight.to)
        flight.duration = 0.62 + flight.from.distanceTo(flight.to) * 0.085
        flight.trail = new THREE.Mesh(new THREE.TubeGeometry(flight.curve, 64, 0.012, 6, false), new THREE.MeshBasicMaterial({ color: flight.color, transparent: true, opacity: 0.75, depthWrite: false }))
        flight.trail.geometry.setDrawRange(0, 0)
        scene.add(flight.trail)
        plane.visible = !still
        plane.scale.setScalar(1)
        flight.onStart?.()
      }
      flight.t = still ? 1 : flight.t + dt / flight.duration
      const p = easeInOut(clamp01(flight.t))
      flight.curve.getPointAt(p, plane.position)
      flight.curve.getTangentAt(Math.min(0.999, p), v)
      plane.lookAt(w3.copy(plane.position).add(v))
      plane.rotateZ(Math.sin(p * Math.PI) * 0.6)
      const count = flight.trail.geometry.index.count
      flight.trail.geometry.setDrawRange(0, Math.floor((count * p) / 6) * 6)
      active = true
      if (flight.t >= 1) {
        flights.splice(i, 1)
        fading.push({ trail: flight.trail, t: 0 })
        if (flight.bounce && !still) fall = { t: 0, from: plane.position.clone(), dir: flight.from.clone().sub(flight.to).setY(0).normalize() }
        else plane.visible = false
        flight.onArrive?.()
        flight.resolve()
      }
    }
    for (let i = fading.length - 1; i >= 0; i--) {
      const item = fading[i]
      item.t += still ? 1 : dt / 1.2
      item.trail.material.opacity = 0.75 * (1 - clamp01(item.t))
      active = true
      if (item.t >= 1) { fading.splice(i, 1); item.trail.removeFromParent(); item.trail.geometry.dispose(); item.trail.material.dispose() }
    }
    if (fall) {
      fall.t += dt
      const p = fall.t / 0.9
      plane.position.copy(fall.from).addScaledVector(fall.dir, p * 0.9)
      plane.position.y = Math.max(0.03, fall.from.y + 0.5 * p - 2.2 * p * p)
      plane.rotation.set(p * 4, p * 2, p * 3)
      plane.scale.setScalar(Math.max(0.001, 1 - clamp01((fall.t - 1.4) / 0.4)))
      active = true
      if (fall.t > 1.8) { fall = null; plane.visible = false }
    }

    // The room's small life: steam, plants, dust, screens, the clock.
    if (revealed && !still) {
      for (const { puff, y, phase } of steam) {
        const rise = (clock * 0.45 + phase) % 1
        puff.position.y = y + rise * 0.42
        puff.scale.set(0.8 + rise * 0.6, 1.6, 0.8 + rise * 0.6)
      }
      for (const { crown, phase } of sways) crown.rotation.z = Math.sin(clock * 0.9 + phase) * 0.03
      for (const { body, tail } of cats) { body.scale.y = 0.62 + Math.sin(clock * 1.4) * 0.025; tail.rotation.z = Math.sin(clock * 0.8) * 0.22 }
      M.fairy.emissiveIntensity = 1.4 + Math.sin(clock * 2.2) * 0.4
      M.fairyAlt.emissiveIntensity = 1.2 + Math.sin(clock * 2.2 + 2) * 0.4
      const positions = dustGeometry.attributes.position
      for (let i = 0; i < dustCount; i++) {
        let y = positions.getY(i) + dt * (0.04 + (i % 5) * 0.012)
        if (y > 2.9) y = 0.3
        positions.setY(i, y)
        positions.setX(i, positions.getX(i) + Math.sin(clock * 0.6 + i) * dt * 0.03)
      }
      positions.needsUpdate = true
      screenTexture.offset.y = (screenTexture.offset.y + dt * 0.035) % 1
      clockTime += dt
      M.shaft.opacity = 0.28 + Math.sin(clock * 0.5) * 0.05
      active = true
    }
    minuteHand.rotation.z = -((clockTime % 3600) / 3600) * Math.PI * 2
    hourHand.rotation.z = -((clockTime % 43200) / 43200) * Math.PI * 2

    if (dirty || active) {
      renderer.render(scene, camera)
      placeOverlay()
      dirty = false
      idle = 0
    } else if (++idle > 3) {
      running = false
      cancelAnimationFrame(frame)
    }
  }
  const fading = []

  function update() {
    const should = ready && onScreen && !document.hidden && !disposed
    if (should && !running) { running = true; last = 0; frame = requestAnimationFrame(tick) }
    else if (!should && running) { running = false; cancelAnimationFrame(frame) }
  }
  function wake() {
    dirty = true
    idle = 0
    update()
  }

  // ─── What the page asks for ───
  const handOf = rig => {
    rig.root.updateMatrixWorld(true)
    rig.arms[1].grip.getWorldPosition(w3)
    return w3.clone()
  }
  const chestOf = rig => new THREE.Vector3(rig.greet.x, 1.12, rig.greet.z)
  function focus(key) {
    const rig = key ? byKey[key] : null
    for (const other of rigs) if (other !== rig && other.mode !== 'work' && !flights.length) other.mode = 'work'
    focused = rig
    if (rig) {
      rig.mode = 'greet'
      rig.waveAt = clock + 0.45
      goal.target.set(rig.greet.x, 1.05, rig.greet.z)
      goal.dist = fit * (compact ? 0.42 : 0.34)
      goal.el = VIEW.el - 0.14
    } else {
      goal.target.copy(HOME)
      goal.dist = fit
      goal.el = VIEW.el
      orbit.az = orbit.el = 0
      for (const other of rigs) other.mode = 'work'
    }
    goal.az = VIEW.az
    wake()
  }
  function speak(key, ms = 0, mood) {
    speaker = key ? byKey[key] || null : null
    if (speaker) {
      speaker.talkUntil = clock + ms / 1000
      if (mood === 'decline') speaker.shakeUntil = clock + 1.2
      if (bubble) bubbleBox = { w: bubble.offsetWidth, h: bubble.offsetHeight }
    }
    wake()
  }
  const launch = (options) => new Promise(resolve => { flights.push({ t: 0, ...options, resolve }); wake() })
  function arrive(key, { bounce = false } = {}) {
    const rig = byKey[key]
    if (!rig) return Promise.resolve()
    rig.mode = 'turn'
    rig.look.copy(DOOR).setY(0)
    return launch({
      wait: still ? 0 : 0.5, bounce, color: AGENT_COLORS[key],
      source: () => DOOR.clone(), dest: () => chestOf(rig),
      onStart: () => { rig.catchAt = clock + 0.8 },
      onArrive: () => { rig.catchAt = clock; rig.mode = 'greet'; rig.waveAt = -9 },
    })
  }
  function travel(fromKey, toKey) {
    const a = byKey[fromKey], b = byKey[toKey]
    if (!a || !b) return Promise.resolve()
    a.mode = 'turn'
    a.look.copy(b.greet)
    b.mode = 'turn'
    b.look.copy(a.greet)
    a.throwAt = clock + (still ? -9 : 0.34)
    return launch({
      wait: still ? 0 : 0.6, color: AGENT_COLORS[toKey],
      source: () => handOf(a), dest: () => chestOf(b),
      onStart: () => { b.catchAt = clock + 1 },
      onArrive: () => { b.catchAt = clock; b.mode = 'greet'; b.waveAt = -9; a.mode = 'work' },
    })
  }
  function clearRoute() {
    for (const flight of flights.splice(0)) { if (flight.trail) { flight.trail.removeFromParent(); flight.trail.geometry.dispose(); flight.trail.material.dispose() } flight.resolve() }
    for (const item of fading.splice(0)) { item.trail.removeFromParent(); item.trail.geometry.dispose(); item.trail.material.dispose() }
    fall = null
    plane.visible = false
    for (const rig of rigs) rig.throwAt = rig.catchAt = -9
    wake()
  }
  function reveal() {
    if (revealed) return
    revealed = true
    revealAt = clock
    // The camera starts high and settles while the room assembles.
    if (!still) { cam.el = goal.el + 0.42; cam.dist = goal.dist * 1.3 }
    wake()
  }
  function setStill(value) {
    still = Boolean(value)
    wake()
  }

  const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) wake(); else update() })
  const sizes = new ResizeObserver(layout)
  const onVisibility = () => update()
  const onContextLost = event => { event.preventDefault(); dispose(); onLost?.() }

  function dispose() {
    if (disposed) return
    disposed = true
    running = false
    cancelAnimationFrame(frame)
    seen.disconnect()
    sizes.disconnect()
    clearRoute()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerleave', onLeave)
    canvas.removeEventListener('pointercancel', onLeave)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    document.removeEventListener('visibilitychange', onVisibility)
    stage?.removeAttribute('data-compact'); stage?.removeAttribute('data-dragging')
    for (const geometry of geometries) geometry.dispose()
    for (const material of materials) material.dispose()
    for (const texture of textures) texture.dispose()
    environment.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointercancel', onLeave)
  canvas.addEventListener('webglcontextlost', onContextLost)
  document.addEventListener('visibilitychange', onVisibility)
  seen.observe(canvas)
  sizes.observe(canvas)
  layout()
  cam.dist = goal.dist = fit
  place(cam.target, cam.az, cam.el, cam.dist)
  // Compile every material program before the first frame (hidden objects are skipped by the
  // compiler, so the ones that start hidden are shown for it), then start drawing.
  for (const { group } of batches) group.visible = true
  for (const rig of rigs) { rig.root.visible = true; rig.ring.visible = true }
  plane.visible = true
  renderer.compileAsync(scene, camera).catch(() => undefined).then(() => {
    if (disposed) return
    for (const { group } of batches) group.visible = false
    for (const rig of rigs) { rig.root.visible = false; rig.ring.visible = false }
    plane.visible = false
    ready = true
    wake()
    onReady?.()
  })

  return { focus, speak, arrive, travel, clearRoute, reveal, setStill, dispose }
}
