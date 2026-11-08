import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// The school's classmates: the same white toy robot as the agents in the workspace, with a dark
// face screen, glowing eyes and ears in its own colour. Geometry is shared between all of them.
export function createRobots(kit) {
  const { mat, put } = kit
  const botWhite = mat(0xffffff, { roughness: 0.28 })
  const visor = mat(0x0f172a, { roughness: 0.16 })
  const eyeMaterial = mat(0x93c5fd, { emissive: 0x93c5fd, emissiveIntensity: 1.5, roughness: 0.3 })
  const stem = mat(0xcbd5e1, { roughness: 0.4 })
  const shape = {
    thigh: new THREE.CapsuleGeometry(0.07, 0.14, 4, 10),
    shin: new THREE.CapsuleGeometry(0.064, 0.13, 4, 10),
    foot: new RoundedBoxGeometry(0.15, 0.07, 0.22, 2, 0.03),
    body: new THREE.CapsuleGeometry(0.2, 0.2, 4, 12),
    chest: new RoundedBoxGeometry(0.22, 0.16, 0.05, 2, 0.04),
    light: new THREE.SphereGeometry(0.025, 10, 8),
    collar: new THREE.TorusGeometry(0.135, 0.035, 8, 20),
    skull: new RoundedBoxGeometry(0.5, 0.4, 0.42, 3, 0.15),
    screen: new RoundedBoxGeometry(0.4, 0.26, 0.05, 2, 0.08),
    eye: new RoundedBoxGeometry(0.055, 0.095, 0.02, 2, 0.026),
    mouth: new RoundedBoxGeometry(0.06, 0.022, 0.02, 2, 0.01),
    ear: new THREE.CylinderGeometry(0.06, 0.06, 0.05, 14),
    rod: new THREE.CylinderGeometry(0.012, 0.012, 0.15, 6),
    bulb: new THREE.SphereGeometry(0.045, 10, 8),
    upper: new THREE.CapsuleGeometry(0.055, 0.1, 4, 10),
    lower: new THREE.CapsuleGeometry(0.05, 0.09, 4, 10),
    palm: new THREE.SphereGeometry(0.058, 10, 8),
  }
  const accents = new Map()
  const accentOf = hex => {
    if (!accents.has(hex)) {
      const color = new THREE.Color(hex)
      accents.set(hex, {
        accent: mat(color, { roughness: 0.36 }),
        glow: mat(color, { emissive: color, emissiveIntensity: 0.5, roughness: 0.3 }),
        palm: mat(color.clone().lerp(new THREE.Color(0xffffff), 0.62), { roughness: 0.4 }),
      })
    }
    return accents.get(hex)
  }

  function robot(parent, hex, { x = 0, z = 0, yaw = 0, scale = 1, seated = false, seat = 0.5, phase = 0 } = {}) {
    const { accent, glow, palm } = accentOf(hex)
    const root = new THREE.Group()
    root.userData.live = true
    root.position.set(x, 0, z)
    root.rotation.y = yaw
    root.scale.setScalar(scale)
    parent.add(root)
    const pelvis = new THREE.Group()
    pelvis.position.y = seated ? seat + 0.08 : 0.56
    root.add(pelvis)
    for (const side of [-1, 1]) {
      const hip = new THREE.Group()
      hip.position.set(side * 0.1, 0, 0)
      if (seated) hip.rotation.x = -1.42
      pelvis.add(hip)
      put(shape.thigh, botWhite, hip, 0, -0.13, 0)
      const knee = new THREE.Group()
      knee.position.y = -0.27
      if (seated) knee.rotation.x = 1.42
      hip.add(knee)
      put(shape.shin, botWhite, knee, 0, -0.12, 0)
      put(shape.foot, accent, knee, 0, -0.25, 0.04)
    }
    const torso = new THREE.Group()
    pelvis.add(torso)
    put(shape.body, botWhite, torso, 0, 0.25, 0).scale.set(1, 1, 0.86)
    put(shape.chest, accent, torso, 0, 0.27, 0.165)
    put(shape.light, glow, torso, 0, 0.27, 0.193, false)
    put(shape.collar, accent, torso, 0, 0.48, 0).rotation.x = Math.PI / 2
    const head = new THREE.Group()
    head.position.y = 0.78
    torso.add(head)
    put(shape.skull, botWhite, head)
    put(shape.screen, visor, head, 0, -0.01, 0.195)
    const eyes = [-0.085, 0.085].map(ex => put(shape.eye, eyeMaterial, head, ex, 0.012, 0.222, false))
    put(shape.mouth, eyeMaterial, head, 0, -0.07, 0.222, false)
    for (const ex of [-0.27, 0.27]) put(shape.ear, accent, head, ex, 0, 0).rotation.z = Math.PI / 2
    put(shape.rod, stem, head, 0, 0.26, 0, false)
    put(shape.bulb, glow, head, 0, 0.35, 0, false)
    const arms = [-1, 1].map(side => {
      const shoulder = new THREE.Group()
      shoulder.position.set(side * 0.235, 0.42, 0)
      torso.add(shoulder)
      put(shape.upper, botWhite, shoulder, 0, -0.1, 0)
      const elbow = new THREE.Group()
      elbow.position.y = -0.2
      shoulder.add(elbow)
      put(shape.lower, botWhite, elbow, 0, -0.09, 0)
      put(shape.palm, palm, elbow, 0, -0.2, 0)
      return { shoulder, elbow, side }
    })
    const rest = seated ? { sx: -0.75, ex: -0.8 } : { sx: 0, ex: -0.15 }
    const state = { excited: 0, goal: 0, lift: 0 }
    const blinkAt = 2 + phase * 1.7

    const update = time => {
      const t = time + phase
      state.excited += (state.goal - state.excited) * 0.12
      const e = state.excited
      torso.position.y = Math.sin(t * 1.7) * 0.012 + e * 0.05
      torso.rotation.z = Math.sin(t * 0.8) * 0.018
      head.rotation.y = Math.sin(t * 0.55) * 0.16 * (1 - e)
      head.rotation.x = Math.sin(t * 0.9 + 1) * 0.04 - e * 0.05
      head.rotation.z = Math.sin(t * 0.7) * 0.03 + e * Math.sin(t * 3) * 0.05
      arms.forEach(({ shoulder, elbow, side }) => {
        const waving = side === 1 ? e : 0
        const sway = Math.sin(t * 1.3 + side) * 0.05
        shoulder.rotation.x = rest.sx * (1 - waving) + sway - waving * 0.1
        shoulder.rotation.z = side * (0.1 + waving * (2.55 + Math.sin(t * 7) * 0.32))
        elbow.rotation.x = rest.ex * (1 - waving) - waving * 0.25
      })
      const blink = (t % (3.6 + phase)) > blinkAt % 3.4 && (t % (3.6 + phase)) < (blinkAt % 3.4) + 0.12
      for (const eye of eyes) eye.scale.y = blink ? 0.14 : 1
    }
    const setExcited = on => { state.goal = on ? 1 : 0 }
    update(0)
    return { root, head, arms, update, setExcited }
  }

  return { robot, shape }
}
