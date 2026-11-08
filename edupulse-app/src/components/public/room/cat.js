import * as THREE from 'three'

// A toy cat in the classroom style: rounded body, pointed ears, a tail that sways. It can walk a
// loop of floor points, sit, or sleep curled up. Built from a handful of primitives so a room can
// hold a few without cost.
//
// People can play with it. A tap pets it (it purrs, hearts float up); a drag picks it up and it
// dangles until it is dropped, then lands on the floor. A third tap in a row makes it cross: it
// arches its back, bolts away, then chases the pointer along the floor while the pointer is near,
// and calms down a few seconds after it loses interest. A cat never leaves the floor on its own.
const PET_WINDOW = 3.2 // seconds in which three taps count as a row

export function createCats(kit) {
  const { mat, put, live, paint } = kit
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
  const hitShape = new THREE.SphereGeometry(0.46, 8, 6)
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false })
  kit.geometries.add(sphere).add(cone).add(stick).add(hitShape)
  kit.materials.add(hitMaterial)
  // Hearts for petting and a cross mark for an angry cat, drawn once and shared.
  const sprite = draw => {
    const material = new THREE.SpriteMaterial({ map: paint(64, 64, draw), transparent: true, depthWrite: false })
    kit.materials.add(material)
    return material
  }
  const heart = sprite((g, w) => {
    g.fillStyle = '#f43f5e'
    g.beginPath()
    g.moveTo(w / 2, w * 0.86)
    g.bezierCurveTo(w * 0.05, w * 0.55, w * 0.12, w * 0.12, w / 2, w * 0.32)
    g.bezierCurveTo(w * 0.88, w * 0.12, w * 0.95, w * 0.55, w / 2, w * 0.86)
    g.fill()
  })
  const cross = sprite((g, w) => {
    g.strokeStyle = '#dc2626'
    g.lineWidth = 9
    g.lineCap = 'round'
    for (const [x, y, a] of [[0.3, 0.3, 0.4], [0.7, 0.3, 2.7], [0.3, 0.7, -0.4], [0.7, 0.7, 3.5]]) {
      g.beginPath()
      g.arc(w * x, w * y, w * 0.2, a, a + 1.2)
      g.stroke()
    }
  })
  const blob = (parent, material, x, y, z, sx, sy, sz) => {
    const mesh = put(sphere, material, parent, x, y, z)
    mesh.scale.set(sx, sy, sz)
    return mesh
  }

  function cat(parent, { coat = 'ginger', x = 0, z = 0, yaw = 0, scale = 1, mode = 'sit', path = null, speed = 0.45, phase = 0, bounds = { x: [-5.5, 5.5], z: [-3.9, 4.1] } } = {}) {
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
    body.add(head)
    blob(head, fur, 0, 0, 0, 0.14, 0.125, 0.14)
    blob(head, belly, 0.08, -0.04, 0, 0.07, 0.06, 0.09)
    const eyes = []
    for (const side of [-1, 1]) {
      const ear = put(cone, fur, head, -0.02, 0.12, side * 0.08)
      ear.scale.set(0.05, 0.08, 0.05)
      ear.rotation.x = side * 0.25
      eyes.push(blob(head, eye, 0.12, 0.025, side * 0.055, 0.022, 0.03, 0.022))
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
    const tail = [], furs = []
    let link = body
    for (let i = 0; i < 5; i++) {
      const pivot = new THREE.Group()
      pivot.position.set(i ? -0.08 : -0.24, i ? 0.02 : 0.26, 0)
      link.add(pivot)
      const piece = put(stick, fur, pivot, -0.04, 0, 0)
      piece.rotation.z = Math.PI / 2
      tail.push(pivot)
      furs.push(piece)
      link = pivot
    }
    // The thickness of a piece of tail: slim, or fluffed out on an angry cat (the length stays).
    const fluff = size => furs.forEach((piece, i) => piece.scale.set((0.028 - i * 0.003) * size, 0.09, (0.028 - i * 0.003) * size))
    fluff(1)
    // A generous invisible volume to tap or grab, and the marks that float above the head.
    const hit = new THREE.Mesh(hitShape, hitMaterial)
    hit.position.set(0.03, 0.28, 0)
    root.add(hit)
    const hearts = [0, 1, 2].map(() => { const own = heart.clone(); kit.materials.add(own); const s = new THREE.Sprite(own); s.visible = false; root.add(s); return s })
    const mark = new THREE.Sprite(cross)
    mark.visible = false
    mark.scale.setScalar(0.2)
    root.add(mark)

    // ─── The walk along its loop ───
    const walkPath = path ? path.map(([px, pz]) => new THREE.Vector2(px, pz)) : null
    const lengths = []
    let total = 0
    if (walkPath) for (let i = 0; i < walkPath.length; i++) { const d = walkPath[i].distanceTo(walkPath[(i + 1) % walkPath.length]); lengths.push(d); total += d }
    let along = phase * 3
    const pointOnPath = s => {
      let d = ((s % total) + total) % total
      for (let i = 0; i < walkPath.length; i++) {
        if (d <= lengths[i]) {
          const a = walkPath[i], b = walkPath[(i + 1) % walkPath.length], t = d / lengths[i]
          return { x: a.x + (b.x - a.x) * t, z: a.y + (b.y - a.y) * t, yaw: Math.atan2(-(b.y - a.y), b.x - a.x) }
        }
        d -= lengths[i]
      }
      return { x: walkPath[0].x, z: walkPath[0].y, yaw: 0 }
    }
    // The point of the loop nearest to the cat, as a distance along it, to walk back to.
    const nearestAlong = (px, pz) => {
      let best = 0, bestD = Infinity, at = 0
      for (let i = 0; i < walkPath.length; i++) {
        const a = walkPath[i], b = walkPath[(i + 1) % walkPath.length]
        const abx = b.x - a.x, abz = b.y - a.y, len2 = abx * abx + abz * abz || 1
        const t = Math.max(0, Math.min(1, ((px - a.x) * abx + (pz - a.y) * abz) / len2))
        const d = Math.hypot(a.x + abx * t - px, a.y + abz * t - pz)
        if (d < bestD) { bestD = d; best = at + lengths[i] * t }
        at += lengths[i]
      }
      return best
    }
    if (walkPath) { const p = pointOnPath(along); root.position.set(p.x, 0, p.z); root.rotation.y = p.yaw }

    // ─── Poses ───
    // Every pose starts from standing, so switching between them never leaves anything behind.
    let base = mode
    const setPose = name => {
      body.rotation.set(0, 0, 0)
      body.position.set(0, 0, 0)
      body.scale.set(1, 1, 1)
      head.position.set(0.27, 0.38, 0)
      head.rotation.set(0, 0, 0)
      legs.forEach(leg => { leg.visible = true; leg.rotation.set(0, 0, 0) })
      fluff(1)
      if (name === 'sit') { body.rotation.z = 0.42; body.position.y = 0.04; legs[2].rotation.z = 1.2; legs[3].rotation.z = 1.2 }
      if (name === 'sleep') { body.scale.set(0.92, 0.85, 1.3); body.position.y = -0.1; head.position.set(0.21, 0.27, 0.1); head.rotation.set(0.25, 0.75, -0.25); legs.forEach(leg => { leg.visible = false }) }
      if (name === 'arch') { body.position.y = 0.05; body.scale.set(1, 1.18, 1); head.position.set(0.29, 0.32, 0); fluff(2.1) }
      if (name === 'held') { body.rotation.z = 0.5; head.rotation.z = -0.35 }
    }
    setPose(base)

    // ─── What it is doing ───
    // idle: its own mode (walking its loop, sitting or sleeping); pet: purring; held: carried;
    // fall: dropped; cross: angry (bolting, then chasing); back: walking back to its loop.
    let state = 'idle', last = 0, perch = null
    let since = 0, taps = [], vy = 0, fleeFrom = null, crossUntil = 0, lost = 0, settleUntil = 0
    const goal = new THREE.Vector3()
    const toward = (tx, tz, rate, dt, stop = 0) => {
      const dx = tx - root.position.x, dz = tz - root.position.z, d = Math.hypot(dx, dz)
      if (d <= stop + 0.001) return false
      const step = Math.min(d - stop, rate * dt)
      root.position.x += (dx / d) * step
      root.position.z += (dz / d) * step
      const yaw = Math.atan2(-dz, dx)
      root.rotation.y += Math.atan2(Math.sin(yaw - root.rotation.y), Math.cos(yaw - root.rotation.y)) * Math.min(1, dt * 12)
      return true
    }
    const face = (tx, tz, dt) => {
      const yaw = Math.atan2(-(tz - root.position.z), tx - root.position.x)
      root.rotation.y += Math.atan2(Math.sin(yaw - root.rotation.y), Math.cos(yaw - root.rotation.y)) * Math.min(1, dt * 6)
    }
    const clampToFloor = () => {
      root.position.x = Math.max(bounds.x[0], Math.min(bounds.x[1], root.position.x))
      root.position.z = Math.max(bounds.z[0], Math.min(bounds.z[1], root.position.z))
    }
    const trot = (t, rate) => {
      const step = Math.sin(t * rate)
      legs.forEach((leg, i) => { leg.rotation.z = step * 0.55 * (i % 3 === 0 ? 1 : -1) })
      body.position.y += Math.abs(step) * 0.018
    }

    const update = (time, pointer = null) => {
      const dt = last ? Math.min(0.1, time - last) : 0
      last = time
      perch ??= root.position.y
      const t = time + phase
      since += dt
      // The tail: curled round a sleeping cat, straight up on a cross or purring one, swaying otherwise.
      tail.forEach((pivot, i) => {
        if (state === 'idle' && base === 'sleep') { pivot.rotation.set(0, 0.62 + Math.sin(t * 0.6 - i * 0.6) * 0.05, i === 0 ? -0.5 : 0); return }
        if (state === 'cross') { pivot.rotation.set(0, Math.sin(t * 9 - i) * 0.08, i === 0 ? -1.35 : 0.05); return }
        if (state === 'held') { pivot.rotation.set(0, Math.sin(t * 2 - i * 0.6) * 0.2, i === 0 ? 1.1 : 0.1); return }
        pivot.rotation.y = Math.sin(t * (state === 'pet' ? 4 : 2.2) - i * 0.6) * (state === 'pet' ? 0.18 : 0.32)
        pivot.rotation.z = (state === 'pet' ? -1.2 : base === 'sit' ? -0.5 : 0.35) * (i === 0 ? 1 : 0.18)
        pivot.rotation.x = 0
      })
      for (const e of eyes) e.scale.y = state === 'pet' ? 0.008 : state === 'cross' ? 0.02 : 0.03
      mark.visible = state === 'cross'
      if (mark.visible) mark.position.set(0.3, 0.72 + Math.sin(t * 8) * 0.03, 0.12)
      hearts.forEach((s, i) => {
        const p = (since * 0.8 - i * 0.28)
        s.visible = state === 'pet' && p > 0 && p < 1
        if (s.visible) { s.position.set(0.25 + Math.sin(p * 6 + i) * 0.06, 0.55 + p * 0.5, (i - 1) * 0.08); s.scale.setScalar(0.12 * (1 - p * 0.4)); s.material.opacity = 1 - p }
      })

      if (state === 'held') {
        body.rotation.x = Math.sin(t * 3) * 0.12
        legs.forEach((leg, i) => { leg.rotation.z = Math.sin(t * 4 + i) * 0.25 })
        return
      }
      if (state === 'fall') {
        vy -= 9.8 * dt
        root.position.y = Math.max(0, root.position.y + vy * dt)
        if (root.position.y === 0) { perch = 0; setPose('sit'); state = 'idle'; base = base === 'walk' ? 'walk' : 'sit'; settleUntil = time + 1.6; body.scale.set(1.12, 0.82, 1.12) }
        return
      }
      if (state === 'pet') {
        body.scale.y = 1 + Math.sin(t * 34) * 0.012
        head.rotation.z = Math.sin(t * 3) * 0.12
        if (since > 1.8) { state = 'idle'; setPose(base === 'sleep' ? 'sit' : base === 'walk' ? 'sit' : base); if (base === 'sleep') base = 'sit'; settleUntil = time + 0.6 }
        return
      }
      if (state === 'cross') {
        root.position.y = 0
        body.position.y = 0.05
        if (since < 1.1 && fleeFrom) {
          // Bolt away from where it was tapped.
          const dx = root.position.x - fleeFrom.x, dz = root.position.z - fleeFrom.z, d = Math.hypot(dx, dz) || 1
          toward(root.position.x + (dx / d) * 2, root.position.z + (dz / d) * 2, 2.8, dt)
          clampToFloor()
          trot(t, 22)
          return
        }
        // Then chase the pointer while it is near; lose interest a while after it goes away.
        const near = pointer && Math.hypot(pointer.x - root.position.x, pointer.z - root.position.z) < 3.4
        if (near) {
          lost = 0
          crossUntil = time + 5
          if (toward(pointer.x, pointer.z, 2.3, dt, 0.32)) trot(t, 20)
          else { head.rotation.z = Math.sin(t * 14) * 0.2; legs[0].rotation.z = 0.9 + Math.sin(t * 16) * 0.5 } // a swipe at it
          clampToFloor()
        } else {
          lost += dt
          if (pointer) face(pointer.x, pointer.z, dt)
        }
        if (time > crossUntil && lost > 1) { state = 'back'; if (walkPath) along = nearestAlong(root.position.x, root.position.z); setPose('stand') }
        return
      }
      if (state === 'back') {
        // Back to its loop, or settle down where it is.
        if (!walkPath) { state = 'idle'; base = base === 'sleep' ? 'sit' : base; setPose(base); return }
        const p = pointOnPath(along)
        if (toward(p.x, p.z, 0.7, dt, 0.02)) { trot(t, 9); return }
        state = 'idle'
        setPose('stand')
        return
      }

      // idle
      body.scale.x += (1 - body.scale.x) * Math.min(1, dt * 8)
      body.scale.y += ((base === 'sleep' ? 0.85 : 1) - body.scale.y) * Math.min(1, dt * 8)
      body.scale.z += ((base === 'sleep' ? 1.3 : 1) - body.scale.z) * Math.min(1, dt * 8)
      if (base === 'sleep') { body.scale.y = 0.8 + Math.sin(t * 1.6) * 0.03; return }
      head.rotation.y = Math.sin(t * 0.7) * 0.4
      head.rotation.z = Math.sin(t * 0.45) * 0.08
      if (walkPath && base === 'walk' && time > settleUntil) {
        const p = pointOnPath(along)
        // Dropped off its loop: walk back to the nearest point of it first.
        if (Math.hypot(p.x - root.position.x, p.z - root.position.z) > 0.08) {
          along = nearestAlong(root.position.x, root.position.z)
          state = 'back'
          setPose('stand')
          return
        }
        if (body.rotation.z) setPose('stand')
        along += dt * speed
        const q = pointOnPath(along)
        root.position.set(q.x, perch, q.z)
        root.rotation.y = q.yaw
        trot(t, 9)
        body.position.y = Math.abs(Math.sin(t * 9)) * 0.015
      }
    }

    // ─── What people do to it ───
    const api = {
      root, hit,
      get busy() { return state === 'held' || state === 'fall' },
      get active() { return state !== 'idle' },
      // A tap pets it; the third tap in a row makes it cross. `at` is the tap on the floor.
      tap(time, at) {
        taps = taps.filter(stamp => time - stamp < PET_WINDOW)
        taps.push(time)
        since = 0
        if (taps.length >= 3) {
          taps = []
          state = 'cross'
          fleeFrom = at ? at.clone() : root.position.clone()
          crossUntil = time + 6
          lost = 0
          setPose('arch')
          return 'cross'
        }
        if (state === 'cross') return 'cross'
        state = 'pet'
        setPose('sit')
        root.position.y = perch ?? root.position.y
        return 'pet'
      },
      grab() {
        state = 'held'
        taps = []
        setPose('held')
      },
      // Carried: follows the pointer on the floor, held up off it, inside the room.
      carry(at) {
        goal.set(at.x, 0, at.z)
        root.position.set(goal.x, 0.62, goal.z)
        clampToFloor()
      },
      drop() {
        if (state !== 'held') return
        state = 'fall'
        vy = 0
        since = 0
      },
    }
    hit.userData.cat = api
    return { root, update, api }
  }

  return { cat }
}
