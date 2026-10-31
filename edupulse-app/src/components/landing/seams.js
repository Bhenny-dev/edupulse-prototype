import { ScrollTrigger } from './motion'

// Every section after the hero arrives through a seam, scrubbed by the scroll in both
// directions. A shutter painted in the outgoing section's colour covers the top of the new
// section and opens through a geometric aperture outlined in blue; at the same time a band of
// 3D shards sweeps along the section's top edge, holds as a faceted seam and fractures apart
// under a moving camera (scene/seamScene.js). Each section has its own aperture, shard shapes,
// direction and camera move. The shutter never takes pointer events, so nothing under it is
// blocked. The caller runs this only without reduced motion; without WebGL the shutters still
// open and the shards are left out.
export const SEAMS = [
  { id: 'problem', aperture: 'diamond', shapes: ['tri', 'diamond', 'pentagon'], from: 'left', roll: 0.16, dolly: 1.4, pan: 0.5 },
  { id: 'features', aperture: 'wedge', shapes: ['prism', 'hex', 'tri'], from: 'right', roll: -0.18, dolly: 1.2, pan: -0.6 },
  { id: 'flow', aperture: 'slant', shapes: ['tile'], from: 'line', roll: 0.08, dolly: 0.9, pan: 0.8 },
  { id: 'roles', aperture: 'iris', shapes: ['tri', 'diamond'], from: 'centre', roll: -0.12, dolly: 1.8, pan: 0 },
  { id: 'ai', aperture: 'iris', shapes: ['ring', 'diamond'], from: 'spiral', roll: 0.2, dolly: 1.6, pan: 0.2 },
  { id: 'agents', aperture: 'hex', shapes: ['ring', 'hex', 'tri'], from: 'below', roll: -0.14, dolly: 1.3, pan: -0.3 },
  { id: 'workspace', aperture: 'wedge', shapes: ['tile', 'prism'], from: 'left', roll: 0.12, dolly: 1.1, pan: 0.6 },
  { id: 'impact', aperture: 'diamond', shapes: ['diamond', 'pentagon'], from: 'right', roll: -0.1, dolly: 1.4, pan: -0.5 },
  { id: 'colleges', aperture: 'iris', shapes: ['ring', 'pentagon'], from: 'centre', roll: 0.15, dolly: 1.7, pan: 0 },
  { id: 'campus', aperture: 'slant', shapes: ['tile', 'tri'], from: 'line', roll: -0.08, dolly: 1, pan: -0.8 },
  { id: 'faq', aperture: 'wedge', shapes: ['tri', 'hex'], from: 'right', roll: 0.12, dolly: 1.2, pan: 0.4 },
  { id: 'login', aperture: 'hex', shapes: ['diamond', 'ring', 'tri', 'tile'], from: 'centre', roll: -0.16, dolly: 1.6, pan: 0 },
]

// Apertures: eight points each, clockwise from the top-left; x as a share of the section's
// width, y as a share of the viewport's height below the section's top. Each opens to OPEN,
// which lies outside the shutter, so the shutter is gone by the end.
const APERTURES = {
  diamond: [[0.5, 0.02], [0.5, 0.02], [0.5, 0.02], [0.78, 0.22], [0.5, 0.44], [0.5, 0.44], [0.5, 0.44], [0.22, 0.22]],
  wedge: [[0.38, 0.08], [0.5, 0.02], [0.62, 0.08], [0.86, 0.32], [0.62, 0.22], [0.5, 0.17], [0.38, 0.22], [0.14, 0.32]], // a chevron pointing up
  slant: [[0.08, 0.16], [0.5, 0.09], [0.92, 0.02], [0.92, 0.08], [0.92, 0.14], [0.5, 0.21], [0.08, 0.28], [0.08, 0.22]], // a rising blade
  hex: [[0.34, 0.02], [0.5, 0.02], [0.66, 0.02], [0.8, 0.2], [0.66, 0.38], [0.5, 0.38], [0.34, 0.38], [0.2, 0.2]],
  iris: [[0.4, 0.05], [0.5, 0.02], [0.6, 0.05], [0.66, 0.17], [0.6, 0.29], [0.5, 0.34], [0.4, 0.29], [0.34, 0.17]],
}
const OPEN = [[-0.2, -0.2], [0.5, -0.2], [1.2, -0.2], [1.2, 0.6], [1.2, 1.4], [0.5, 1.4], [-0.2, 1.4], [-0.2, 0.6]]
const SVG = 'http://www.w3.org/2000/svg'

