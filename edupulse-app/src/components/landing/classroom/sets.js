import * as THREE from 'three'
import { createRobots } from './robot'
import { AGENT_COLORS } from '../agentLook'

const H = 5.2 // wall height of a classroom
const TIER = 1.16 // height of the classmates' tier in classroom B
const BUILDING_RATIO = 252 / 2000 // height / width of the KCP building picture
const ROLE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6']

// The school, built once from primitives in the agent workspace's style. Rooms are shells of
// inward-facing walls, so the camera can stand behind a wall and still look in, as it does in the
// workspace. A room's `fits` entry lines its props up with the page's measured layout.
export function buildSets(kit, { buildingUrl }) {
  const { M, mat, put, box, cyl, ball, flat, live, floorMaterial, bake } = kit
  const { robot } = createRobots(kit)
  const sets = {}, doors = {}, fits = {}, anchors = {}
  const ticksOf = {}
  const group = name => { const g = new THREE.Group(); g.visible = false; sets[name] = g; ticksOf[name] = []; return g }
  const tick = (name, fn) => ticksOf[name].push(fn)

  // ─── Walls ───
  // One wall of a shell, along `axis` at `fixed`, facing `facing` (+1 or -1 along the other axis).
  const ROT = { x: { 1: 0, [-1]: Math.PI }, z: { 1: Math.PI / 2, [-1]: -Math.PI / 2 } }
  const wallPiece = (g, axis, fixed, a, b, y0, y1, facing, material, lift = 0) => {
    if (b - a < 0.001 || y1 - y0 < 0.001) return
    const mid = (a + b) / 2, off = fixed + facing * lift
    const piece = axis === 'x'
      ? flat(g, b - a, y1 - y0, mid, (y0 + y1) / 2, off, material, ROT.x[facing])
      : flat(g, b - a, y1 - y0, off, (y0 + y1) / 2, mid, material, ROT.z[facing])
    return piece
  }
  const wall = (g, axis, fixed, a, b, facing, material, { h = H, gaps = [], wainscot = M.wainscot } = {}) => {
    const spans = []
    let from = a
    for (const [g0, g1, top] of [...gaps].sort((p, q) => p[0] - q[0])) {
      spans.push([from, g0])
      wallPiece(g, axis, fixed, g0, g1, top, h, facing, material)
      from = g1
    }
    spans.push([from, b])
    for (const [s0, s1] of spans) {
      wallPiece(g, axis, fixed, s0, s1, 0, h, facing, material)
      if (wainscot) {
        wallPiece(g, axis, fixed, s0, s1, 0, 0.95, facing, wainscot, 0.012)
        const mid = (s0 + s1) / 2, len = s1 - s0, off = fixed + facing * 0.03
        if (axis === 'x') { box(g, len, 0.06, 0.05, mid, 0.97, off, M.trim, 0, false); box(g, len, 0.12, 0.05, mid, 0.06, off, M.trim, 0, false) }
        else { box(g, 0.05, 0.06, len, off, 0.97, mid, M.trim, 0, false); box(g, 0.05, 0.12, len, off, 0.06, mid, M.trim, 0, false) }
      }
    }
  }
  const floor = (g, x0, x1, z0, z1) => box(g, x1 - x0, 0.26, z1 - z0, (x0 + x1) / 2, -0.13, (z0 + z1) / 2, floorMaterial(x1 - x0, z1 - z0), 0, false)

  // A doorway's frame and hinged leaves. The frame's opening runs from a to b along the wall.
  const doorway = (g, name, axis, fixed, a, b, top, leaves) => {
    const w = b - a, mid = (a + b) / 2, thick = 0.14, deep = 0.3
    const part = (cx, cy, sx, sy) => (axis === 'x' ? box(g, sx, sy, deep, cx, cy, fixed, M.trim, 0, false) : box(g, deep, sy, sx, fixed, cy, cx, M.trim, 0, false))
    part(a - thick / 2, top / 2, thick, top)
    part(b + thick / 2, top / 2, thick, top)
    part(mid, top + thick / 2, w + thick * 2, thick)
    doors[name] = (doors[name] || []).concat(leaves.map(([at, base, dir, width]) => {
      const hinge = live(new THREE.Group())
      if (axis === 'x') hinge.position.set(at, 0, fixed)
      else hinge.position.set(fixed, 0, at)
      hinge.rotation.y = base
      g.add(hinge)
      const leafH = top - 0.04
      box(hinge, width, leafH, 0.08, width / 2, leafH / 2, 0, M.blue, 0.012, false)
      box(hinge, width * 0.62, leafH * 0.3, 0.09, width / 2, leafH * 0.68, 0, M.sky, 0.01, false)
      box(hinge, width * 0.7, 0.05, 0.1, width / 2, leafH * 0.48, 0, M.trim, 0, false)
      ball(hinge, 0.05, width - 0.12, leafH * 0.45, 0.07, M.brass, 1, 1, 1, false)
      ball(hinge, 0.05, width - 0.12, leafH * 0.45, -0.07, M.brass, 1, 1, 1, false)
      return { hinge, base, dir }
    }))
  }

  // ─── Props ───
  const plant = (g, x, z, size = 1, tall = false, name) => {
    cyl(g, 0.2 * size, 0.15 * size, 0.36 * size, x, 0.18 * size, z, M.pot, 16)
    const crown = live(new THREE.Group())
    crown.position.set(x, 0.36 * size, z)
    g.add(crown)
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
    if (name) tick(name, time => { crown.rotation.z = Math.sin(time * 0.9 + x + z) * 0.022; crown.rotation.x = Math.sin(time * 0.7 + z) * 0.018 })
  }
  const chair = (g, x, z, yaw) => {
    const c = new THREE.Group()
    c.position.set(x, 0, z)
    c.rotation.y = yaw
    g.add(c)
    box(c, 0.5, 0.06, 0.48, 0, 0.47, 0, M.soft, 0.02)
    box(c, 0.46, 0.34, 0.05, 0, 0.78, -0.22, M.soft, 0.02)
    for (const [lx, lz] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) cyl(c, 0.018, 0.018, 0.46, lx, 0.23, lz, M.steel, 6)
    return c
  }
  const windowOn = (g, x, y, z, rotY, w = 1.7, h = 1.9) => {
    const f = new THREE.Group()
    f.position.set(x, y, z)
    f.rotation.y = rotY
    g.add(f)
    box(f, w, h, 0.02, 0, 0, 0.005, M.sky, 0, false)
    for (const [fw, fh, fx, fy] of [[w + 0.14, 0.08, 0, h / 2 + 0.03], [w + 0.14, 0.08, 0, -h / 2 - 0.03], [0.08, h + 0.12, w / 2 + 0.03, 0], [0.08, h + 0.12, -w / 2 - 0.03, 0], [0.04, h, 0, 0], [w, 0.04, 0, 0]]) box(f, fw, fh, 0.07, fx, fy, 0.04, M.trim, 0.012, false)
    box(f, w + 0.28, 0.06, 0.24, 0, -h / 2 - 0.08, 0.11, M.oak, 0.02, false)
  }
  const fairyLights = (g, axis, a, b, fixed, y, count = 26, sag = 0.2) => {
    for (let i = 0; i <= count; i++) {
      const along = a + (i / count) * (b - a), dip = Math.sin(((i % 9) / 9) * Math.PI) * sag
      if (axis === 'x') ball(g, 0.04, along, y - dip, fixed, i % 2 ? M.fairy : M.fairyAlt, 1, 1.2, 1, false)
      else ball(g, 0.04, fixed, y - dip, along, i % 2 ? M.fairyAlt : M.fairy, 1, 1.2, 1, false)
    }
  }
  const FLAG = [0xf59e0b, 0xf87171, 0x2563eb, 0x34d399, 0xa78bfa, 0xf9a8d4].map(color => mat(color, { roughness: 0.6, side: THREE.DoubleSide }))
  const triangle = new THREE.CircleGeometry(0.17, 3)
  kit.geometries.add(triangle)
  const bunting = (g, axis, a, b, fixed, y, sag = 0.34, count = 16) => {
    for (let i = 0; i <= count; i++) {
      const u = i / count, along = a + u * (b - a), flagY = y - Math.sin(u * Math.PI) * sag
      const flag = new THREE.Mesh(triangle.clone(), FLAG[i % FLAG.length])
      kit.geometries.add(flag.geometry)
      flag.rotation.z = -Math.PI / 2
      if (axis === 'x') flag.position.set(along, flagY, fixed)
      else { flag.position.set(fixed, flagY, along); flag.rotation.y = Math.PI / 2 }
      g.add(flag)
    }
  }
  const clock = (g, name, x, y, z, rotY = 0, size = 1) => {
    const f = live(new THREE.Group())
    f.position.set(x, y, z)
    f.rotation.y = rotY
    f.scale.setScalar(size)
    g.add(f)
    cyl(f, 0.36, 0.36, 0.05, 0, 0, 0, M.ink, 32, false).rotation.x = Math.PI / 2
    cyl(f, 0.31, 0.31, 0.06, 0, 0, 0.004, M.white, 32, false).rotation.x = Math.PI / 2
    const hour = new THREE.Group(), minute = new THREE.Group()
    f.add(hour, minute)
    box(hour, 0.03, 0.17, 0.01, 0, 0.07, 0.04, M.ink, 0, false)
    box(minute, 0.02, 0.25, 0.01, 0, 0.11, 0.045, M.blue, 0, false)
    tick(name, time => { minute.rotation.z = -time * 0.1; hour.rotation.z = -time * 0.1 / 12 - 1 })
    return f
  }
  const lockers = (g, x0, count, z) => {
    for (let i = 0; i < count; i++) {
      const x = x0 + i * 0.66
      box(g, 0.62, 2.2, 0.5, x, 1.1, z + 0.25, i % 3 === 1 ? M.soft : M.blue, 0.025)
      for (let v = 0; v < 3; v++) box(g, 0.3, 0.025, 0.01, x, 1.86 - v * 0.06, z + 0.505, M.frost, 0, false)
      box(g, 0.05, 0.16, 0.02, x + 0.2, 1.2, z + 0.51, M.steel, 0.008, false)
    }
  }
  const BOOKS = [M.blue, M.amber, M.coral, M.mint, M.violet, M.soft, M.pink, M.white]
  const shelf = (g, x, z, rotY, w = 1.7, h = 2.5) => {
    const s = new THREE.Group()
    s.position.set(x, 0, z)
    s.rotation.y = rotY
    g.add(s)
    box(s, w, h, 0.05, 0, h / 2, -0.17, M.walnut, 0, false)
    for (const dx of [-w / 2, w / 2]) box(s, 0.06, h, 0.36, dx, h / 2, 0, M.oak, 0.01)
    const rows = 4
    for (let r = 0; r <= rows; r++) {
      const y = 0.08 + r * ((h - 0.16) / rows)
      box(s, w, 0.05, 0.36, 0, y, 0, M.oak, 0.008)
      if (r === rows) break
      let bx = -w / 2 + 0.1
      let i = r * 3
      while (bx < w / 2 - 0.16) {
        const bw = 0.06 + (i % 3) * 0.022, bh = 0.32 + ((i * 7) % 5) * 0.03
        box(s, bw, bh, 0.24, bx + bw / 2, y + 0.025 + bh / 2, 0.02, BOOKS[i % BOOKS.length], 0.006)
        bx += bw + 0.012
        i++
      }
    }
  }
  const poster = (g, x, y, z, rotY, w, h, palette) => {
    const p = new THREE.Group()
    p.position.set(x, y, z)
    p.rotation.y = rotY
    g.add(p)
    box(p, w + 0.08, h + 0.08, 0.03, 0, 0, 0, M.trim, 0.01, false)
    box(p, w, h, 0.01, 0, 0, 0.02, palette[0], 0, false)
    palette.slice(1).forEach((m, i) => ball(p, 0.16 - i * 0.03, -w * 0.2 + i * w * 0.24, h * 0.14 - i * h * 0.2, 0.03, m, 1, 1, 0.2, false))
  }
  // A surface with a frame, sized from the page: a unit face and four rails.
  const framed = (parent, faceMaterial, rim, { thick = 0.09, depth = 0.08, lift = 0.015 } = {}) => {
    const g = live(new THREE.Group())
    parent.add(g)
    const face = box(g, 1, 1, 0.02, 0, 0, 0, faceMaterial, 0, false)
    const rails = [0, 1, 2, 3].map(() => box(g, 1, 1, 1, 0, 0, depth / 2 - 0.01, rim, 0, true))
    const setSize = (w, h) => {
      face.scale.set(w, h, 1)
      rails[0].scale.set(w + thick * 2, thick, depth); rails[0].position.y = h / 2 + thick / 2
      rails[1].scale.set(w + thick * 2, thick, depth); rails[1].position.y = -h / 2 - thick / 2
      rails[2].scale.set(thick, h, depth); rails[2].position.x = -w / 2 - thick / 2
      rails[3].scale.set(thick, h, depth); rails[3].position.x = w / 2 + thick / 2
    }
    setSize(1, 1)
    const place = (position, quaternion) => { g.position.copy(position); g.quaternion.copy(quaternion); g.translateZ(lift) }
    return { group: g, setSize, place }
  }

  // ─── Outdoors, shared by the campus and the yard ───
  const tree = (g, x, z, size = 1) => {
    cyl(g, 0.16 * size, 0.24 * size, 1.9 * size, x, 0.95 * size, z, M.trunk, 8)
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05
      ball(g, (0.82 + (i % 3) * 0.18) * size, x + Math.sin(a) * 0.62 * size, (2.4 + (i % 2) * 0.55) * size, z + Math.cos(a) * 0.62 * size, i % 2 ? M.canopy : M.canopyDeep, 1, 0.86, 1)
    }
  }
  const hedge = (g, x0, x1, z, r = 0.55) => {
    for (let x = x0, i = 0; x <= x1; x += r * 1.35, i++) ball(g, r * (0.86 + (i % 3) * 0.12), x, r * 0.55, z, i % 2 ? M.canopy : M.canopyDeep, 1.05, 0.85, 0.85, false)
  }
  // A plank fence with posts, two rails and a cap in the building's blue. `k` scales it with the
  // picture it stands beside; posts stand at both ends.
  const fence = (g, x0, x1, z, h, k = 1) => {
    const plank = 0.4 * k, gap = 0.05 * k
    for (let x = x0 + plank / 2, i = 0; x <= x1 - plank / 2 + 1e-6; x += plank + gap, i++) {
      const ph = h - (i % 3 === 1 ? 0.08 * k : 0)
      box(g, plank, ph, 0.06 * k, x, ph / 2, z, i % 2 ? M.oak : M.wainscot, 0, false)
    }
    for (const y of [0.3, 0.78]) box(g, x1 - x0, 0.16 * k, 0.06 * k, (x0 + x1) / 2, h * y, z + 0.06 * k, M.deepWood, 0, false)
    const posts = Math.max(1, Math.round((x1 - x0) / (2.4 * k)))
    for (let i = 0; i <= posts; i++) box(g, 0.22 * k, h + 0.2 * k, 0.2 * k, x0 + (i * (x1 - x0)) / posts, (h + 0.2 * k) / 2, z, M.deepWood, 0, false)
    box(g, x1 - x0 + 0.3 * k, 0.12 * k, 0.26 * k, (x0 + x1) / 2, h + 0.06 * k, z, M.blue, 0, false)
  }
  const cloudGroups = []
  const clouds = (g, name, list) => {
    const drift = live(new THREE.Group())
    g.add(drift)
    cloudGroups.push(drift)
    for (const [x, y, z, s] of list) {
      for (let i = 0; i < 5; i++) ball(drift, s * (0.6 + (i % 3) * 0.22), x + (i - 2) * s * 0.75, y + (i % 2) * s * 0.24, z, M.cloud, 1.15, 0.72, 0.7, false)
    }
    tick(name, time => { drift.position.x = Math.sin(time * 0.03) * 5 })
  }
  // The KCP building: the owner's cut-out photograph standing behind the hedges. Pieces of the same
  // picture leave an opening where a doorway has to see through it.
  const buildingMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.03, toneMapped: false, side: THREE.DoubleSide })
  kit.materials.add(buildingMaterial)
  const buildingTexture = new THREE.TextureLoader().load(buildingUrl, () => { buildingMaterial.needsUpdate = true })
  buildingTexture.colorSpace = THREE.SRGBColorSpace
  buildingTexture.anisotropy = 8
  kit.textures.add(buildingTexture)
  buildingMaterial.map = buildingTexture
  const buildingPiece = (g, cx, base, z, width, height, u0, u1, v0, v1) => {
    const w = (u1 - u0) * width, h = (v1 - v0) * height
    const geometry = new THREE.PlaneGeometry(w, h)
    const uv = geometry.attributes.uv
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0)
    const x = cx + ((u0 + u1) / 2 - 0.5) * width, y = base + ((v0 + v1) / 2) * height
    const piece = put(geometry, buildingMaterial, g, x, y, z, false)
    piece.receiveShadow = false
    piece.renderOrder = 1
    return piece
  }

  // ─── The campus: the hero's lawn, path, portico and building ───
  {
    const g = group('campus')
    put(new THREE.CircleGeometry(120, 48), M.grass, g, 0, -0.05, -30, false).rotation.x = -Math.PI / 2
    const path = box(g, 6, 0.04, 58, 0, 0.02, -8, M.stone, 0, false)
    path.receiveShadow = true
    // Moved along so the portico stands at the glass wing and the name on the building stays clear.
    const WIDTH = 56, HEIGHT = WIDTH * BUILDING_RATIO, Z = -40, BASE = -0.1, SHIFT = 11.2
    // Left, right and above the portico's doorway.
    const gapL = 0.5 + (-1.75 - SHIFT) / WIDTH, gapR = 0.5 + (1.75 - SHIFT) / WIDTH, gapTop = 3.4 / HEIGHT
    buildingPiece(g, SHIFT, BASE, Z, WIDTH, HEIGHT, 0, gapL, 0, 1)
    buildingPiece(g, SHIFT, BASE, Z, WIDTH, HEIGHT, gapR, 1, 0, 1)
    buildingPiece(g, SHIFT, BASE, Z, WIDTH, HEIGHT, gapL, gapR, gapTop, 1)
    // The portico in front of the doorway, roofed in the building's blue.
    box(g, 8, 0.2, 4, 0, 0.1, -37.9, M.frost, 0.03, false)
    box(g, 7, 0.2, 1.1, 0, 0.1, -35.5, M.frost, 0.03, false)
    for (const x of [-3.1, 3.1]) { cyl(g, 0.2, 0.24, 3.95, x, 2.15, -36.6, M.trim, 16); cyl(g, 0.2, 0.24, 3.95, x, 2.15, -39.3, M.trim, 16) }
    box(g, 8.4, 0.34, 4.5, 0, 4.3, -38, M.roof, 0.06)
    box(g, 7.4, 0.5, 3.8, 0, 4.65, -38.2, M.soft, 0.06)
    box(g, 2.2, 0.1, 3.6, 0, 4.1, -38, M.trim, 0, false)
    for (const x of [-2.45, 2.45]) box(g, 1.4, 4.1, 0.12, x, 2.05, -40.04, M.trim, 0, false)
    box(g, 3.5, 0.72, 0.12, 0, 3.72, -40.04, M.trim, 0, false)
    doorway(g, 'main', 'x', -40.02, -1.7, 1.7, 3.36, [[-1.7, 0, 1, 1.7], [1.7, Math.PI, -1, 1.7]])
    box(g, 3.4, 0.03, 1.6, 0, 0.02, -40.4, M.stone, 0, false)
    hedge(g, -33, -4.2, -39.2)
    hedge(g, 4.2, 33, -39.2)
    // The picture ends in a cut on the left: a fence carries the frontage on from there and a tree
    // stands at the cut, so the building reads as part of a longer campus.
    fence(g, -36, -16.3, -39.78, 3, 1)
    tree(g, -17.4, -38.3, 1.75)
    for (const [x, z, s] of [[-13, -24, 1.5], [18.2, -25, 1.7], [-20, -14, 1.9], [21, -14, 2], [-24, -33, 1.7], [31, -36, 1.8], [-8, -32, 1], [5.2, -33, 0.95]]) tree(g, x, z, s)
    for (const x of [-4.4, 4.4]) for (const z of [-32, -25, -18]) {
      cyl(g, 0.05, 0.07, 2.6, x, 1.3, z, M.ink, 8)
      ball(g, 0.2, x, 2.75, z, M.lampGlow, 1, 1, 1, false)
    }
    // A flag on its pole beside the path.
    cyl(g, 0.06, 0.08, 7.6, -11, 3.8, -33, M.steel, 8)
    box(g, 1.7, 1, 0.03, -10.1, 6.95, -33, M.blue, 0, false)
    bake(g)
    clouds(g, 'campus', [[-30, 21, -92, 5], [8, 27, -100, 6], [34, 18, -88, 4.2], [-12, 15, -82, 3], [52, 25, -104, 6]])
    const walkers = [robot(g, AGENT_COLORS.guardian, { x: -2, z: -31, yaw: Math.PI * 0.9, scale: 1.1, phase: 0.2 }), robot(g, AGENT_COLORS.writer, { x: 1.9, z: -24, yaw: -0.4, scale: 1.1, phase: 1.3 }), robot(g, AGENT_COLORS.ranker, { x: -8, z: -20, yaw: 0.6, scale: 1.1, phase: 2.1 })]
    walkers[1].setExcited(true)
    tick('campus', time => walkers.forEach(w => w.update(time)))
  }

  // ─── The corridor: bulletin board, lockers, the classroom door and the gallery wing ───
  {
    const g = group('corridor')
    floor(g, -18, 46, -48, -40)
    wall(g, 'x', -48, -18, 46, 1, M.wallWarm, { gaps: [[5, 6.5, 2.9]] })
    wall(g, 'x', -41, -18, 46, -1, M.wallWarm, { gaps: [[-1.7, 1.7, 3.36]] })
    wall(g, 'z', 46, -48, -41, -1, M.wallWarm, { gaps: [[-46.2, -42.8, 3.5]] })
    wall(g, 'z', -18, -48, -41, 1, M.wall)
    doorway(g, 'a', 'x', -48, 5, 6.5, 2.9, [[5, 0, 1, 1.5]])
    doorway(g, 'hall', 'z', 46, -46.2, -42.8, 3.5, [[-46.2, -Math.PI / 2, 1, 1.7], [-42.8, Math.PI / 2, -1, 1.7]])
    lockers(g, -11.2, 11, -48)
    lockers(g, 7.2, 9, -48)
    fairyLights(g, 'x', -14, 14, -47.86, 4.72, 34, 0.18)
    fairyLights(g, 'x', 26.5, 45.5, -47.86, 4.78, 26, 0.16)
    for (const x of [-10, -5, 5, 10, 20, 30, 40]) windowOn(g, x, 2.25, -41.02, Math.PI, 2.1, 2)
    plant(g, 3.9, -47.2, 1.05, true, 'corridor')
    plant(g, -12.4, -47.1, 1.1, false, 'corridor')
    plant(g, 26.6, -47.2, 1.2, true, 'corridor')
    plant(g, 45.2, -47.3, 1.1, false, 'corridor')
    plant(g, 31.85, -47.2, 1.25, true, 'corridor')
    plant(g, 40.15, -47.2, 1.25, true, 'corridor')
    // A bench and a water fountain along the way to the gallery.
    box(g, 2.6, 0.08, 0.5, 19, 0.5, -47.4, M.oak, 0.02)
    for (const x of [18, 20]) box(g, 0.08, 0.5, 0.42, x, 0.25, -47.4, M.steel, 0.01)
    poster(g, 16.4, 2.2, -47.9, 0, 1, 1.4, [M.backdrop, M.amber, M.blue, M.coral])
    poster(g, 18.2, 2.2, -47.9, 0, 1, 1.4, [M.wall, M.mint, M.violet, M.blue])
    poster(g, 20, 2.2, -47.9, 0, 1, 1.4, [M.wallButter, M.coral, M.soft, M.mint])
    clock(g, 'corridor', 4.3, 3.4, -47.92, 0, 0.7)
    bake(g)
    const board = framed(g, M.cork, M.walnut, { thick: 0.12 })
    fits.problem = ({ P, S, anchor, quaternion }) => {
      board.setSize(S(anchor.w) + 0.3, S(anchor.h) + 0.34)
      board.place(P(anchor.x + anchor.w / 2, anchor.y + anchor.h / 2, -0.07), quaternion)
    }
    const frames = [0, 1, 2].map(() => framed(g, M.backdrop, M.walnut, { thick: 0.08, depth: 0.1 }))
    const lamps = [0, 1, 2].map(() => {
      const lamp = live(new THREE.Group())
      g.add(lamp)
      box(lamp, 0.7, 0.05, 0.05, 0, 0, 0.16, M.brass, 0.015, false)
      box(lamp, 0.04, 0.04, 0.2, 0, 0, 0.06, M.brass, 0, false)
      ball(lamp, 0.05, 0, -0.03, 0.16, M.lampGlow, 3.4, 0.6, 0.8, false)
      return lamp
    })
    const goals = framed(g, M.wallButter, M.oak, { thick: 0.07, depth: 0.08 })
    fits.impact = ({ P, S, items, quaternion }) => {
      items.frames.forEach((r, i) => {
        if (!frames[i]) return
        frames[i].setSize(S(r.w) + 0.1, S(r.h) + 0.1)
        frames[i].place(P(r.x + r.w / 2, r.y + r.h / 2, -0.07), quaternion)
        lamps[i].position.copy(P(r.x + r.w / 2, r.y, 0.06)).add(new THREE.Vector3(0, 0.2, 0))
      })
      const r = items.goals[0]
      if (r) { goals.setSize(S(r.w) + 0.1, S(r.h) + 0.1); goals.place(P(r.x + r.w / 2, r.y + r.h / 2, -0.07), quaternion) }
    }
  }

  // ─── Classroom A: the blackboard wall and the class seats ───
  {
    const g = group('roomA')
    floor(g, 2, 14, -60, -48)
    wall(g, 'x', -60, 2, 14, 1, M.wallWarm)
    wall(g, 'x', -48, 2, 14, -1, M.wall, { gaps: [[5, 6.5, 2.9]] })
    wall(g, 'z', 2, -60, -48, 1, M.wallWarm)
    wall(g, 'z', 14, -60, -48, -1, M.wallWarm, { gaps: [[-54, -52.4, 2.9]] })
    doorway(g, 'b', 'z', 14, -54, -52.4, 2.9, [[-54, -Math.PI / 2, 1, 1.6]])
    for (const z of [-57, -53.2, -49.8]) windowOn(g, 2.02, 2.4, z, Math.PI / 2, 2.1, 2.2)
    bunting(g, 'x', 2.4, 13.6, -59.86, 5.04, 0.2)
    shelf(g, 13.72, -58.4, -Math.PI / 2, 2.2, 2.4)
    plant(g, 2.7, -59.3, 1.25, true, 'roomA')
    plant(g, 13.3, -49, 1.1, false, 'roomA')
    // A globe and a backpack on the rug, seen from above beside the seats.
    cyl(g, 0.16, 0.2, 0.05, 12.9, 0.04, -49.2, M.walnut, 16)
    cyl(g, 0.025, 0.025, 0.3, 12.9, 0.2, -49.2, M.brass, 6)
    ball(g, 0.3, 12.9, 0.62, -49.2, M.soft)
    box(g, 0.44, 0.5, 0.26, 5.6, 0.25, -52.7, M.coral, 0.1)
    box(g, 0.3, 0.2, 0.08, 5.6, 0.2, -52.54, M.amber, 0.03, false)
    for (let i = 0; i < 4; i++) box(g, 0.5 - i * 0.05, 0.06, 0.36, 4.3, 0.04 + i * 0.065, -52.2, BOOKS[i], 0.012)
    for (const [x, z] of [[-1.1, 0], [-1.1, 1]]) box(g, 0.14, 0.14, 0.14, 5.3 + x, 0.07, -50.5 + z, M.amber, 0.02)
    bake(g)
    clock(g, 'roomA', 12.5, 4.05, -59.9, 0, 0.75)

    const board = framed(g, M.chalk, M.oak, { thick: 0.13, depth: 0.1 })
    const tray = live(new THREE.Group())
    g.add(tray)
    const trayBar = box(tray, 1, 0.05, 0.16, 0, 0, 0.1, M.oak, 0, true)
    for (const [dx, m] of [[-1.5, M.chalkStick], [-1.34, M.amber], [-1.2, M.pink]]) cyl(tray, 0.016, 0.016, 0.13, dx, 0.035, 0.1, m, 8, false).rotation.z = Math.PI / 2
    box(tray, 0.26, 0.06, 0.09, 1.3, 0.05, 0.1, M.ink, 0.015, false)
    const screen = framed(g, M.trim, M.frost, { thick: 0.05, depth: 0.05, lift: 0.03 })
    const roller = live(box(g, 1, 0.09, 0.09, 0, 0, 0, M.frost, 0.02))
    fits.features = ({ P, S, anchor, items, quaternion }) => {
      const w = S(anchor.w) + 0.3, h = S(anchor.h) + 0.3
      const centre = P(anchor.x + anchor.w / 2, anchor.y + anchor.h / 2, -0.07)
      board.setSize(w, h)
      board.place(centre, quaternion)
      tray.position.set(centre.x, centre.y - h / 2 - 0.13, centre.z)
      trayBar.scale.x = w
      const r = items.screen?.[0]
      if (r) {
        const rw = S(r.w) + 0.18, rh = S(r.h) + 0.2
        const c = P(r.x + r.w / 2, r.y + r.h / 2, -0.03)
        screen.setSize(rw, rh)
        screen.place(c, quaternion)
        roller.position.set(c.x, c.y + rh / 2 + 0.07, c.z + 0.05)
        roller.scale.x = rw + 0.24
      }
    }

    // The seats: one long table under each phase card, a chair and a classmate at most of them.
    const desks = [0, 1, 2, 3, 4, 5].map(i => {
      const d = live(new THREE.Group())
      g.add(d)
      const top = box(d, 1, 0.06, 1, 0, 0.76, 0, M.oak, 0, true)
      const legs = [0, 1, 2, 3].map(() => box(d, 0.07, 0.74, 0.07, 0, 0.37, 0, M.white, 0, false))
      const seat = chair(d, 0, 0, Math.PI)
      const keys = Object.keys(AGENT_COLORS)
      const friend = robot(d, AGENT_COLORS[keys[(i * 2) % keys.length]], { seated: true, yaw: Math.PI, phase: i * 0.8 })
      const pencil = cyl(d, 0.016, 0.016, 0.3, 0, 0.8, 0, BOOKS[i % BOOKS.length], 6, false)
      pencil.rotation.set(Math.PI / 2, 0, 0.7)
      tick('roomA', time => friend.update(time))
      return { d, top, legs, seat, friend, pencil }
    })
    fits.flow = ({ P, S, items }) => {
      desks.forEach((desk, i) => {
        const r = items.desks[i]
        desk.d.visible = Boolean(r)
        if (!r) return
        const p = P(r.x + r.w / 2, r.y + r.h / 2)
        const w = S(r.w) + 0.3, depth = S(r.h) + 0.3
        desk.d.position.set(p.x, 0, p.z)
        desk.top.scale.set(w, 1, depth)
        desk.legs.forEach((leg, l) => leg.position.set((l % 2 ? 1 : -1) * (w / 2 - 0.1), 0.37, (l < 2 ? 1 : -1) * (depth / 2 - 0.1)))
        const side = i % 2 ? 0.28 : -0.28
        desk.seat.position.set(side * w, 0, depth / 2 + 0.26)
        desk.friend.root.position.set(side * w, 0, depth / 2 + 0.26)
        desk.pencil.position.set(-side * w * 1.2, 0.8, depth / 2 - 0.05)
      })
    }
  }

  // ─── Classroom B: the classmates and the teacher's desk ───
  {
    const g = group('roomB')
    floor(g, 14, 26, -64, -48)
    wall(g, 'x', -64, 14, 26, 1, M.wallButter)
    wall(g, 'x', -48, 14, 26, -1, M.wallWarm)
    wall(g, 'z', 14, -64, -48, 1, M.wall, { gaps: [[-54, -52.4, 2.9]] })
    wall(g, 'z', 26, -64, -48, -1, M.wallWarm)
    doorway(g, 'b', 'z', 14, -54, -52.4, 2.9, [[-54, -Math.PI / 2, 1, 1.6]])
    for (const z of [-59.5, -55.2, -51]) windowOn(g, 25.98, 2.9, z, -Math.PI / 2, 2.6, 2)
    bunting(g, 'z', -63.5, -48.5, 25.8, 4.6, 0.32, 20)
    fairyLights(g, 'z', -63.6, -48.4, 25.84, 4.05, 30, 0.14)
    // The tier the classmates sit on, as in a lecture room; its front carries the open notebook.
    box(g, 4.25, TIER, 10.15, 23.825, TIER / 2, -53.12, M.oak, 0.015, true)
    box(g, 4.38, 0.08, 10.29, 23.8, TIER + 0.02, -53.12, M.walnut, 0.02, false)
    for (let z = -57.8; z < -47.9; z += 1.04) box(g, 0.03, TIER - 0.1, 0.05, 21.69, TIER / 2 - 0.02, z, M.walnut, 0, false)
    plant(g, 21.1, -49.4, 1.15, true, 'roomB')
    plant(g, 25.2, -62.9, 1.25, false, 'roomB')
    plant(g, 14.8, -63.1, 1.2, true, 'roomB')
    bunting(g, 'x', 14.4, 25.6, -63.84, 4.72, 0.3, 14)
    put(new THREE.CircleGeometry(1.5, 28), M.rugWarm, g, 20, 0.012, -61.6, false).rotation.x = -Math.PI / 2
    bake(g)

    // Five classmates, one per role, each at a desk that carries its name card (the page's tab).
    const row = ROLE_COLORS.map((color, i) => {
      const seat = live(new THREE.Group())
      seat.position.set(22.25, TIER, -58 + i * 2)
      g.add(seat)
      const top = box(seat, 0.7, 0.06, 1.06, -0.1, 0.8, 0, M.oak, 0.015)
      const front = box(seat, 0.04, 0.72, 1, -0.42, 0.42, 0, M.white, 0.01, false)
      for (const dz of [-0.44, 0.44]) box(seat, 0.5, 0.76, 0.05, -0.1, 0.38, dz, M.white, 0.01, false)
      box(seat, 0.2, 0.05, 0.22, -0.16, 0.86, -0.24, BOOKS[i], 0.012, false)
      ball(seat, 0.055, -0.2, 0.89, 0.28, M.apple, 1, 1, 1, false)
      chair(seat, 0.62, 0, -Math.PI / 2)
      const friend = robot(seat, color, { x: 0.58, yaw: -Math.PI / 2, seated: true, phase: i * 1.1 })
      const halo = put(new THREE.TorusGeometry(0.62, 0.03, 8, 40), mat(color, { emissive: color, emissiveIntensity: 0.9 }), seat, 0.4, 0.03, 0, false)
      halo.rotation.x = -Math.PI / 2
      halo.visible = false
      tick('roomB', time => friend.update(time))
      return { seat, top, front, friend, halo }
    })
    const setRole = index => row.forEach((r, i) => { r.friend.setExcited(i === index); r.halo.visible = i === index })
    anchors.setRole = setRole
    setRole(0)
    const notebook = framed(g, M.cover, M.cover, { thick: 0.05, depth: 0.03 })
    fits.roles = ({ P, S, items, quaternion }) => {
      row.forEach((r, i) => {
        const tab = items.seats[i]
        if (!tab) return
        const p = P(tab.x + tab.w / 2, tab.y + tab.h / 2)
        r.seat.position.z = p.z
      })
      const r = items.notebook[0]
      if (r) { notebook.setSize(S(r.w) + 0.08, S(r.h) + 0.08); notebook.place(P(r.x + r.w / 2, r.y + r.h / 2, -0.04), quaternion) }
    }

    // The teacher's end: the wall screen for the conversation, Pulse at its podium, the wall clock.
    const screen = framed(g, M.ink, M.ink, { thick: 0.09, depth: 0.09 })
    const pulse = robot(g, '#3b82f6', { x: 20, z: -62.7, scale: 1.32, phase: 0.5 })
    pulse.setExcited(true)
    tick('roomB', time => pulse.update(time))
    const podium = live(new THREE.Group())
    g.add(podium)
    cyl(podium, 0.62, 0.74, 0.16, 0, 0.08, 0, M.oak, 24)
    const teacherClock = clock(g, 'roomB', 20, 3.6, -63.9, 0, 0.95)
    anchors.clock = teacherClock.position
    // Beside the board, in whatever room the screen leaves to its right: a vase of flowers on the
    // floor and paper stickers on the wall, placed so neither covers the conversation.
    const vase = live(new THREE.Group())
    g.add(vase)
    const glaze = mat(0x8ab8e0, { roughness: 0.35 })
    cyl(vase, 0.13, 0.1, 0.36, 0, 0.18, 0, glaze, 20)
    cyl(vase, 0.085, 0.13, 0.08, 0, 0.4, 0, glaze, 20, false)
    cyl(vase, 0.1, 0.085, 0.05, 0, 0.465, 0, glaze, 20, false)
    const upward = new THREE.Vector3(0, 1, 0)
    const PETALS = [0xf9a8d4, 0xfca5a5, 0xffffff, 0xc4b5fd, 0xfde68a].map(color => mat(color, { roughness: 0.7 }))
    const pollen = mat(0xf59e0b, { roughness: 0.6 })
    for (let i = 0; i < 5; i++) {
      const a = 0.5 + i * 1.26, lean = 0.08 + (i % 2) * 0.07
      const head = new THREE.Vector3(Math.cos(a) * lean, 0.84 + (i % 3) * 0.1, 0.03 + Math.sin(a) * lean * 0.5)
      const from = new THREE.Vector3(0, 0.44, 0), along = head.clone().sub(from)
      const stem = cyl(vase, 0.009, 0.011, 1, 0, 0, 0, M.canopyDeep, 5, false)
      stem.position.copy(from).addScaledVector(along, 0.5)
      stem.scale.y = along.length()
      stem.quaternion.setFromUnitVectors(upward, along.normalize())
      const bloom = new THREE.Group()
      bloom.position.copy(head)
      vase.add(bloom)
      ball(bloom, 0.032, 0, 0, 0.012, pollen, 1, 1, 0.7, false)
      for (let p = 0; p < 6; p++) ball(bloom, 0.04, Math.cos((p / 6) * Math.PI * 2) * 0.052, Math.sin((p / 6) * Math.PI * 2) * 0.052, 0, PETALS[i], 1, 1, 0.45, false)
    }
    for (const side of [-1, 1]) ball(vase, 0.075, side * 0.1, 0.55, 0.02, M.canopy, 0.45, 1.3, 0.3, false).rotation.z = side * -0.6
    const paper = mat(0xfffdf8, { roughness: 0.9 })
    const starShape = (outer, inner) => {
      const s = new THREE.Shape()
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 ? inner : outer, a = Math.PI / 2 + (i * Math.PI) / 5
        if (i) s.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
        else s.moveTo(Math.cos(a) * radius, Math.sin(a) * radius)
      }
      return s
    }
    const heartGeometry = size => {
      const s = new THREE.Shape()
      s.moveTo(5, 5)
      s.bezierCurveTo(5, 5, 4, 0, 0, 0)
      s.bezierCurveTo(-6, 0, -6, 7, -6, 7)
      s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19)
      s.bezierCurveTo(12, 15.4, 16, 11, 16, 7)
      s.bezierCurveTo(16, 7, 16, 0, 10, 0)
      s.bezierCurveTo(7, 0, 5, 5, 5, 5)
      const geometry = new THREE.ShapeGeometry(s, 10)
      geometry.center()
      geometry.scale(size / 19, size / 19, 1)
      geometry.rotateZ(Math.PI)
      return geometry
    }
    const sticker = (front, back, material) => {
      const s = live(new THREE.Group())
      g.add(s)
      put(back, paper, s, 0, 0, 0, false)
      put(front, material, s, 0, 0, 0.006, false)
      s.visible = false
      return s
    }
    const smiley = sticker(new THREE.CircleGeometry(0.42, 28), new THREE.CircleGeometry(0.5, 28), mat(0x7cb7ea, { roughness: 0.8 }))
    for (const side of [-1, 1]) put(new THREE.CircleGeometry(0.05, 12), M.ink, smiley, side * 0.13, 0.1, 0.012, false)
    put(new THREE.RingGeometry(0.17, 0.22, 20, 1, Math.PI * 1.15, Math.PI * 0.7), M.ink, smiley, 0, 0.02, 0.012, false)
    const stickers = [
      sticker(new THREE.ShapeGeometry(starShape(0.5, 0.21)), new THREE.ShapeGeometry(starShape(0.6, 0.28)), mat(0xfbd25b, { roughness: 0.8 })),
      sticker(heartGeometry(0.86), heartGeometry(1.02), mat(0xf47c8a, { roughness: 0.8 })),
      smiley,
      sticker(new THREE.ShapeGeometry(starShape(0.5, 0.21)), new THREE.ShapeGeometry(starShape(0.6, 0.28)), mat(0x6cc8a0, { roughness: 0.8 })),
    ]
    const TILT = [-0.18, 0.12, -0.06, 0.2], SIZE = [1, 0.84, 0.76, 0.64]
    fits.ai = ({ P, S, items, width, quaternion }) => {
      const r = items.screen[0]
      if (r) {
        screen.setSize(S(r.w) + 0.14, S(r.h) + 0.14)
        screen.place(P(r.x + r.w / 2, r.y + r.h / 2, -0.07), quaternion)
        // The strip between the board and the screen's right edge, kept clear of both.
        const left = r.x + r.w + 18, free = Math.max(0, width - left - 18)
        const wide = S(free) >= 0.62
        const size = Math.min(0.42, S(free) * 0.42, S(r.h) * 0.2)
        stickers.forEach((s, i) => {
          s.visible = wide
          if (!wide) return
          s.position.copy(P(left + free * (i % 2 ? 0.66 : 0.34), r.y + r.h * (0.1 + i * 0.18), -0.08))
          s.quaternion.copy(quaternion)
          s.rotateZ(TILT[i])
          s.scale.setScalar(size * SIZE[i])
        })
        // The vase stands in that strip when it fits, else under the board's right end, below it.
        const below = P(0, r.y + r.h).y - 0.15
        const foot = P(wide ? left + free / 2 : r.x + r.w - 90, r.y + r.h)
        vase.position.set(foot.x, 0, -63.55)
        vase.scale.setScalar(wide ? 1 : THREE.MathUtils.clamp(below / 1.14, 0.45, 1))
      }
      const gap = items.gap[0]
      if (gap) {
        const p = P(gap.x + gap.w / 2, gap.y + gap.h / 2)
        pulse.root.position.x = p.x
        podium.position.set(p.x, 0, -62.7)
        pulse.root.position.y = 0.16
        teacherClock.position.x = p.x
        teacherClock.position.y = P(gap.x, gap.y + 40).y
      }
    }
  }

  // ─── The hall: seats, the front stage and a window onto the yard ───
  {
    const g = group('hall')
    const WH = 8
    floor(g, 46, 70, -58, -31)
    wall(g, 'z', 46, -58, -31, 1, M.wallHall, { h: WH, gaps: [[-46.2, -42.8, 3.5]], wainscot: M.walnut })
    wall(g, 'z', 70, -58, -31, -1, M.wallHall, { h: WH, wainscot: M.walnut })
    wall(g, 'x', -31, 46, 70, -1, M.wallHall, { h: WH, wainscot: M.walnut })
    // The north wall has a tall window the camera flies out of.
    wallPiece(g, 'x', -58, 46, 49.5, 0, WH, 1, M.wallHall)
    wallPiece(g, 'x', -58, 58.5, 70, 0, WH, 1, M.wallHall)
    wallPiece(g, 'x', -58, 49.5, 58.5, 0, 1.1, 1, M.walnut)
    wallPiece(g, 'x', -58, 49.5, 58.5, 6.7, WH, 1, M.wallHall)
    for (const [w, h, x, y] of [[9.2, 0.14, 54, 6.7], [9.2, 0.14, 54, 1.1], [0.14, 5.7, 49.5, 3.9], [0.14, 5.7, 58.5, 3.9], [0.08, 5.6, 51.4, 3.9], [0.08, 5.6, 56.6, 3.9]]) box(g, w, h, 0.2, x, y, -58, M.trim, 0, false)
    // The stage.
    box(g, 8.2, 0.9, 25, 64.1, 0.45, -44.5, floorMaterial(8.2, 25), 0, false)
    box(g, 0.1, 0.9, 25, 60, 0.45, -44.5, M.deepWood, 0, false)
    for (let i = 0; i < 3; i++) box(g, 0.5, 0.3 * (i + 1), 2.6, 59.75 - (2 - i) * 0.46 + 0.2, 0.15 * (i + 1), -44.5, M.oak, 0.01, false)
    wallPiece(g, 'z', 67.95, -54, -35, 0, 7.6, -1, M.backdrop)
    // Curtains on either side and a valance across the top.
    for (const [a, b] of [[-57, -49.8], [-39.2, -32]]) {
      const c = flat(g, b - a, 7.6, 66.4, 4.3, (a + b) / 2, M.curtain, -Math.PI / 2)
      c.castShadow = false
    }
    box(g, 0.3, 1.2, 25, 66.2, 7.5, -44.5, M.valance, 0.04, false)
    box(g, 0.34, 0.16, 25, 66.1, 6.86, -44.5, M.brass, 0.02, false)
    for (let i = 0; i < 25; i++) ball(g, 0.14, 66.05, 6.8, -56.5 + i, M.lampGlow, 1, 1, 1, false)
    // The rows of seats, facing the stage.
    for (let row = 0; row < 8; row++) for (let i = 0; i < 18; i++) {
      const x = 48.6 + row * 1.32, z = -54 + i * 1.12 + (i > 8 ? 1.9 : 0)
      box(g, 0.74, 0.1, 0.72, x, 0.5, z, M.seat, 0.03)
      box(g, 0.1, 0.72, 0.74, x - 0.34, 0.86, z, M.seat, 0.03)
      box(g, 0.5, 0.5, 0.06, x, 0.25, z, M.ink, 0, false)
    }
    plant(g, 59.4, -56.6, 1.4, true, 'hall')
    plant(g, 59.4, -32.4, 1.4, true, 'hall')
    for (const z of [-50.4, -44.5, -38.6]) {
      const beam = flat(g, 3.6, 8.4, 64.6, 3.6, z, M.beam, -Math.PI / 2)
      beam.rotation.set(0, -Math.PI / 2, 0.16)
    }
    for (let i = 0; i < 18; i++) ball(g, 0.05, 60.1, 0.95, -53 + i, M.lampGlow, 1, 1, 1, false)
    bake(g)
    const keys = Object.keys(AGENT_COLORS)
    const crowd = [[55.0, -48.4], [52.3, -44.5 - 5], [55, -40.4], [56.3, -38.2]].map(([x, z], i) => robot(g, AGENT_COLORS[keys[i * 2]], { x, z, yaw: Math.PI / 2, seated: true, phase: i * 0.9, scale: 0.92 }))
    tick('hall', time => crowd.forEach(c => c.update(time)))
    const banner = framed(g, M.trim, M.brass, { thick: 0.08, depth: 0.08 })
    const ropes = Array.from({ length: 8 }, () => live(cyl(g, 0.016, 0.016, 1, 0, 0, 0, M.ink, 6, false)))
    fits.colleges = ({ P, S, items, quaternion }) => {
      const r = items.banner[0]
      if (r) { banner.setSize(S(r.w) + 0.14, S(r.h) + 0.14); banner.place(P(r.x + r.w / 2, r.y + r.h / 2, -0.07), quaternion) }
      items.cards.forEach((card, i) => {
        for (const side of [0, 1]) {
          const rope = ropes[i * 2 + side]
          if (!rope) continue
          const p = P(card.x + card.w * (side ? 0.82 : 0.18), card.y, -0.04)
          const top = 7.6
          rope.position.set(p.x, (p.y + top) / 2, p.z)
          rope.scale.y = Math.max(0.01, top - p.y)
        }
      })
    }
  }

  // ─── The yard: the view over the KCP building, the photo lines and the library's outside ───
  {
    const g = group('yard')
    put(new THREE.CircleGeometry(150, 48), M.grass, g, 54, -0.05, -95, false).rotation.x = -Math.PI / 2
    const WIDTH = 84, HEIGHT = WIDTH * BUILDING_RATIO
    buildingPiece(g, 54, -0.1, -116, WIDTH, HEIGHT, 0, 1, 0, 1)
    hedge(g, 14, 94, -115, 0.9)
    fence(g, -14, 12.6, -115.93, 4.5, 1.5)
    hedge(g, -14, 13.4, -115, 0.9)
    tree(g, 11.2, -112.8, 2.6)
    box(g, 8, 0.04, 58, 54, 0.02, -85, M.stone, 0, false)
    for (const [x, z, s] of [[33, -96, 2.6], [77, -98, 2.8], [24, -88, 3.4], [85, -90, 3.6], [41, -106, 1.9], [73, -108, 2], [30, -106, 2.2], [82, -106, 2.3]]) tree(g, x, z, s)
    for (const x of [48.4, 59.6]) cyl(g, 0.06, 0.09, 18.4, x, 9.2, -78, M.walnut, 10)
    // The library, seen from outside.
    wallPiece(g, 'z', 71.96, -90, -78, 0, 5.2, -1, M.wallButter)
    wallPiece(g, 'z', 71.96, -75, -64, 0, 5.2, -1, M.wallButter)
    wallPiece(g, 'z', 71.96, -78, -75, 3.36, 5.2, -1, M.wallButter)
    box(g, 19, 0.3, 27, 81, 5.35, -77, M.roof, 0.06)
    for (const z of [-86, -70]) windowOn(g, 71.92, 2.6, z, -Math.PI / 2, 2, 2)
    tree(g, 68, -66, 1.5)
    tree(g, 67.5, -88, 1.7)
    bake(g)
    clouds(g, 'yard', [[34, 30, -160, 6], [66, 34, -170, 8], [90, 25, -150, 5], [18, 22, -146, 4.4], [52, 22, -140, 3.4]])
    const lines = [0, 1].map(() => {
      const line = live(cyl(g, 0.012, 0.012, 1, 0, 0, -77.96, M.ink, 6, false))
      line.rotation.z = Math.PI / 2
      return line
    })
    fits.campus = ({ P, S, items, width }) => {
      items.rows.slice(0, 2).forEach((r, i) => {
        const p = P(width / 2, r.y - 2)
        lines[i].position.set(p.x, p.y, -77.96)
        lines[i].scale.y = S(width) * 1.3
      })
    }
  }

  // ─── The study: the open notebook on the desk, and the door ───
  {
    const g = group('study')
    floor(g, 72, 90, -90, -64)
    wall(g, 'z', 72, -90, -64, 1, M.wallWarm, { gaps: [[-78, -75, 3.36]] })
    wall(g, 'z', 90, -90, -64, -1, M.wallButter)
    wall(g, 'x', -90, 72, 90, 1, M.wall)
    wall(g, 'x', -64, 72, 90, -1, M.wall)
    doorway(g, 'study', 'z', 72, -78, -75, 3.36, [[-78, -Math.PI / 2, 1, 1.5], [-75, Math.PI / 2, -1, 1.5]])
    for (const [z, rot] of [[-84.5, -Math.PI / 2], [-82.4, -Math.PI / 2], [-70.6, -Math.PI / 2], [-68.5, -Math.PI / 2], [-66.4, -Math.PI / 2], [-86.6, -Math.PI / 2]]) shelf(g, 89.72, z, rot, 2.05, 3.1)
    for (const x of [75, 78, 81, 84, 87]) { shelf(g, x, -89.72, 0, 2.8, 3); shelf(g, x, -64.28, Math.PI, 2.8, 3) }
    fairyLights(g, 'z', -89, -64, 89.82, 3.9, 30, 0.14)
    plant(g, 89.1, -80, 1.25, true, 'study')
    plant(g, 89.1, -73, 1.25, true, 'study')
    bake(g)
    // The big desk and what lies on it: placed around the notebook from the page's measurements.
    const desk = live(new THREE.Group())
    g.add(desk)
    const deskTop = box(desk, 1, 0.1, 1, 0, 0.77, 0, floorMaterial(13, 9, 0xd0ab84), 0, true)
    const pads = live(new THREE.Group())
    desk.add(pads)
    const coverBack = box(pads, 1, 0.03, 1, 0, 0.835, 0, M.cover, 0, true)
    const pageL = box(pads, 1, 0.02, 1, 0, 0.855, 0, M.lined, 0, false)
    const pageR = box(pads, 1, 0.02, 1, 0, 0.855, 0, M.lined, 0, false)
    const spine = box(pads, 1, 0.024, 0.05, 0, 0.862, 0, M.frost, 0, false)
    const apple = live(new THREE.Group())
    desk.add(apple)
    ball(apple, 0.1, 0, 0.92, 0, M.apple, 1, 0.92, 1)
    cyl(apple, 0.006, 0.006, 0.05, 0, 1.03, 0, M.trunk, 5, false)
    const cup = live(new THREE.Group())
    desk.add(cup)
    cyl(cup, 0.09, 0.08, 0.2, 0, 0.92, 0, M.amber, 16)
    for (let i = 0; i < 5; i++) {
      const pen = cyl(cup, 0.009, 0.009, 0.3, Math.sin(i * 2) * 0.04, 1, Math.cos(i * 2) * 0.04, BOOKS[i], 5, false)
      pen.rotation.set(Math.cos(i) * 0.14, 0, Math.sin(i) * 0.14)
    }
    const mug = live(new THREE.Group())
    desk.add(mug)
    cyl(mug, 0.1, 0.085, 0.16, 0, 0.9, 0, M.white, 18)
    cyl(mug, 0.086, 0.086, 0.012, 0, 0.978, 0, M.deepWood, 18, false)
    box(mug, 0.03, 0.08, 0.05, 0.11, 0.9, 0, M.white, 0.01, false)
    const stack = live(new THREE.Group())
    desk.add(stack)
    for (let i = 0; i < 3; i++) box(stack, 0.46 - i * 0.04, 0.06, 0.34, 0, 0.85 + i * 0.062, 0, BOOKS[i + 1], 0.012)
    fits.faq = ({ P, S, anchor }) => {
      const w = S(anchor.w), h = S(anchor.h) // w runs along +z (the screen's right), h along +x (its top)
      const c = P(anchor.x + anchor.w / 2, anchor.y + anchor.h / 2)
      desk.position.set(c.x, 0, c.z)
      deskTop.scale.set(Math.max(h + 1.3, 3.4), 1, w + 1.8)
      coverBack.scale.set(h + 0.16, 1, w + 0.2)
      pageL.scale.set(h + 0.06, 1, w / 2 + 0.01); pageL.position.z = -w / 4 - 0.015
      pageR.scale.set(h + 0.06, 1, w / 2 + 0.01); pageR.position.z = w / 4 + 0.015
      spine.scale.set(h + 0.1, 1, 1)
      const ex = h / 2, ez = w / 2
      apple.position.set(ex - 0.35, 0, ez + 0.42)
      cup.position.set(ex - 0.38, 0, -ez - 0.42)
      mug.position.set(-ex + 0.3, 0, -ez - 0.44)
      stack.position.set(-ex + 0.44, 0, ez + 0.46)
    }
    const door = framed(g, M.oak, M.deepWood, { thick: 0.15, depth: 0.14 })
    // The handle on the door's right side and its hinges on the left.
    const handle = live(new THREE.Group())
    g.add(handle)
    box(handle, 0.05, 0.42, 0.14, 0, 0, 0, M.brass, 0.012, false)
    ball(handle, 0.075, -0.09, 0, 0, M.brass, 1, 1, 1, false)
    const hinges = [0, 1].map(() => live(box(g, 0.05, 0.3, 0.12, 0, 0, 0, M.brass, 0.012, false)))
    fits.login = ({ P, S, anchor, quaternion }) => {
      door.setSize(S(anchor.w) + 0.24, S(anchor.h) + 0.24)
      door.place(P(anchor.x + anchor.w / 2, anchor.y + anchor.h / 2, -0.07), quaternion)
      const mid = anchor.y + anchor.h / 2
      handle.position.copy(P(anchor.x + anchor.w + 0.09 / S(1), mid, -0.02))
      hinges.forEach((hinge, i) => hinge.position.copy(P(anchor.x - 0.09 / S(1), mid + (i ? 1 : -1) * anchor.h * 0.33, -0.02)))
    }
  }

  const tickSet = (name, time) => { for (const fn of ticksOf[name]) fn(time) }
  // Night has stars instead of clouds (the stars belong to the world, which moves them with the camera).
  const setNight = night => {
    for (const drift of cloudGroups) drift.visible = !night
    // The photograph of the building, dimmed and cooled to moonlight.
    buildingMaterial.color.set(night ? 0x8790b5 : 0xffffff)
    kit.setNight(night)
  }
  return { sets, doors, fits, anchors, tickSet, setNight }
}
