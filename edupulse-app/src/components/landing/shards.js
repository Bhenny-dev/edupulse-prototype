// The opening field: nine facets that meet at one point under the EduPulse mark, like the
// leaves of a camera aperture. Coordinates are percentages of the first viewport. Each facet
// is its own small element (sized to its bounding box and clipped to its polygon), so only
// the facets themselves become layers while they move.
const CENTRE = [50, 54]
const FACETS = [
  { points: [[0, 0], [36, 0]], tone: 'a', turn: -8 },
  { points: [[36, 0], [78, 0]], tone: 'b', turn: 6 },
  { points: [[78, 0], [100, 0], [100, 22]], tone: 'a', turn: -10 },
  { points: [[100, 22], [100, 74]], tone: 'c', turn: 7 },
  { points: [[100, 74], [100, 100], [84, 100]], tone: 'a', turn: -6 },
  { points: [[84, 100], [40, 100]], tone: 'b', turn: 9 },
  { points: [[40, 100], [0, 100], [0, 88]], tone: 'a', turn: -7 },
  { points: [[0, 88], [0, 38]], tone: 'c', turn: 8 },
  { points: [[0, 38], [0, 0]], tone: 'b', turn: -9 },
]
const pct = value => `${Number(value.toFixed(3))}%`

export const SHARDS = FACETS.map(({ points, tone, turn }) => {
  const all = [CENTRE, ...points]
  const xs = all.map(point => point[0]), ys = all.map(point => point[1])
  const left = Math.min(...xs), top = Math.min(...ys)
  const width = Math.max(...xs) - left, height = Math.max(...ys) - top
  const local = all.map(([x, y]) => `${pct(((x - left) / width) * 100)} ${pct(((y - top) / height) * 100)}`).join(', ')
  // Facets travel away from the centre along the line to their middle.
  const mx = xs.reduce((sum, x) => sum + x, 0) / xs.length, my = ys.reduce((sum, y) => sum + y, 0) / ys.length
  const shade = Math.round((Math.atan2(mx - CENTRE[0], -(my - CENTRE[1])) * 180) / Math.PI)
  return {
    tone,
    turn,
    style: {
      left: pct(left), top: pct(top), width: pct(width), height: pct(height),
      clipPath: `polygon(${local})`,
      transformOrigin: `${pct(((CENTRE[0] - left) / width) * 100)} ${pct(((CENTRE[1] - top) / height) * 100)}`,
      '--shade': `${shade}deg`,
    },
    // Distance and direction in pixels for the current viewport (recomputed on resize).
    travel({ w, h }) {
      const dx = ((mx - CENTRE[0]) * w) / 100, dy = ((my - CENTRE[1]) * h) / 100
      const length = Math.hypot(dx, dy) || 1, distance = Math.hypot(w, h) * 0.78
      return { x: (dx / length) * distance, y: (dy / length) * distance }
    },
  }
})
