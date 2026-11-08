import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// The modelling kit for the school: the same toy-like materials, palette and helpers as the agent
// workspace (components/studio/workspaceScene.js), so every room belongs to one world. Everything it
// makes is registered here and released by dispose().
export function createKit() {
  const geometries = new Set(), materials = new Set(), textures = new Set()

  const mat = (color, extra = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra })
    materials.add(material)
    return material
  }
  const glow = (color, extra = {}) => {
    const material = new THREE.MeshBasicMaterial({ color, ...extra })
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
  // Corners of a centimetre or more are rounded; finer ones never show, and a rounded box costs many
  // times the vertices of a plain one (a single shelf holds a hundred books).
  const box = (parent, w, h, d, x, y, z, material, r = 0, cast = true) => put(r >= 0.01 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), material, parent, x, y, z, cast)
  const cyl = (parent, rt, rb, h, x, y, z, material, seg = 16, cast = true) => put(new THREE.CylinderGeometry(rt, rb, h, seg), material, parent, x, y, z, cast)
  const ball = (parent, r, x, y, z, material, sx = 1, sy = 1, sz = 1, cast = true) => {
    const item = put(new THREE.SphereGeometry(r, 16, 10), material, parent, x, y, z, cast)
    item.scale.set(sx, sy, sz)
    return item
  }
  const flat = (parent, w, h, x, y, z, material, rotY = 0, rotX = 0) => {
    const item = put(new THREE.PlaneGeometry(w, h), material, parent, x, y, z, false)
    item.rotation.set(rotX, rotY, 0)
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
  const speckle = (g, w, h, count, colors, size = 2) => {
    for (let i = 0; i < count; i++) {
      g.fillStyle = colors[i % colors.length]
      const x = (i * 157.3) % w, y = (i * 91.7 + i * i * 0.13) % h
      g.beginPath()
      g.arc(x, y, size * (0.5 + ((i * 13) % 10) / 10), 0, Math.PI * 2)
      g.fill()
    }
  }

  // The honey-oak boards of the agent workspace.
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
  }, [1, 1])
  // A floor of any size keeps the same board width.
  const floorMaterial = (w, d, tint = 0xffffff) => {
    const map = planks.clone()
    map.repeat.set(w / 4.7, d / 4.5)
    map.needsUpdate = true
    textures.add(map)
    return mat(tint, { map, roughness: 0.72 })
  }
  const cork = paint(512, 512, (g, w, h) => {
    g.fillStyle = '#d3a874'
    g.fillRect(0, 0, w, h)
    speckle(g, w, h, 1500, ['#b98a55', '#e3c195', '#a97a48', '#efd5ae', '#c79a64'], 2.2)
  }, [3, 2])
  const chalk = paint(512, 256, (g, w, h) => {
    g.fillStyle = '#20383a'
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(226, 240, 236, ${0.012 + (i % 5) * 0.006})`
      g.lineWidth = 16 + (i % 4) * 12
      g.beginPath()
      const y = (i * 37) % h
      g.moveTo(-20, y)
      g.bezierCurveTo(w * 0.3, y + 26, w * 0.6, y - 30, w + 20, y + 10)
      g.stroke()
    }
  })
  const grass = paint(512, 512, (g, w, h) => {
    g.fillStyle = '#a8d58e'
    g.fillRect(0, 0, w, h)
    speckle(g, w, h, 2400, ['#96cb7c', '#b7df9e', '#8cc274', '#c2e6ab'], 1.8)
  }, [34, 34])
  const stone = paint(256, 256, (g, w, h) => {
    g.fillStyle = '#f1e7d8'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(150, 125, 95, 0.32)'
    g.lineWidth = 3
    for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
    for (let r = 0; r < 4; r++) for (let x = r % 2 ? 42 : 0; x <= w; x += 85) { g.beginPath(); g.moveTo(x, r * 64); g.lineTo(x, r * 64 + 64); g.stroke() }
  }, [2, 30])
  const curtain = paint(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 12)
      g.fillStyle = `rgb(${Math.round(30 + v * 34)}, ${Math.round(66 + v * 56)}, ${Math.round(150 + v * 82)})`
      g.fillRect(x, 0, 1, h)
    }
  })
  const sky = paint(128, 128, (g, w, h) => {
    const fade = g.createLinearGradient(0, 0, 0, h)
    fade.addColorStop(0, '#b9d6fb')
    fade.addColorStop(1, '#f2f8ff')
    g.fillStyle = fade
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(255, 255, 255, 0.85)'
    for (const [x, y, r] of [[30, 40, 15], [46, 34, 19], [63, 42, 13], [92, 82, 11], [104, 76, 15], [116, 84, 10]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill() }
    g.fillStyle = '#a7d3a1'
    g.fillRect(0, h - 18, w, 18)
  })
  // The same window after dark: a deep blue sky with stars, the moon and a dark lawn.
  const skyNight = paint(128, 128, (g, w, h) => {
    const fade = g.createLinearGradient(0, 0, 0, h)
    fade.addColorStop(0, '#0a1533')
    fade.addColorStop(1, '#2a3c6e')
    g.fillStyle = fade
    g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(255, 255, 255, 0.9)'
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc((i * 47.3) % w, (i * 29.7) % (h - 30), i % 5 ? 0.8 : 1.5, 0, Math.PI * 2); g.fill() }
    g.fillStyle = '#fff4d6'
    g.beginPath(); g.arc(96, 30, 11, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#2b4636'
    g.fillRect(0, h - 18, w, 18)
  })
  const lined = paint(256, 256, (g, w, h) => {
    g.fillStyle = '#fffdf6'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#d6e4f7'
    g.lineWidth = 2
    for (let y = 16; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
  }, [1, 3])
  // Ruled across the page as the desk is seen from above.
  lined.center.set(0.5, 0.5)
  lined.rotation = Math.PI / 2
  const screen = paint(256, 512, (g, w, h) => {
    g.fillStyle = '#0f1d38'
    g.fillRect(0, 0, w, h)
    for (let y = 12, i = 0; y < h; y += 18, i++) {
      g.fillStyle = i % 6 === 0 ? '#60a5fa' : i % 4 === 0 ? '#5eead4' : 'rgba(191, 219, 254, 0.5)'
      g.fillRect(16 + ((i * 13) % 34), y, 40 + ((i * 53) % 150), 7)
    }
  }, [1, 0.45])
  // A soft pool of light: it fades along the beam and towards both sides.
  const shaft = paint(128, 256, (g, w, h) => {
    const light = g.createLinearGradient(0, 0, 0, h)
    light.addColorStop(0, 'rgba(255, 246, 225, 0.7)')
    light.addColorStop(1, 'rgba(255, 246, 225, 0)')
    g.fillStyle = light
    g.fillRect(0, 0, w, h)
    g.globalCompositeOperation = 'destination-in'
    const sides = g.createLinearGradient(0, 0, w, 0)
    sides.addColorStop(0, 'rgba(0, 0, 0, 0)')
    sides.addColorStop(0.5, 'rgba(0, 0, 0, 1)')
    sides.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = sides
    g.fillRect(0, 0, w, h)
  })

  const M = {
    wall: mat(0xe4ecf7, { roughness: 0.95 }),
    wallWarm: mat(0xf8f1e7, { roughness: 0.95 }),
    wallButter: mat(0xfbeed2, { roughness: 0.95 }),
    wallHall: mat(0x274a80, { roughness: 0.92 }),
    backdrop: mat(0xf7f0e2, { roughness: 0.92 }),
    wainscot: mat(0xdcbc93, { roughness: 0.7 }),
    trim: mat(0xffffff, { roughness: 0.5 }),
    oak: mat(0xd8b88e, { roughness: 0.55 }),
    walnut: mat(0xa77b52, { roughness: 0.5 }),
    deepWood: mat(0x7d5a3c, { roughness: 0.55 }),
    white: mat(0xffffff, { roughness: 0.42 }),
    frost: mat(0xe2e8f0, { roughness: 0.5 }),
    ink: mat(0x1e293b, { roughness: 0.3 }),
    steel: mat(0x94a3b8, { roughness: 0.35, metalness: 0.55 }),
    brass: mat(0xd9a441, { roughness: 0.35, metalness: 0.6 }),
    fairy: mat(0xffe2a8, { emissive: 0xffc768, emissiveIntensity: 1.6, roughness: 0.4 }),
    fairyAlt: mat(0xffe9bd, { emissive: 0xffd58f, emissiveIntensity: 1.2, roughness: 0.4 }),
    lampGlow: mat(0xfff2cc, { emissive: 0xffd88a, emissiveIntensity: 1.4, roughness: 0.4 }),
    sky: mat(0xffffff, { emissive: 0xffffff, emissiveMap: sky, emissiveIntensity: 0.9, roughness: 0.2 }),
    screen: mat(0x0f1d38, { emissive: 0xffffff, emissiveMap: screen, emissiveIntensity: 0.95, roughness: 0.25 }),
    cork: mat(0xffffff, { map: cork, roughness: 0.95 }),
    chalk: mat(0xffffff, { map: chalk, roughness: 0.9 }),
    chalkStick: mat(0xfbfaf4, { roughness: 0.9 }),
    grass: mat(0xffffff, { map: grass, roughness: 1 }),
    stone: mat(0xffffff, { map: stone, roughness: 0.95 }),
    curtain: mat(0xffffff, { map: curtain, roughness: 0.92 }),
    valance: mat(0xd9a441, { roughness: 0.7 }),
    lined: mat(0xffffff, { map: lined, roughness: 0.9 }),
    paper: mat(0xffffff, { roughness: 0.8, side: THREE.DoubleSide }),
    cover: mat(0x2f5fb8, { roughness: 0.75 }),
    rug: mat(0xdbe6f8, { roughness: 1 }),
    rugWarm: mat(0xf6d7c3, { roughness: 1 }),
    leaf: mat(0x3e9d6a, { roughness: 0.6 }),
    leafDeep: mat(0x2c7a52, { roughness: 0.6 }),
    canopy: mat(0x7fc47a, { roughness: 0.9 }),
    canopyDeep: mat(0x5aa968, { roughness: 0.9 }),
    trunk: mat(0x9a7350, { roughness: 0.85 }),
    pot: mat(0xf3e6d6, { roughness: 0.7 }),
    clay: mat(0xd9906a, { roughness: 0.75 }),
    blue: mat(0x2563eb, { roughness: 0.4 }),
    roof: mat(0x1f63d6, { roughness: 0.5 }),
    soft: mat(0x93c5fd, { roughness: 0.45 }),
    amber: mat(0xf59e0b, { roughness: 0.45 }),
    coral: mat(0xf87171, { roughness: 0.5 }),
    mint: mat(0x34d399, { roughness: 0.5 }),
    pink: mat(0xf9a8d4, { roughness: 0.5 }),
    violet: mat(0xa78bfa, { roughness: 0.5 }),
    apple: mat(0xe5484d, { roughness: 0.35 }),
    seat: mat(0x3b6fc4, { roughness: 0.85 }),
    cloud: glow(0xffffff, { toneMapped: false }),
    steam: glow(0xffffff, { transparent: true, opacity: 0.35, depthWrite: false }),
    shaft: glow(0xffffff, { map: shaft, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    beam: glow(0xfff4d6, { map: shaft, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  }

  // Merges a group's static meshes per material: a few draw calls instead of hundreds. Anything
  // under a `live` node stays separate because it moves.
  function bake(group) {
    group.updateMatrixWorld(true)
    const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert()
    const buckets = new Map(), merged = []
    group.traverse(object => {
      if (!object.isMesh) return
      for (let p = object; p && p !== group; p = p.parent) if (p.userData.live) return
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld))
      for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name)
      if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2))
      geometry.clearGroups()
      const key = `${object.material.uuid}:${object.castShadow}`
      if (!buckets.has(key)) buckets.set(key, { material: object.material, cast: object.castShadow, parts: [] })
      buckets.get(key).parts.push(geometry)
      merged.push(object)
    })
    for (const object of merged) { object.removeFromParent(); object.geometry.dispose(); geometries.delete(object.geometry) }
    const prune = node => { for (const child of [...node.children]) { if (child.userData.live) continue; prune(child); if (!child.isMesh && !child.children.length) child.removeFromParent() } }
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

  // Night: the windows show the night sky, lamps and fairy lights glow brighter, sunbeams turn to
  // moonbeams.
  function setNight(night) {
    M.sky.emissiveMap = night ? skyNight : sky
    M.sky.emissiveIntensity = night ? 0.8 : 0.9
    M.fairy.emissiveIntensity = night ? 3.4 : 1.6
    M.fairyAlt.emissiveIntensity = night ? 2.6 : 1.2
    M.lampGlow.emissiveIntensity = night ? 3.2 : 1.4
    M.shaft.color.set(night ? 0x9db6ff : 0xffffff)
    M.shaft.opacity = night ? 0.2 : 0.3
    M.beam.color.set(night ? 0xb0c6ff : 0xfff4d6)
    M.beam.opacity = night ? 0.22 : 0.34
  }

  function dispose() {
    geometries.forEach(geometry => geometry.dispose())
    materials.forEach(material => material.dispose())
    textures.forEach(texture => texture.dispose())
  }

  return { THREE, M, mat, glow, put, box, cyl, ball, flat, live, paint, floorMaterial, bake, setNight, dispose, textures, materials, geometries }
}