const clamp01 = value => Math.min(1, Math.max(0, value))
const easeInOut = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

export function setupSeams(page, canvas) {
  let scene = null, cancelled = false
  const seams = SEAMS.map(seam => ({ ...seam, element: page.querySelector(`#${seam.id}`), progress: 0 })).filter(seam => seam.element)

  for (const seam of seams) {
    // The shutter takes the colour of the section the reader is leaving (a pinned section sits
    // inside a pin spacer).
    const own = seam.element.parentElement?.classList.contains('pin-spacer') ? seam.element.parentElement : seam.element
    let previous = own.previousElementSibling
    while (previous && !previous.offsetHeight) previous = previous.previousElementSibling
    if (previous?.classList.contains('pin-spacer')) previous = previous.firstElementChild
    // Where both sides share a colour, a pale blue keeps the aperture readable.
    const surface = element => { const colour = element ? getComputedStyle(element).backgroundColor : ''; return colour && colour !== 'rgba(0, 0, 0, 0)' ? colour : 'rgb(255, 255, 255)' }
    const leaving = surface(previous), arriving = surface(seam.element)
    const shutter = document.createElementNS(SVG, 'svg')
    shutter.classList.add('lp-seam-shutter')
    shutter.setAttribute('aria-hidden', 'true')
    shutter.setAttribute('preserveAspectRatio', 'none')
    const cover = document.createElementNS(SVG, 'path'), edge = document.createElementNS(SVG, 'path'), inner = document.createElementNS(SVG, 'path')
    cover.setAttribute('fill-rule', 'evenodd')
    cover.style.fill = leaving === arriving ? (arriving === 'rgb(255, 255, 255)' ? '#eaf2fe' : '#ffffff') : leaving
    edge.classList.add('lp-seam-edge')
    inner.classList.add('lp-seam-edge', 'is-inner')
    shutter.append(cover, edge, inner)
    seam.element.prepend(shutter)
    Object.assign(seam, { shutter, cover, edge, inner })
  }

  function draw(seam) {
    const open = easeInOut(clamp01(seam.progress / 0.8))
    const done = open >= 1 || seam.progress >= 1
    seam.shutter.style.visibility = done ? 'hidden' : ''
    seam.element.toggleAttribute('data-seam', !done && seam.progress > 0)
    if (done) return
    const width = seam.element.clientWidth, viewport = window.innerHeight
    const height = Math.min(seam.element.offsetHeight, viewport)
    seam.shutter.setAttribute('viewBox', `0 0 ${width} ${height}`)
    const start = APERTURES[seam.aperture]
    const points = start.map(([sx, sy], i) => {
      const [ex, ey] = OPEN[i]
      return [(sx + (ex - sx) * open) * width, (sy * viewport + (ey * height - sy * viewport) * open)]
    })
    const path = list => `M${list.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`
    const hole = path(points)
    // A second outline, a little inside the first and trailing it: the aperture's bevel.
    const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length, cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length
    const bevel = path(points.map(([x, y]) => [cx + (x - cx) * 0.94, cy + (y - cy) * 0.94]))
    seam.cover.setAttribute('d', `M0 0 H${width} V${height} H0 Z ${hole}`)
    seam.edge.setAttribute('d', hole)
    seam.inner.setAttribute('d', bevel)
    seam.edge.style.opacity = String(Math.min(1, 1.4 * (1 - open)))
    seam.inner.style.opacity = String(0.55 * (1 - open))
  }

  const triggers = seams.map(seam => ScrollTrigger.create({
    trigger: seam.element, start: 'top bottom', end: 'top 20%', invalidateOnRefresh: true,
    onUpdate: self => { seam.progress = self.progress; draw(seam); scene?.wake() },
    onRefresh: self => { seam.progress = self.progress; draw(seam) },
  }))

  // The shards load in their own chunk (three.js), after the page has settled.
  if (canvas) {
    import('./scene/seamScene.js').then(({ createSeamScene }) => {
      if (cancelled) return
      scene = createSeamScene({ canvas, seams })
    }).catch(() => undefined)
  }

  return () => {
    cancelled = true
    for (const trigger of triggers) trigger.kill()
    for (const seam of seams) { seam.shutter.remove(); seam.element.removeAttribute('data-seam') }
    scene?.dispose()
  }
}
