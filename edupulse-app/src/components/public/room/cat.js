import * as THREE from 'three'

// A toy cat in the classroom style: rounded body, pointed ears, a tail that sways. It can walk a
// loop of floor points, sit, or sleep curled up. Built from a handful of primitives so a room can
// hold a few without cost.
export function createCats(kit) {
  const { mat, put, live } = kit
  const coats = {
    ginger: { fur: mat(0xf0a050, { roughness: 0.85 }), belly: mat(0xfde7c8, { roughness: 0.85 }) },
    grey: { fur: mat(0x9aa3b2, { roughness: 0.85 }), belly: mat(0xe7eaf0, { roughness: 0.85 }) },
    black: { fur: mat(0x2b2b33, { roughness: 0.8 }), belly: mat(0xf4f4f6, { roughness: 0.85 }) },
    calico: { fur: mat(0xf7efe2, { roughness: 0.85 }), belly: mat(0xd98a4a, { roughness: 0.85 }) },
  }
  const eye = mat(0x1f2937, { roughness: 0.3 })
  const nose = mat(0xf29bb0, { roughness: 0.6 })
  const sphere = new THREE.SphereGeometry(1, 16, 12)
  const cone = new THREE.ConeGeometry(1, 1, 4)
  const stick = new THREE.CylinderGeometry(1, 1, 1, 8)
  kit.geometries.add(sphere).add(cone).add(stick)
  const blob = (parent, material, x, y, z, sx, sy, sz) => {
    const mesh = put(sphere, material, parent, x, y, z)
    mesh.scale.set(sx, sy, sz)
    return mesh
  }

  function cat(parent, { coat = 'ginger', x = 0, z = 0, yaw = 0, scale = 1, mode = 'sit', path = null, speed = 0.45, phase = 0 } = {}) {
    const { fur, belly } = coats[coat] || coats.ginger
    const root = live(new THREE.Group())
    root.position.set(x, 0, z)
    root.rotation.y = yaw
    root.scale.setScalar(scale)
    parent.add(root)
    const body = new THREE.Group()
    root.add(body)
    blob(body, fur, 0, 0.24, 0, 0.27, 0.17, 0.16)
    blob(body, belly, 0.04, 0.2, 0, 0.2, 0.12, 0.13)
    const head = new THREE.Group()
    head.position.set(0.27, 0.38, 0)
    body.add(head)
    blob(head, fur, 0, 0, 0, 0.14, 0.125, 0.14)
    blob(head, belly, 0.08, -0.04, 0, 0.07, 0.06, 0.09)
    for (const side of [-1, 1]) {
      const ear = put(cone, fur, head, -0.02, 0.12, side * 0.08)
      ear.scale.set(0.05, 0.08, 0.05)
      ear.rotation.x = side * 0.25
      blob(head, eye, 0.12, 0.025, side * 0.055, 0.022, 0.03, 0.022)
    }
    blob(head, nose, 0.145, -0.02, 0, 0.016, 0.012, 0.018)
    const legs = [[0.16, 0.08], [0.16, -0.08], [-0.15, 0.08], [-0.15, -0.08]].map(([lx, lz]) => {
      const pivot = new THREE.Group()
      pivot.position.set(lx, 0.17, lz)
      body.add(pivot)
      const leg = put(stick, fur, pivot, 0, -0.085, 0)
      leg.scale.set(0.034, 0.17, 0.034)
      blob(pivot, belly, 0.01, -0.165, 0, 0.04, 0.022, 0.035)
      return pivot
    })
    // The tail: a chain of pivots, each turning a little more than the last.
    const tail = []
    let link = body
    for (let i = 0; i < 5; i++) {
      const pivot = new THREE.Group()
      pivot.position.set(i ? -0.08 : -0.24, i ? 0.02 : 0.26, 0)
      link.add(pivot)
      const piece = put(stick, fur, pivot, -0.04, 0, 0)
      piece.scale.set(0.028 - i * 0.003, 0.09, 0.028 - i * 0.003)
      piece.rotation.z = Math.PI / 2
      tail.push(pivot)
      link = pivot
    }
    const walkPath = path ? path.map(([px, pz]) => new THREE.Vector2(px, pz)) : null
    let lengths = [], total = 0
    if (walkPath) {
      for (let i = 0; i < walkPath.length; i++) { const d = walkPath[i].distanceTo(walkPath[(i + 1) % walkPath.length]); lengths.push(d); total += d }
    }
    let along = phase * 3
    const placeOnPath = s => {
      let d = ((s % total) + total) % total
      for (let i = 0; i < walkPath.length; i++) {
        if (d <= lengths[i]) {
          const a = walkPath[i], b = walkPath[(i + 1) % walkPath.length], t = d / lengths[i]
          root.position.set(a.x + (b.x - a.x) * t, 0, a.y + (b.y - a.y) * t)
          root.rotation.y = Math.atan2(-(b.y - a.y), b.x - a.x)
          return
        }
        d -= lengths[i]
      }
    }
    if (walkPath) placeOnPath(along)

    // Poses: sitting lifts the front, sleeping lowers everything and tucks the head.
    if (mode === 'sit') { body.rotation.z = 0.42; body.position.y = 0.04; legs[2].rotation.z = 1.2; legs[3].rotation.z = 1.2 }
    if (mode === 'sleep') { body.scale.set(0.92, 0.85, 1.3); body.position.y = -0.1; head.position.set(0.21, 0.27, 0.1); head.rotation.set(0.25, 0.75, -0.25); legs.forEach(leg => { leg.visible = false }) }

    let last = 0
    const update = time => {
      const dt = last ? Math.min(0.1, time - last) : 0
      last = time
      const t = time + phase
      tail.forEach((pivot, i) => {
        // Asleep, the tail curls round the body; awake it sways.
        if (mode === 'sleep') { pivot.rotation.set(0, 0.62 + Math.sin(t * 0.6 - i * 0.6) * 0.05, i === 0 ? -0.5 : 0); return }
        pivot.rotation.y = Math.sin(t * 2.2 - i * 0.6) * 0.32
        pivot.rotation.z = (mode === 'sit' ? -0.5 : 0.35) * (i === 0 ? 1 : 0.18)
      })
      if (mode === 'sleep') { body.scale.y = 0.8 + Math.sin(t * 1.6) * 0.03; return }
      head.rotation.y = Math.sin(t * 0.7) * 0.4
      head.rotation.z = Math.sin(t * 0.45) * 0.08
      if (walkPath && mode === 'walk') {
        along += dt * speed
        placeOnPath(along)
        const step = Math.sin(t * 9)
        legs.forEach((leg, i) => { leg.rotation.z = step * 0.5 * (i % 3 === 0 ? 1 : -1) })
        body.position.y = Math.abs(step) * 0.015
      }
    }
    return { root, update }
  }

  return { cat }
}
