import { all, at, find, num, type XmlNode } from './xmlTree'
import { EMU } from './pptxStyle'

/** SVG outlines (in pixels, inside a w x h box) for PowerPoint preset shapes and freeform shapes. */
type Point = [number, number]
const round = (value: number) => Math.round(value * 100) / 100
const poly = (...points: Point[]) => `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`

function rounded(w: number, h: number, tl: number, tr: number, br: number, bl: number) {
  const arc = (r: number, x: number, y: number) => r > 0 ? `A${round(r)} ${round(r)} 0 0 1 ${round(x)} ${round(y)}` : ''
  return `M${round(tl)} 0H${round(w - tr)}${arc(tr, w, tr)}V${round(h - br)}${arc(br, w - br, h)}H${round(bl)}${arc(bl, 0, h - bl)}V${round(tl)}${arc(tl, tl, 0)}Z`
}
const ellipse = (w: number, h: number) => `M0 ${round(h / 2)}A${round(w / 2)} ${round(h / 2)} 0 1 1 ${round(w)} ${round(h / 2)}A${round(w / 2)} ${round(h / 2)} 0 1 1 0 ${round(h / 2)}Z`
function star(points: number, inner: number, w: number, h: number) {
  const out: Point[] = []
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 ? inner : 1, angle = -Math.PI / 2 + index * Math.PI / points
    out.push([w / 2 + Math.cos(angle) * radius * w / 2, h / 2 + Math.sin(angle) * radius * h / 2])
  }
  return poly(...out)
}

/** A rectangle with a pointer, used for speech-bubble callouts. */
function callout(w: number, h: number, tipX: number, tipY: number) {
  const dx = (tipX - w / 2) / (w / 2), dy = (tipY - h / 2) / (h / 2)
  const side = Math.min(w, h) * 0.18, clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
  if (Math.abs(dx) > Math.abs(dy)) {
    const y = clamp(tipY, side, h - side)
    return dx < 0 ? poly([0, 0], [w, 0], [w, h], [0, h], [0, y + side], [tipX, tipY], [0, y - side]) : poly([0, 0], [w, 0], [w, y - side], [tipX, tipY], [w, y + side], [w, h], [0, h])
  }
  const x = clamp(tipX, side * 2, w - side * 2)
  return dy < 0 ? poly([0, 0], [x - side, 0], [tipX, tipY], [x + side, 0], [w, 0], [w, h], [0, h]) : poly([0, 0], [w, 0], [w, h], [x + side, h], [tipX, tipY], [x - side, h], [0, h])
}

function adjustments(geometry: XmlNode | undefined) {
  const out: Record<string, number> = {}
  for (const guide of all(find(geometry, 'a:avLst'), 'a:gd')) {
    const match = /^val\s+(-?\d+)/.exec(guide.attrs.fmla ?? '')
    if (match) out[guide.attrs.name ?? ''] = Number(match[1])
  }
  return out
}

