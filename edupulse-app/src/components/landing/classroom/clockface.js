// The wall clocks' hands. The 3D clocks (sets.js) and the scope's drawing of them (AgentsSection)
// share these, so the hand-off from one to the other is the same picture.
//
// Angles are the rotation about the clock's own axis, counterclockwise from twelve o'clock, so a
// hand turning clockwise has a falling angle.
export const handsAt = time => ({ minute: -time * 0.1, hour: -time * 0.1 / 12 - 1 })

// Where the Pulse clock's hands come to rest as the camera arrives: five past ten, with the
// minute hand on the one and the hour hand a little past the ten.
export const REST = { minute: -Math.PI / 6, hour: Math.PI / 3 - 0.044 }

// Blends the running hands toward the resting ones by `ease` (0 to 1), turning the short way round.
export function blend(angle, rest, ease) {
  if (ease <= 0) return angle
  const turn = Math.atan2(Math.sin(rest - angle), Math.cos(rest - angle))
  return angle + turn * Math.min(1, ease)
}

// The clock's proportions in its own units (metres at scale 1): the rim's outer radius, the width
// of the rim and the hands. The scope draws everything at 480 / RIM units to the metre.
export const CLOCK = { rim: 0.38, rimWidth: 0.035, minute: { width: 0.02, tip: 0.235, tail: 0.015 }, hour: { width: 0.03, tip: 0.155, tail: 0.015 } }
