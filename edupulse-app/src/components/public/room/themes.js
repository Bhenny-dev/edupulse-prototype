// The themed rooms of the public pages. Each is a cut-away classroom (floor, back wall, left wall,
// windows) dressed for one subject, with props that move and props the page lets you pick. Keys
// passed to `pick` match the page's items. Everything is built from primitives in the art style of
// the 3D school (src/components/landing/classroom/kit.js).

const W = 6, D = 4.5, H = 4.2
const INK = ['#2563eb', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16']

export function buildTheme(name, ctx) {
  const { THREE, kit, room } = ctx
  const { M, mat, box, cyl, ball, put, live, paint, floorMaterial } = kit
  const spec = THEMES[name] || THEMES.science
  const wallBack = mat(spec.wall, { roughness: 0.95 }), wallSide = mat(spec.side, { roughness: 0.95 })
  const paints = INK.map(color => mat(color, { roughness: 0.55 }))
  const glass = mat(0xdbeafe, { roughness: 0.08, transparent: true, opacity: 0.45 })

  // ─── The shell ───
  box(room, 2 * W + 0.2, 0.2, 2 * D + 0.2, 0, -0.1, 0, floorMaterial(12, 9, spec.floor), 0, false)
  box(room, 2 * W + 0.4, 0.14, 2 * D + 0.4, 0, -0.27, 0, M.walnut, 0, false)
  box(room, 2 * W + 0.2, H, 0.2, 0, H / 2, -D - 0.1, wallBack, 0, true)
  box(room, 0.2, H, 2 * D + 0.2, -W - 0.1, H / 2, 0, wallSide, 0, true)
  box(room, 2 * W + 0.2, 0.16, 0.05, 0, 0.08, -D + 0.02, M.trim, 0, false)
  box(room, 0.05, 0.16, 2 * D, -W + 0.02, 0.08, 0, M.trim, 0, false)
  box(room, 2 * W + 0.3, 0.12, 0.3, 0, H + 0.06, -D - 0.08, M.trim, 0, false)
  box(room, 0.3, 0.12, 2 * D + 0.3, -W - 0.08, H + 0.06, 0, M.trim, 0, false)

  // A group standing against a wall: `back` at x, or `side` at z; local +z faces into the room.
  // `face` (passed to `pick`) tells the room which way to look at a prop when it zooms in.
  const onWall = (wall, at, y) => {
    const g = new THREE.Group()
    if (wall === 'back') g.position.set(at, y, -D + 0.01)
    else { g.position.set(-W + 0.01, y, at); g.rotation.y = Math.PI / 2 }
    room.add(g)
    return g
  }
  const windowAt = (wall, at, y = 2.35, w = 1.6, h = 1.45) => {
    const g = onWall(wall, at, y)
    box(g, w + 0.16, h + 0.16, 0.06, 0, 0, 0.03, M.trim, 0, false)
    box(g, w, h, 0.02, 0, 0, 0.065, M.sky, 0, false)
    box(g, 0.05, h, 0.03, 0, 0, 0.08, M.trim, 0, false)
    box(g, w, 0.05, 0.03, 0, 0, 0.08, M.trim, 0, false)
    box(g, w + 0.34, 0.06, 0.22, 0, -h / 2 - 0.08, 0.11, M.trim, 0, false)
    return g
  }
  const picture = (wall, at, y, w, h, draw, frame = M.deepWood, size = 256) => {
    const g = onWall(wall, at, y)
    const texture = typeof draw === 'function' ? paint(size, Math.max(16, Math.round((size * h) / w)), draw) : draw
    box(g, w + 0.12, h + 0.12, 0.05, 0, 0, 0.03, frame, 0, false)
    const face = put(new THREE.PlaneGeometry(w, h), mat(0xffffff, { map: texture, roughness: 0.85 }), g, 0, 0, 0.062, false)
    face.receiveShadow = false
    return g
  }
  const plant = (x, z, s = 1) => {
    cyl(room, 0.2 * s, 0.15 * s, 0.34 * s, x, 0.17 * s, z, mat(0xd9825b, { roughness: 0.8 }), 14)
    for (let i = 0; i < 5; i++) ball(room, (0.17 + (i % 2) * 0.05) * s, x + Math.sin(i * 1.3) * 0.13 * s, (0.48 + i * 0.09) * s, z + Math.cos(i * 1.3) * 0.13 * s, i % 2 ? M.canopy : M.canopyDeep, 1, 1.25, 1, false)
  }
  const desk = (parent, x, z, w = 1.5, d = 0.75, top = M.oak, legs = M.white, y = 0.76) => {
    box(parent, w, 0.06, d, x, y, z, top, 0.015)
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(parent, 0.05, y - 0.03, 0.05, x + lx * (w / 2 - 0.08), (y - 0.03) / 2, z + lz * (d / 2 - 0.08), legs, 0, false)
  }
  const pedestal = (parent, x, z, h = 0.62, top = M.white) => {
    cyl(parent, 0.34, 0.4, h, x, h / 2, z, top, 24)
    cyl(parent, 0.4, 0.4, 0.06, x, h + 0.03, z, M.trim, 24, false)
  }
  const helpers = { images: ctx.images, THREE, kit, room, M, mat, box, cyl, ball, put, live, paint, onWall, windowAt, picture, plant, desk, pedestal, paints, glass, robot: ctx.robot, cat: ctx.cat, tick: ctx.tick, pick: ctx.pick }
  return spec.build(helpers) || {}
}

// A canvas helper for chalk and poster lettering.
const letter = (g, text, x, y, size, color, align = 'center', weight = 700) => {
  g.fillStyle = color
  g.font = `${weight} ${size}px Fredoka, Nunito, system-ui, sans-serif`
  g.textAlign = align
  g.textBaseline = 'middle'
  g.fillText(text, x, y)
}

const robotLive = (helpers, ...args) => {
  const r = helpers.robot(...args)
  r.root.userData.live = true
  helpers.tick(time => r.update(time))
  return r
}
const catLive = (helpers, ...args) => helpers.cat(...args)

const THEMES = {
  // ─── Features: a science lab, one station per feature ───
  science: {
    wall: 0xdcf1ec, side: 0xe8f6f2, floor: 0xe6eef0,
    build(h) {
      const { THREE, room, M, mat, box, cyl, ball, put, live, windowAt, picture, plant, paints, glass, tick, pick } = h
      windowAt('back', 3.9)
      windowAt('side', 1.9)
      const table = picture('back', 0.4, 3.05, 2.5, 1.2, (g, w, hh) => {
        g.fillStyle = '#fffdf8'; g.fillRect(0, 0, w, hh)
        const colors = ['#93c5fd', '#fca5a5', '#86efac', '#fde68a', '#c4b5fd', '#f9a8d4']
        for (let r = 0; r < 6; r++) for (let c = 0; c < 18; c++) {
          if (r === 0 && c > 0 && c < 17) continue
          if (r > 0 && r < 3 && c > 1 && c < 12) continue
          g.fillStyle = colors[(r + c) % colors.length]
          g.fillRect(8 + c * (w - 16) / 18 + 1, 10 + r * (hh - 20) / 6 + 1, (w - 16) / 18 - 2, (hh - 20) / 6 - 2)
        }
      })
      pick('formula', table, 0.95, { face: 'back' })
      // The lab rules: a yellow safety poster on the side wall.
      const rules = picture('side', -1.2, 2.55, 1.0, 1.3, (g, w, hh) => {
        g.fillStyle = '#fde047'; g.fillRect(0, 0, w, hh)
        g.fillStyle = '#1f2937'; g.fillRect(0, 0, w, hh * 0.2)
        letter(g, 'LAB RULES', w / 2, hh * 0.1, 26, '#fde047')
        for (let i = 0; i < 6; i++) { g.fillStyle = '#1f2937'; g.beginPath(); g.arc(w * 0.16, hh * (0.3 + i * 0.115), 7, 0, Math.PI * 2); g.fill(); g.fillRect(w * 0.27, hh * (0.3 + i * 0.115) - 4, w * (0.42 + (i % 3) * 0.1), 8) }
      }, M.ink, 200)
      pick('rules', rules, 0.95, { face: 'side' })
      const teal = mat(0x2a9d8f, { roughness: 0.55 })
      box(room, 7.4, 0.9, 1.05, -1.6, 0.45, -3.92, teal, 0.02)
      box(room, 7.5, 0.07, 1.15, -1.6, 0.94, -3.92, M.white, 0.02)
      box(room, 3.2, 0.9, 1.15, 1.2, 0.45, 0.6, teal, 0.02)
      box(room, 3.3, 0.07, 1.25, 1.2, 0.94, 0.6, M.white, 0.02)
      plant(4.9, -3.7)
      plant(-5.3, 3.4, 1.2)

      // Records: a filing cabinet with folders on top.
      const records = live(new THREE.Group()); records.position.set(-5.05, 0, -2.2); room.add(records)
      box(records, 0.8, 1.3, 0.75, 0, 0.65, 0, M.steel, 0.03)
      for (let i = 0; i < 3; i++) { box(records, 0.66, 0.34, 0.03, 0, 0.25 + i * 0.4, 0.38, M.frost, 0.01, false); box(records, 0.22, 0.04, 0.04, 0, 0.32 + i * 0.4, 0.41, M.ink, 0.01, false) }
      for (let i = 0; i < 4; i++) box(records, 0.5, 0.05, 0.36, 0.02 * i, 1.33 + i * 0.055, 0, paints[i], 0.01, false)
      pick('records', records, 1.9)

      // Syllabus: an open book on a lectern.
      const syllabus = live(new THREE.Group()); syllabus.position.set(-3.1, 0.98, -3.85); room.add(syllabus)
      const stand = box(syllabus, 0.9, 0.05, 0.6, 0, 0.12, 0, M.oak, 0.01); stand.rotation.x = -0.35
      for (const side of [-1, 1]) { const page = box(syllabus, 0.42, 0.03, 0.56, side * 0.21, 0.17, 0.02, M.lined, 0, false); page.rotation.set(-0.35, 0, side * 0.08) }
      pick('syllabus', syllabus, 0.9)

      // Courseware: a bubbling flask that turns the outline into cards.
      const courseware = live(new THREE.Group()); courseware.position.set(-0.6, 0.98, -3.85); room.add(courseware)
      put(new THREE.SphereGeometry(0.3, 24, 16), glass, courseware, 0, 0.3, 0, false)
      ball(courseware, 0.25, 0, 0.23, 0, paints[5], 1, 0.6, 1, false)
      cyl(courseware, 0.07, 0.08, 0.36, 0, 0.72, 0, glass, 14, false)
      cyl(courseware, 0.24, 0.28, 0.05, 0, 0.025, 0, M.steel, 20, false)
      const bubbles = Array.from({ length: 6 }, (_, i) => ball(courseware, 0.035, Math.sin(i) * 0.08, 0.4, Math.cos(i) * 0.08, M.white, 1, 1, 1, false))
      for (let i = 0; i < 3; i++) { const card = box(courseware, 0.36, 0.02, 0.26, 0.62, 0.02 + i * 0.03, 0.05 - i * 0.03, paints[i + 1], 0, false); card.rotation.y = 0.2 * i }
      tick(time => bubbles.forEach((b, i) => { const p = (time * 0.5 + i / 6) % 1; b.position.y = 0.36 + p * 0.62; b.scale.setScalar(1 - p * 0.6) }))
      pick('courseware', courseware, 1.25)

      // Performance: a bar chart that keeps growing.
      const performance = live(new THREE.Group()); performance.position.set(1.7, 0.98, -3.85); room.add(performance)
      box(performance, 1.2, 0.05, 0.5, 0, 0.025, 0, M.white, 0.01, false)
      const bars = [0, 1, 2, 3].map(i => { const bar = box(performance, 0.18, 1, 0.22, -0.39 + i * 0.26, 0.05, 0, paints[[0, 2, 1, 5][i]], 0, false); bar.geometry.translate(0, 0.5, 0); return bar })
      tick(time => bars.forEach((bar, i) => { bar.scale.y = 0.3 + (0.25 + i * 0.12) * (0.75 + 0.25 * Math.sin(time * 0.9 + i)) }))
      pick('performance', performance, 1.15)

      // On the island: a microscope, a rack of tubes and Pulse beside them.
      const scope = live(new THREE.Group()); scope.position.set(0.2, 0.98, 0.55); room.add(scope)
      box(scope, 0.3, 0.05, 0.36, 0, 0.025, 0, M.ink, 0.01, false)
      cyl(scope, 0.04, 0.04, 0.5, -0.08, 0.3, -0.08, M.steel, 10, false)
      const tube = cyl(scope, 0.05, 0.06, 0.34, 0, 0.5, 0.02, M.white, 14, false); tube.rotation.x = 0.4
      pick('screens', scope, 0.9)
      box(room, 0.7, 0.18, 0.22, 1.5, 1.07, 0.5, M.oak, 0.01)
      for (let i = 0; i < 5; i++) { cyl(room, 0.035, 0.035, 0.32, 1.26 + i * 0.12, 1.2, 0.5, glass, 10, false); cyl(room, 0.032, 0.032, 0.12, 1.26 + i * 0.12, 1.1, 0.5, paints[i], 10, false) }
      const pulse = robotLive(h, room, '#3b82f6', { x: 2.55, z: 0.6, yaw: -0.9, scale: 0.92, phase: 0.3 })
      pick('pulse', pulse.root, 2.1)
      tick(time => pulse.setExcited(Math.sin(time * 0.6) > 0.7))

      // The atom on the side shelf.
      const atom = live(new THREE.Group()); atom.position.set(-5.55, 2.75, 0.2); room.add(atom)
      box(room, 0.5, 0.05, 1.2, -5.75, 2.28, 0.2, M.oak, 0.01)
      ball(atom, 0.1, 0, 0, 0, paints[6], 1, 1, 1, false)
      const orbits = [0, 1, 2].map(i => {
        const ring = new THREE.Group(); ring.rotation.set(i * 1.05, i * 0.6, 0); atom.add(ring)
        put(new THREE.TorusGeometry(0.34, 0.008, 6, 48), M.ink, ring, 0, 0, 0, false)
        const electron = ball(ring, 0.04, 0.34, 0, 0, paints[i], 1, 1, 1, false)
        return { ring, electron }
      })
      tick(time => orbits.forEach(({ electron }, i) => { const a = time * (1.4 + i * 0.4) + i * 2; electron.position.set(Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0) }))

      catLive(h, room, { coat: 'grey', mode: 'sleep', x: 3.4, z: 2.6, yaw: 0.8, scale: 1.1 })
      catLive(h, room, { coat: 'ginger', mode: 'walk', path: [[-2.6, 2.6], [3.6, 3.2], [4.4, -1.6], [-2.2, -1.2]], speed: 0.5, scale: 1.05 })
    },
  },

  // ─── How it works: a physics room, the phases as stations along a marble run ───
  physics: {
    wall: 0xe6e8f8, side: 0xeef0fb, floor: 0xffffff,
    build(h) {
      const { THREE, room, M, mat, box, cyl, ball, live, windowAt, picture, plant, desk, pedestal, paints, tick, pick } = h
      windowAt('back', 4.1)
      windowAt('side', 2.2)
      const board = picture('back', -1.2, 3.1, 2.2, 1.0, (g, w, hh) => {
        g.fillStyle = '#20383a'; g.fillRect(0, 0, w, hh)
        letter(g, 'F = m·a', w * 0.28, hh * 0.35, 30, '#f5f7f2')
        letter(g, 'E = mc²', w * 0.72, hh * 0.35, 30, '#fbe59b')
        g.strokeStyle = '#cdd9d2'; g.lineWidth = 3; g.beginPath()
        for (let x = 0; x <= w; x += 4) g.lineTo(x, hh * 0.72 + Math.sin(x / 14) * 12)
        g.stroke()
      })
      pick('forces', board, 0.85, { face: 'back' })
      plant(5.1, -3.8)
      const stops = [[-4.6, -3.0], [-2.4, -2.9], [-0.2, -2.6], [2.2, -2.8], [3.6, -0.6], [1.6, 1.0]]
      const KEYS = ['records', 'loading', 'syllabus', 'courseware', 'access', 'monitoring']
      const tops = stops.map(([x, z], i) => {
        const g = live(new THREE.Group()); g.position.set(x, 0, z); room.add(g)
        pedestal(g, 0, 0, 0.62, i % 2 ? M.frost : M.white)
        const block = box(g, 0.42, 0.42, 0.42, 0, 0.9, 0, paints[i], 0.04)
        block.rotation.y = 0.5
        pick(KEYS[i], g, 1.55)
        return new THREE.Vector3(x, 1.22, z)
      })
      // Rails from stop to stop, and the ball rolling along them.
      const steel = M.steel
      for (let i = 0; i < tops.length - 1; i++) {
        const a = tops[i], b = tops[i + 1], mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b)
        const rail = cyl(room, 0.025, 0.025, len, mid.x, mid.y + 0.02, mid.z, steel, 8, false)
        rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
      }
      const marble = ball(room, 0.12, tops[0].x, tops[0].y + 0.1, tops[0].z, mat(0xef4444, { roughness: 0.25, metalness: 0.3 }), 1, 1, 1, true)
      marble.userData.live = true
      tick(time => {
        const span = tops.length - 1, s = (time * 0.32) % (span + 1.2)
        const i = Math.min(span - 1, Math.floor(Math.min(s, span - 0.001))), t = Math.min(1, s - i)
        const ease = t * t * (3 - 2 * t)
        marble.position.lerpVectors(tops[i], tops[i + 1], s > span ? 1 : ease)
        marble.position.y += 0.14
        marble.rotation.z -= 0.08
      })
      // Newton's cradle on a desk.
      desk(room, -3.4, 1.4, 1.6, 0.8)
      const cradle = live(new THREE.Group()); cradle.position.set(-3.4, 0.79, 1.4); room.add(cradle)
      box(cradle, 0.9, 0.04, 0.42, 0, 0.02, 0, M.ink, 0.01, false)
      for (const sx of [-0.42, 0.42]) for (const sz of [-0.18, 0.18]) cyl(cradle, 0.012, 0.012, 0.6, sx, 0.32, sz, steel, 6, false)
      for (const sz of [-0.18, 0.18]) { const bar = cyl(cradle, 0.012, 0.012, 0.86, 0, 0.62, sz, steel, 6, false); bar.rotation.z = Math.PI / 2 }
      const balls = [-2, -1, 0, 1, 2].map(i => {
        const pivot = new THREE.Group(); pivot.position.set(i * 0.105, 0.62, 0); cradle.add(pivot)
        cyl(pivot, 0.004, 0.004, 0.42, 0, -0.21, 0, M.ink, 4, false)
        ball(pivot, 0.05, 0, -0.44, 0, steel, 1, 1, 1, false)
        return pivot
      })
      tick(time => { const s = Math.sin(time * 3.2); balls[0].rotation.z = Math.min(0, s) * 0.6; balls[4].rotation.z = Math.max(0, s) * 0.6 })
      pick('chain', cradle, 1.05)
      // An orrery on a side table.
      desk(room, -4.9, -0.6, 1.0, 1.0)
      const orrery = live(new THREE.Group()); orrery.position.set(-4.9, 0.79, -0.6); room.add(orrery)
      ball(orrery, 0.13, 0, 0.42, 0, mat(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 0.8 }), 1, 1, 1, false)
      cyl(orrery, 0.02, 0.05, 0.3, 0, 0.15, 0, M.brass, 8, false)
      const planets = [0.24, 0.36, 0.46].map((r, i) => { const arm = new THREE.Group(); arm.position.y = 0.42; orrery.add(arm); ball(arm, 0.035 + i * 0.012, r, 0, 0, paints[i], 1, 1, 1, false); return arm })
      tick(time => planets.forEach((arm, i) => { arm.rotation.y = time * (1.2 - i * 0.35) }))
      // A pendulum clock on the wall.
      const clock = live(new THREE.Group()); clock.position.set(-3.8, 2.6, -D + 0.08); room.add(clock)
      box(clock, 0.5, 1.2, 0.14, 0, 0, 0, M.walnut, 0.03)
      cyl(clock, 0.17, 0.17, 0.03, 0, 0.3, 0.08, M.white, 24, false).rotation.x = Math.PI / 2
      const bob = new THREE.Group(); bob.position.set(0, 0.05, 0.08); clock.add(bob)
      cyl(bob, 0.008, 0.008, 0.45, 0, -0.22, 0, M.brass, 4, false)
      ball(bob, 0.05, 0, -0.46, 0, M.brass, 1, 1, 0.5, false)
      tick(time => { bob.rotation.z = Math.sin(time * 2.4) * 0.32 })
      const helper = robotLive(h, room, '#f59e0b', { x: -1.2, z: 0.4, yaw: 0.5, scale: 0.9, phase: 1.1 })
      tick(time => helper.setExcited(Math.sin(time * 0.5 + 1) > 0.75))
      robotLive(h, room, '#10b981', { x: 3.9, z: 2.4, yaw: -1.4, scale: 0.9, phase: 2.2 })
      catLive(h, room, { coat: 'black', mode: 'walk', path: [[-1.8, 3.4], [2.6, 3.6], [0.4, 2.0]], speed: 0.4 })
    },
  },

  // ─── Roles: a math room, one solid per role ───
  math: {
    wall: 0xfdf0d2, side: 0xfdf6e6, floor: 0xffffff,
    build(h) {
      const { THREE, room, M, mat, box, cyl, ball, put, live, windowAt, picture, plant, desk, pedestal, tick, pick } = h
      windowAt('back', 4.2)
      windowAt('side', 2.4)
      const board = picture('back', -1.3, 2.5, 4.4, 1.9, (g, w, hh) => {
        g.fillStyle = '#20383a'; g.fillRect(0, 0, w, hh)
        letter(g, 'a² + b² = c²', w * 0.3, hh * 0.25, 30, '#f5f7f2')
        letter(g, 'π ≈ 3.14', w * 0.75, hh * 0.22, 28, '#fbe59b')
        letter(g, '∑ n = n(n+1)/2', w * 0.32, hh * 0.62, 26, '#cdd9d2')
        g.strokeStyle = '#f5f7f2'; g.lineWidth = 3
        g.beginPath(); g.moveTo(w * 0.6, hh * 0.85); g.lineTo(w * 0.92, hh * 0.85); g.moveTo(w * 0.62, hh * 0.88); g.lineTo(w * 0.62, hh * 0.45); g.stroke()
        g.strokeStyle = '#93c5fd'; g.beginPath()
        for (let x = 0; x <= w * 0.3; x += 3) g.lineTo(w * 0.62 + x, hh * 0.85 - Math.pow(x / (w * 0.3), 2) * hh * 0.38)
        g.stroke()
      }, M.oak, 320)
      pick('matrix', board, 1.25, { face: 'back' })
      plant(5.2, -3.8)
      const ROLE = [['instructor', '#3b82f6'], ['student', '#f59e0b'], ['dean', '#10b981'], ['associate_dean', '#ec4899'], ['admin', '#8b5cf6']]
      const shapes = [
        () => new THREE.BoxGeometry(0.48, 0.48, 0.48),
        () => new THREE.SphereGeometry(0.3, 28, 18),
        () => new THREE.ConeGeometry(0.34, 0.56, 4),
        () => new THREE.CylinderGeometry(0.24, 0.24, 0.5, 24),
        () => new THREE.TorusGeometry(0.22, 0.09, 12, 32),
      ]
      const spots = [[-4.0, -1.6], [-1.9, -0.6], [0.3, -0.1], [2.5, -0.6], [4.4, -1.7]]
      const solids = ROLE.map(([key, color], i) => {
        const g = live(new THREE.Group()); g.position.set(spots[i][0], 0, spots[i][1]); room.add(g)
        pedestal(g, 0, 0, 0.62)
        const solid = put(shapes[i](), mat(color, { roughness: 0.35 }), g, 0, 0.98, 0)
        pick(key, g, 1.6)
        return solid
      })
      tick(time => solids.forEach((s, i) => { s.rotation.y = time * 0.6 + i; s.rotation.x = Math.sin(time * 0.4 + i) * 0.25 }))
      // An abacus on a side desk.
      desk(room, -4.9, 2.2, 1.0, 1.4)
      const abacus = live(new THREE.Group()); abacus.position.set(-4.9, 0.79, 2.2); abacus.rotation.y = Math.PI / 2; room.add(abacus)
      for (const sx of [-0.5, 0.5]) box(abacus, 0.05, 0.6, 0.06, sx, 0.3, 0, M.walnut, 0.01, false)
      box(abacus, 1.05, 0.05, 0.06, 0, 0.6, 0, M.walnut, 0.01, false)
      const beads = []
      for (let r = 0; r < 4; r++) {
        const rod = cyl(abacus, 0.008, 0.008, 1.0, 0, 0.12 + r * 0.13, 0, M.steel, 4, false); rod.rotation.z = Math.PI / 2
        for (let b = 0; b < 5; b++) beads.push({ mesh: ball(abacus, 0.045, -0.4 + b * 0.1, 0.12 + r * 0.13, 0, mat(['#ef4444', '#f59e0b', '#10b981', '#3b82f6'][r], { roughness: 0.4 }), 1, 0.8, 1, false), r, b })
      }
      tick(time => beads.forEach(({ mesh, r, b }) => { const slide = Math.max(0, Math.sin(time * 0.8 + r)) * (b < 2 ? 0.45 : 0); mesh.position.x = -0.4 + b * 0.1 + slide }))
      pick('solids', abacus, 0.95)
      // A protractor on the side wall.
      const arc = live(new THREE.Group()); arc.position.set(-W + 0.08, 2.6, -1.4); arc.rotation.y = Math.PI / 2; room.add(arc)
      put(new THREE.TorusGeometry(0.62, 0.035, 8, 40, Math.PI), mat(0x93c5fd, { roughness: 0.4 }), arc, 0, 0, 0, false)
      box(arc, 1.3, 0.05, 0.03, 0, 0, 0, M.trim, 0, false)
      const needle = new THREE.Group(); arc.add(needle)
      box(needle, 0.02, 0.6, 0.02, 0, 0.3, 0.02, mat(0xef4444), 0, false)
      tick(time => { needle.rotation.z = Math.sin(time * 0.7) * 1.2 })
      // Number blocks stacked by the window.
      for (let i = 0; i < 6; i++) box(room, 0.32, 0.32, 0.32, 3.6 + (i % 3) * 0.34, 0.16 + Math.floor(i / 3) * 0.32, 2.8, mat(INK[i], { roughness: 0.5 }), 0.03)
      const teacher = robotLive(h, room, '#3b82f6', { x: -3.6, z: -3.2, yaw: 0.35, scale: 0.92, phase: 0.6 })
      tick(time => teacher.setExcited(Math.sin(time * 0.7) > 0.6))
      catLive(h, room, { coat: 'calico', mode: 'sit', x: -4.75, z: 2.85, yaw: 0.6, scale: 0.9 }).root.position.y = 0.79
      catLive(h, room, { coat: 'ginger', mode: 'walk', path: [[-1.6, 2.4], [2.6, 2.0], [1.0, 3.6]], speed: 0.42 })
    },
  },

  // ─── Impact: a history room, findings as exhibits and the goals on a globe ───
  history: {
    wall: 0xf2e4cf, side: 0xf7ecdd, floor: 0xffffff,
    build(h) {
      const { THREE, room, M, mat, box, cyl, ball, put, live, paint, windowAt, picture, plant, pedestal, paints, tick, pick } = h
      windowAt('side', 2.6)
      const timeline = picture('back', 0.2, 3.1, 5.2, 0.9, (g, w, hh) => {
        g.fillStyle = '#fff7e6'; g.fillRect(0, 0, w, hh)
        g.strokeStyle = '#7c5230'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, hh / 2); g.lineTo(w - 40, hh / 2); g.stroke()
        g.fillStyle = '#7c5230'; g.beginPath(); g.moveTo(w - 20, hh / 2); g.lineTo(w - 44, hh / 2 - 12); g.lineTo(w - 44, hh / 2 + 12); g.fill()
        const marks = ['#94a3b8', '#94a3b8', '#f59e0b', '#2563eb']
        marks.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(70 + i * ((w - 160) / 3), hh / 2, 12, 0, Math.PI * 2); g.fill() })
      }, M.walnut, 384)
      pick('then-now', timeline, 0.75, { face: 'back' })
      for (const x of [-5.2, 5.2]) {
        const z = -3.9
        cyl(room, 0.24, 0.28, 3.6, x, 1.8, z, M.white, 18)
        box(room, 0.7, 0.16, 0.7, x, 3.68, z, M.white, 0.02)
        box(room, 0.7, 0.16, 0.7, x, 0.08, z, M.white, 0.02)
      }
      // The globe carries the goals.
      const globe = live(new THREE.Group()); globe.position.set(1.4, 0, 0.2); room.add(globe)
      cyl(globe, 0.06, 0.32, 0.9, 0, 0.45, 0, M.walnut, 16)
      const map = paint(256, 128, (g, w, hh) => {
        g.fillStyle = '#5aa9e6'; g.fillRect(0, 0, w, hh)
        g.fillStyle = '#7cc47a'
        for (const [x, y, rx, ry] of [[50, 50, 30, 22], [70, 88, 16, 24], [128, 44, 22, 14], [140, 82, 18, 24], [196, 50, 34, 18], [214, 92, 14, 10]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); g.fill() }
      })
      const tilt = new THREE.Group(); tilt.position.y = 1.32; tilt.rotation.z = 0.4; globe.add(tilt)
      const earth = put(new THREE.SphereGeometry(0.42, 32, 20), mat(0xffffff, { map, roughness: 0.6 }), tilt, 0, 0, 0)
      put(new THREE.TorusGeometry(0.5, 0.015, 6, 48, Math.PI * 1.4), M.brass, tilt, 0, 0, 0, false).rotation.set(0, Math.PI / 2, -0.6)
      tick(time => { earth.rotation.y = time * 0.35 })
      pick('goals', globe, 2.2)
      // Exhibits for the findings: an hourglass, a balance, a clock.
      const exhibits = [['clock', -3.6, -2.5], ['less', -1.3, -3.0], ['recovered', 3.6, -2.6]]
      const sand = mat(0xf2c66d, { roughness: 0.8 })
      exhibits.forEach(([key, x, z], i) => {
        const g = live(new THREE.Group()); g.position.set(x, 0, z); room.add(g)
        pedestal(g, 0, 0, 0.7, M.white)
        const top = new THREE.Group(); top.position.y = 0.74; g.add(top)
        if (i === 0) {
          for (const y of [0, 0.62]) cyl(top, 0.2, 0.2, 0.05, 0, y, 0, M.walnut, 16, false)
          put(new THREE.ConeGeometry(0.17, 0.28, 18), h.glass, top, 0, 0.17, 0, false).rotation.x = Math.PI
          put(new THREE.ConeGeometry(0.17, 0.28, 18), h.glass, top, 0, 0.45, 0, false)
          const grains = put(new THREE.ConeGeometry(0.12, 0.16, 16), sand, top, 0, 0.12, 0, false)
          tick(time => { grains.scale.y = 0.4 + ((time * 0.15) % 1) * 0.8; top.rotation.y = time * 0.3 })
        } else if (i === 1) {
          cyl(top, 0.03, 0.05, 0.6, 0, 0.3, 0, M.brass, 10, false)
          const beam = new THREE.Group(); beam.position.y = 0.6; top.add(beam)
          box(beam, 0.8, 0.03, 0.03, 0, 0, 0, M.brass, 0, false)
          for (const s of [-1, 1]) cyl(beam, 0.14, 0.12, 0.03, s * 0.38, -0.18, 0, M.brass, 18, false)
          ball(beam, 0.07, -0.38, -0.12, 0, paints[2], 1, 1, 1, false)
          tick(time => { beam.rotation.z = Math.sin(time * 0.9) * 0.18 })
        } else {
          cyl(top, 0.34, 0.34, 0.06, 0, 0.36, 0, M.white, 32, false).rotation.x = Math.PI / 2
          put(new THREE.TorusGeometry(0.34, 0.035, 8, 40), M.brass, top, 0, 0.36, 0.01, false)
          const hand = new THREE.Group(); hand.position.set(0, 0.36, 0.05); top.add(hand)
          box(hand, 0.03, 0.26, 0.02, 0, 0.11, 0, M.ink, 0, false)
          tick(time => { hand.rotation.z = -time * 1.1 })
        }
        pick(key, g, 1.75)
      })
      put(new THREE.CircleGeometry(1.7, 40), mat(0xb45309, { roughness: 0.9 }), room, 1.4, 0.012, 0.6, false).rotation.x = -Math.PI / 2
      plant(-5.1, 3.3, 1.2)
      const reader = robotLive(h, room, '#ec4899', { x: -1.6, z: 1.2, yaw: 0.7, scale: 0.92, phase: 0.9 })
      tick(time => reader.setExcited(Math.sin(time * 0.55 + 2) > 0.7))
      catLive(h, room, { coat: 'ginger', mode: 'sleep', x: 2.4, z: 1.2, yaw: -0.4 })
    },
  },

  // ─── Colleges: a gallery, one framed picture per college ───
  gallery: {
    wall: 0xf3efe8, side: 0xf7f4ee, floor: 0xd9b48a,
    build(h) {
      const { THREE, room, M, mat, box, cyl, ball, put, live, onWall, windowAt, plant, tick, pick, kit } = h
      windowAt('side', 3.2, 2.4, 1.4, 1.3)
      const loader = new THREE.TextureLoader()
      const frames = h.images || {}
      const hang = (key, wall, at, y, w, hgt, big) => {
        const g = onWall(wall, at, y)
        g.userData.live = true
        box(g, w + 0.2, hgt + 0.2, 0.07, 0, 0, 0.04, big ? M.brass : M.deepWood, 0.01, false)
        const texture = frames[key] ? loader.load(frames[key]) : null
        if (texture) { texture.colorSpace = THREE.SRGBColorSpace; kit.textures.add(texture) }
        const face = put(new THREE.PlaneGeometry(w, hgt), mat(0xffffff, { map: texture, roughness: 0.8 }), g, 0, 0, 0.082, false)
        face.receiveShadow = false
        const spot = put(new THREE.ConeGeometry(0.1, 0.18, 12), M.lampGlow, g, 0, hgt / 2 + 0.28, 0.25, false)
        spot.rotation.x = Math.PI * 0.75
        pick(key, g, hgt / 2 + 0.5)
        return g
      }
      hang('cit', 'back', 0.2, 2.35, 2.8, 1.65, true)
      hang('cabm', 'back', -3.9, 2.45, 1.6, 1.1)
      hang('ccje', 'back', 3.55, 2.45, 1.5, 1.05)
      hang('cot', 'side', -3.1, 2.45, 1.5, 1.05)
      hang('ctela', 'side', -0.9, 2.45, 1.5, 1.05)
      // The college crest on a round wooden plaque.
      const crest = onWall('side', 1.25, 2.5)
      crest.userData.live = true
      cyl(crest, 0.52, 0.52, 0.06, 0, 0, 0.03, M.deepWood, 40, false).rotation.x = Math.PI / 2
      const seal = frames.kcp ? loader.load(frames.kcp) : null
      if (seal) { seal.colorSpace = THREE.SRGBColorSpace; kit.textures.add(seal) }
      put(new THREE.CircleGeometry(0.44, 40), mat(0xffffff, { map: seal, roughness: 0.7, transparent: true }), crest, 0, 0, 0.065, false)
      pick('kcp', crest, 0.85, { face: 'side' })
      // Rope stands in front of the CIT picture.
      for (const x of [-1.2, 2.0]) { cyl(room, 0.04, 0.05, 0.9, x, 0.45, -3.3, M.brass, 10); ball(room, 0.07, x, 0.92, -3.3, M.brass, 1, 1, 1, false) }
      const rope = put(new THREE.TorusGeometry(1.6, 0.03, 6, 40, Math.PI), mat(0xb91c1c, { roughness: 0.6 }), room, 0.4, 0.88, -3.3, false)
      rope.rotation.z = Math.PI
      rope.scale.y = 0.18
      // A bench, an easel and the painter.
      box(room, 2.2, 0.12, 0.55, 0.6, 0.48, 0.9, M.walnut, 0.03)
      for (const x of [-0.35, 1.55]) box(room, 0.12, 0.44, 0.45, x, 0.22, 0.9, M.deepWood, 0.01)
      const easel = live(new THREE.Group()); easel.position.set(3.6, 0, 1.6); easel.rotation.y = -0.5; room.add(easel)
      for (const s of [-1, 1]) { const leg = box(easel, 0.05, 1.8, 0.05, s * 0.32, 0.9, 0, M.oak, 0, false); leg.rotation.z = s * -0.12 }
      const canvasArt = h.paint(160, 128, (g, w, hh) => {
        g.fillStyle = '#fffdf8'; g.fillRect(0, 0, w, hh)
        g.fillStyle = '#93c5fd'; g.fillRect(0, 0, w, hh * 0.55)
        g.fillStyle = '#7fc47a'; g.beginPath(); g.ellipse(w * 0.5, hh * 0.9, w * 0.7, hh * 0.4, 0, 0, Math.PI * 2); g.fill()
        g.fillStyle = '#fde68a'; g.beginPath(); g.arc(w * 0.75, hh * 0.25, 14, 0, Math.PI * 2); g.fill()
      })
      box(easel, 0.95, 0.75, 0.04, 0, 1.25, 0.05, mat(0xffffff, { map: canvasArt }), 0, false)
      const painter = robotLive(h, room, '#6366f1', { x: 3.0, z: 2.5, yaw: -2.6, scale: 0.9, phase: 0.4 })
      tick(time => painter.setExcited(Math.sin(time * 1.1) > 0.2))
      catLive(h, room, { coat: 'black', mode: 'sit', x: 0.1, z: 0.9, yaw: 0.4, scale: 0.85 }).root.position.y = 0.54
      plant(-5.2, -3.8, 1.1)
      plant(5.2, -3.8, 1.1)
    },
  },

  // ─── Play: a game room, one cabinet per game ───
  arcade: {
    wall: 0xe8e1ff, side: 0xfbe2ef, floor: 0xe7dcf7,
    build(h) {
      const { THREE, room, M, mat, box, cyl, ball, put, live, paint, windowAt, plant, tick, pick } = h
      windowAt('side', 2.8)
      const sign = h.onWall('back', 0.2, 3.35)
      const neon = paint(256, 64, (g, w, hh) => { letter(g, 'PLAY', w / 2, hh / 2 + 2, 52, '#ffffff') })
      const glowSign = mat(0xf472b6, { emissive: 0xec4899, emissiveIntensity: 1.6, map: neon, transparent: true })
      put(new THREE.PlaneGeometry(1.8, 0.45), glowSign, sign, 0, 0, 0.05, false)
      tick(time => { glowSign.emissiveIntensity = 1.3 + Math.sin(time * 3) * 0.4 })
      const GAMES = [['gate', '#2563eb', g => { g.fillStyle = '#93c5fd'; g.beginPath(); g.moveTo(64, 18); g.lineTo(104, 32); g.lineTo(98, 78); g.lineTo(64, 104); g.lineTo(30, 78); g.lineTo(24, 32); g.closePath(); g.fill() }],
        ['match', '#10b981', g => { const c = ['#fde68a', '#f9a8d4', '#93c5fd', '#86efac']; c.forEach((col, i) => { g.fillStyle = col; g.fillRect(22 + (i % 2) * 44, 22 + Math.floor(i / 2) * 44, 38, 38) }) }],
        ['quiz', '#f59e0b', g => letter(g, '?', 64, 66, 84, '#fde68a')]]
      const cabinets = {}
      GAMES.forEach(([key, color, draw], i) => {
        const g = live(new THREE.Group()); g.position.set(-3.4 + i * 2.5, 0, -3.65); room.add(g)
        const body = mat(color, { roughness: 0.45 })
        box(g, 1.0, 1.9, 0.85, 0, 0.95, 0, body, 0.04)
        box(g, 1.04, 0.32, 0.9, 0, 2.02, 0.03, mat(0x1e293b), 0.04)
        const art = paint(128, 128, (c, w, hh) => { c.fillStyle = '#0f172a'; c.fillRect(0, 0, w, hh); draw(c) })
        const glow = mat(0x0f172a, { emissive: 0xffffff, emissiveMap: art, emissiveIntensity: 0.9 })
        const screen = box(g, 0.78, 0.62, 0.03, 0, 1.45, 0.42, glow, 0, false)
        screen.rotation.x = -0.15
        box(g, 0.98, 0.08, 0.4, 0, 0.98, 0.55, mat(0x1e293b), 0.02, false)
        // The joystick tilts on a pivot; the buttons sink when pressed.
        const stick = new THREE.Group(); stick.position.set(-0.22, 1.02, 0.6); g.add(stick)
        cyl(stick, 0.02, 0.02, 0.14, 0, 0.07, 0, M.ink, 8, false)
        ball(stick, 0.05, 0, 0.15, 0, mat(0xef4444), 1, 1, 1, false)
        const buttons = [0, 1, 2].map(b => ball(g, 0.04, 0.06 + b * 0.12, 1.03, 0.6, mat(['#fbbf24', '#22c55e', '#3b82f6'][b], { emissive: ['#fbbf24', '#22c55e', '#3b82f6'][b], emissiveIntensity: 0.15 }), 1, 0.6, 1, false))
        pick(key, g, 2.5)
        cabinets[key] = { group: g, screen, glow, stick, buttons, stand: new THREE.Vector3(g.position.x + 0.62, 0, -2.78) }
      })
      // Bean bags, a rug, a table with dice and a yarn ball the cat chases.
      put(new THREE.CircleGeometry(2.0, 40), mat(0xfde68a, { roughness: 0.95 }), room, 0.8, 0.012, 1.1, false).rotation.x = -Math.PI / 2
      ball(room, 0.55, -1.4, 0.32, 1.6, mat(0xf472b6, { roughness: 0.9 }), 1, 0.55, 1, true)
      ball(room, 0.55, 2.9, 0.32, 2.4, mat(0x60a5fa, { roughness: 0.9 }), 1, 0.55, 1, true)
      box(room, 1.1, 0.06, 1.1, 0.9, 0.5, 0.6, M.oak, 0.02)
      cyl(room, 0.07, 0.07, 0.48, 0.9, 0.24, 0.6, M.oak, 10)
      const dice = [0, 1].map(i => { const d = box(room, 0.16, 0.16, 0.16, 0.7 + i * 0.35, 0.62, 0.55, M.white, 0.03); d.userData.live = true; return d })
      tick(time => dice.forEach((d, i) => { d.rotation.set(time * (0.9 + i * 0.3), time * 0.7, 0); d.position.y = 0.62 + Math.abs(Math.sin(time * 2 + i)) * 0.12 }))
      const yarn = ball(room, 0.13, 2.0, 0.13, 3.0, mat(0xef4444, { roughness: 0.9 }), 1, 1, 1, true)
      yarn.userData.live = true
      tick(time => { const a = time * 0.5; yarn.position.set(1.6 + Math.cos(a) * 1.4, 0.13, 2.6 + Math.sin(a) * 0.8); yarn.rotation.z = -time * 3 })
      catLive(h, room, { coat: 'ginger', mode: 'walk', path: Array.from({ length: 12 }, (_, i) => [1.6 + Math.cos(i / 12 * Math.PI * 2 - 0.5) * 1.4, 2.6 + Math.sin(i / 12 * Math.PI * 2 - 0.5) * 0.8]), speed: 0.65 })
      const player = robotLive(h, room, '#8b5cf6', { x: -0.9, z: -2.5, yaw: Math.PI, scale: 0.9, phase: 0.2 })
      tick(time => { if (!player.busy) player.setExcited(Math.sin(time * 1.4) > 0.5) })
      robotLive(h, room, '#06b6d4', { x: -1.4, z: 1.6, yaw: 0.6, scale: 0.86, seated: true, seat: 0.42, phase: 1.6 })
      plant(5.3, -3.9)
      return { arcade: { cabinets, player, home: new THREE.Vector3(-0.9, 0, -2.5) } }
    },
  },

  // ─── FAQ: a library, one featured book per question ───
  library: {
    wall: 0xf4ead8, side: 0xeee2cc, floor: 0xffffff,
    build(h) {
      const { THREE, room, M, mat, box, cyl, put, live, windowAt, plant, paints, tick, pick } = h
      windowAt('side', 3.1, 2.4, 1.3, 1.4)
      const spine = INK.map(c => mat(c, { roughness: 0.7 }))
      const shelfRun = (x0, x1, z, rot) => {
        const g = new THREE.Group(); g.position.set(0, 0, 0); room.add(g)
        for (let x = x0; x < x1; x += 2.1) {
          const s = new THREE.Group(); s.position.set(rot ? -W + 0.32 : x + 1, 0, rot ? x + 1 : z); s.rotation.y = rot ? Math.PI / 2 : 0; g.add(s)
          box(s, 2.0, 3.2, 0.05, 0, 1.6, -0.2, M.walnut, 0, false)
          for (const sx of [-1, 1]) box(s, 0.06, 3.2, 0.44, sx * 0.97, 1.6, 0, M.oak, 0, false)
          for (let r = 0; r < 5; r++) {
            const y = 0.12 + r * 0.74
            box(s, 2.0, 0.05, 0.44, 0, y, 0, M.oak, 0, false)
            if (r === 4) continue
            let bx = -0.88, i = r * 3
            while (bx < 0.82) { const bw = 0.07 + (i % 3) * 0.025, bh = 0.4 + ((i * 7) % 5) * 0.04; box(s, bw, bh, 0.3, bx + bw / 2, y + 0.025 + bh / 2, 0.02, spine[i % spine.length], 0, false); bx += bw + 0.012; i++ }
          }
        }
      }
      shelfRun(-5.2, 1.2, -4.2, false)
      shelfRun(-4.4, 1.0, 0, true)
      // The reading table with the eight featured books.
      box(room, 3.4, 0.08, 1.2, 1.6, 0.78, 0.4, M.walnut, 0.02)
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(room, 0.08, 0.76, 0.08, 1.6 + lx * 1.55, 0.38, 0.4 + lz * 0.48, M.deepWood, 0, false)
      // The eight featured books stand pulled out of the back shelves, two to a shelf, on alternate rows.
      const band = mat(0xfde68a)
      for (let i = 0; i < 8; i++) {
        const row = i % 2 ? 3 : 2
        const g = live(new THREE.Group()); g.position.set(-4.65 + Math.floor(i / 2) * 2.1 + (i % 2) * 0.9, 0.145 + row * 0.74, -3.78); room.add(g)
        const book = box(g, 0.17, 0.6, 0.42, 0, 0.3, 0, spine[i], 0.012)
        box(g, 0.175, 0.07, 0.43, 0, 0.47, 0, band, 0, false)
        book.rotation.z = (i % 2 ? 1 : -1) * 0.04
        pick(`q${i}`, g, 0.95)
      }
      // An open book on the reading table.
      for (const s of [-1, 1]) { const leaf = box(room, 0.4, 0.02, 0.52, 1.6 + s * 0.2, 0.84, 0.4, M.lined, 0, false); leaf.rotation.z = -s * 0.1 }
      // A floating open book with its letters drifting up.
      const open = live(new THREE.Group()); open.position.set(4.3, 1.5, -1.6); room.add(open)
      for (const s of [-1, 1]) { const p = box(open, 0.34, 0.02, 0.46, s * 0.17, 0, 0, M.lined, 0, false); p.rotation.z = -s * 0.18 }
      const glyphs = Array.from({ length: 8 }, (_, i) => box(open, 0.05, 0.05, 0.01, Math.sin(i * 2) * 0.2, 0.1, Math.cos(i * 3) * 0.15, paints[i % paints.length], 0, false))
      pick('shelf', open, 0.6)
      tick(time => { open.position.y = 1.5 + Math.sin(time * 1.2) * 0.08; open.rotation.y = Math.sin(time * 0.4) * 0.3; glyphs.forEach((g, i) => { const p = (time * 0.35 + i / 8) % 1; g.position.y = 0.06 + p * 0.7; g.rotation.y = time + i; g.scale.setScalar(1 - p * 0.7) }) })
      // The reading lamp and an armchair with a sleeping cat.
      cyl(room, 0.03, 0.03, 1.5, 3.6, 0.75, 2.6, M.brass, 8)
      const shade = put(new THREE.ConeGeometry(0.3, 0.32, 20, 1, true), M.lampGlow, room, 3.6, 1.6, 2.6, false)
      shade.material.side = THREE.DoubleSide
      box(room, 0.95, 0.42, 0.85, 4.5, 0.21, 2.3, mat(0x9d4b3a, { roughness: 0.8 }), 0.08)
      box(room, 0.95, 0.75, 0.2, 4.5, 0.6, 1.95, mat(0x9d4b3a, { roughness: 0.8 }), 0.08)
      catLive(h, room, { coat: 'grey', mode: 'sleep', x: 4.5, z: 2.4, yaw: 1.2, scale: 0.95 }).root.position.y = 0.42
      const librarian = robotLive(h, room, '#8b5cf6', { x: -0.4, z: -2.6, yaw: 0.4, scale: 0.92, phase: 1.3 })
      tick(time => librarian.setExcited(Math.sin(time * 0.6) > 0.75))
      plant(-0.1, 3.4, 1.1)
    },
  },
}