function preset(name: string, w: number, h: number, a: Record<string, number>): string {
  const ss = Math.min(w, h), part = (key: string, fallback: number) => (a[key] ?? fallback) / 100000
  switch (name) {
    case 'roundRect': case 'flowChartAlternateProcess': { const r = Math.min(ss * part('adj', 16667), ss / 2); return rounded(w, h, r, r, r, r) }
    case 'round2SameRect': { const top = Math.min(ss * part('adj1', 16667), ss / 2), bottom = Math.min(ss * part('adj2', 0), ss / 2); return rounded(w, h, top, top, bottom, bottom) }
    case 'round1Rect': return rounded(w, h, 0, Math.min(ss * part('adj', 16667), ss / 2), 0, 0)
    case 'flowChartTerminator': return rounded(w, h, ss / 2, ss / 2, ss / 2, ss / 2)
    case 'ellipse': case 'flowChartConnector': case 'cloud': case 'sun': case 'smileyFace': return ellipse(w, h)
    case 'donut': { const t = ss * part('adj', 25000); return `${ellipse(w, h)}M${round(t)} ${round(h / 2)}A${round(w / 2 - t)} ${round(h / 2 - t)} 0 1 0 ${round(w - t)} ${round(h / 2)}A${round(w / 2 - t)} ${round(h / 2 - t)} 0 1 0 ${round(t)} ${round(h / 2)}Z` }
    case 'triangle': return poly([w * part('adj', 50000), 0], [w, h], [0, h])
    case 'rtTriangle': return poly([0, 0], [w, h], [0, h])
    case 'diamond': case 'flowChartDecision': return poly([w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2])
    case 'parallelogram': case 'flowChartData': { const x = Math.min(ss * part('adj', 25000), w); return poly([x, 0], [w, 0], [w - x, h], [0, h]) }
    case 'trapezoid': { const x = Math.min(ss * part('adj', 25000), w / 2); return poly([x, 0], [w - x, 0], [w, h], [0, h]) }
    case 'homePlate': { const x = w - Math.min(ss * part('adj', 50000), w); return poly([0, 0], [x, 0], [w, h / 2], [x, h], [0, h]) }
    case 'chevron': { const x = Math.min(ss * part('adj', 50000), w); return poly([0, 0], [w - x, 0], [w, h / 2], [w - x, h], [0, h], [x, h / 2]) }
    case 'pentagon': return poly([w / 2, 0], [w, h * 0.382], [w * 0.809, h], [w * 0.191, h], [0, h * 0.382])
    case 'hexagon': { const x = Math.min(ss * part('adj', 25000), w / 2); return poly([x, 0], [w - x, 0], [w, h / 2], [w - x, h], [x, h], [0, h / 2]) }
    case 'octagon': { const x = Math.min(ss * part('adj', 29289), w / 2, h / 2); return poly([x, 0], [w - x, 0], [w, x], [w, h - x], [w - x, h], [x, h], [0, h - x], [0, x]) }
    case 'plus': { const x = Math.min(ss * part('adj', 25000), w / 2, h / 2); return poly([x, 0], [w - x, 0], [w - x, x], [w, x], [w, h - x], [w - x, h - x], [w - x, h], [x, h], [x, h - x], [0, h - x], [0, x], [x, x]) }
    case 'rightArrow': case 'notchedRightArrow': case 'stripedRightArrow': case 'leftArrow': {
      const thick = h * part('adj1', 50000), head = Math.min(ss * part('adj2', 50000), w), y1 = (h - thick) / 2, y2 = y1 + thick, x1 = w - head
      const points: Point[] = [[0, y1], [x1, y1], [x1, 0], [w, h / 2], [x1, h], [x1, y2], [0, y2]]
      return poly(...(name === 'leftArrow' ? points.map(([x, y]): Point => [w - x, y]) : points))
    }
    case 'upArrow': case 'downArrow': {
      const thick = w * part('adj1', 50000), head = Math.min(ss * part('adj2', 50000), h), x1 = (w - thick) / 2, x2 = x1 + thick
      const points: Point[] = [[w / 2, 0], [w, head], [x2, head], [x2, h], [x1, h], [x1, head], [0, head]]
      return poly(...(name === 'upArrow' ? points : points.map(([x, y]): Point => [x, h - y])))
    }
    case 'leftRightArrow': {
      const thick = h * part('adj1', 50000), head = Math.min(ss * part('adj2', 50000), w / 2), y1 = (h - thick) / 2, y2 = y1 + thick
      return poly([0, h / 2], [head, 0], [head, y1], [w - head, y1], [w - head, 0], [w, h / 2], [w - head, h], [w - head, y2], [head, y2], [head, h])
    }
    case 'star4': return star(4, (a.adj ?? 12500) / 50000, w, h)
    case 'star5': return star(5, (a.adj ?? 19098) / 50000, w, h)
    case 'star6': return star(6, (a.adj ?? 28868) / 50000, w, h)
    case 'star8': return star(8, (a.adj ?? 37500) / 50000, w, h)
    case 'wedgeRectCallout': case 'wedgeRoundRectCallout': return callout(w, h, w / 2 + w * part('adj1', -20833), h / 2 + h * part('adj2', 62500))
    case 'line': case 'straightConnector1': return `M0 0L${round(w)} ${round(h)}`
    case 'bentConnector2': return `M0 0H${round(w)}V${round(h)}`
    case 'bentConnector3': case 'bentConnector4': case 'bentConnector5': return `M0 0H${round(w * part('adj1', 50000))}V${round(h)}H${round(w)}`
    case 'curvedConnector2': return `M0 0Q${round(w)} 0 ${round(w)} ${round(h)}`
    case 'curvedConnector3': case 'curvedConnector4': case 'curvedConnector5': return `M0 0C${round(w / 2)} 0 ${round(w / 2)} ${round(h)} ${round(w)} ${round(h)}`
    default: return poly([0, 0], [w, 0], [w, h], [0, h])
  }
}

function freeform(geometry: XmlNode, w: number, h: number): string | null {
  let d = ''
  for (const path of all(at(geometry, 'a:pathLst'), 'a:path')) {
    const pathW = num(path, 'w') || 0, pathH = num(path, 'h') || 0, sx = pathW ? w / pathW : 1 / EMU, sy = pathH ? h / pathH : 1 / EMU
    const point = (node: XmlNode | undefined): Point => [(num(node, 'x') ?? 0) * sx, (num(node, 'y') ?? 0) * sy]
    let x = 0, y = 0, startX = 0, startY = 0
    for (const command of path.children) {
      const points = all(command, 'a:pt').map(point)
      if (command.name === 'a:moveTo' && points[0]) { [x, y] = points[0]; [startX, startY] = [x, y]; d += `M${round(x)} ${round(y)}` }
      else if (command.name === 'a:lnTo' && points[0]) { [x, y] = points[0]; d += `L${round(x)} ${round(y)}` }
      else if (command.name === 'a:cubicBezTo' && points.length === 3) { d += `C${points.map(p => `${round(p[0])} ${round(p[1])}`).join(' ')}`; [x, y] = points[2]! }
      else if (command.name === 'a:quadBezTo' && points.length === 2) { d += `Q${points.map(p => `${round(p[0])} ${round(p[1])}`).join(' ')}`; [x, y] = points[1]! }
      else if (command.name === 'a:arcTo') {
        const rx = (num(command, 'wR') ?? 0) * sx, ry = (num(command, 'hR') ?? 0) * sy, start = (num(command, 'stAng') ?? 0) / 60000 * Math.PI / 180, sweep = (num(command, 'swAng') ?? 0) / 60000 * Math.PI / 180
        if (rx > 0 && ry > 0) {
          const centerX = x - rx * Math.cos(start), centerY = y - ry * Math.sin(start)
          x = centerX + rx * Math.cos(start + sweep); y = centerY + ry * Math.sin(start + sweep)
          d += `A${round(rx)} ${round(ry)} 0 ${Math.abs(sweep) > Math.PI ? 1 : 0} ${sweep > 0 ? 1 : 0} ${round(x)} ${round(y)}`
        }
      } else if (command.name === 'a:close') { d += 'Z'; [x, y] = [startX, startY] }
    }
  }
  return d || null
}

/** The outline of a shape in its own w x h pixel box, or `null` when the shape declares no geometry. */
export function geometryPath(shapeProperties: XmlNode | undefined, w: number, h: number): string | null {
  const custom = find(shapeProperties, 'a:custGeom')
  if (custom) return freeform(custom, w, h)
  const named = find(shapeProperties, 'a:prstGeom')
  if (!named) return null
  return preset(named.attrs.prst ?? 'rect', w, h, adjustments(named))
}

/** Rounded corner radius for a picture clipped to a preset shape. */
export function pictureShape(shapeProperties: XmlNode | undefined, w: number, h: number): { radius: string } | null {
  const named = find(shapeProperties, 'a:prstGeom')?.attrs.prst
  if (named === 'ellipse') return { radius: '50%' }
  if (named === 'roundRect') return { radius: `${round(Math.min(w, h) * (adjustments(find(shapeProperties, 'a:prstGeom')).adj ?? 16667) / 100000)}px` }
  return null
}
