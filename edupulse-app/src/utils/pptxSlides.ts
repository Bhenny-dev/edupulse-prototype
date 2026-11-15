import JSZip from 'jszip'
import { inspectZip } from '../../server/ingest/formats.mjs'
import { all, at, find, flag, num, parseXml, type XmlNode } from './xmlTree'
import { EMU, NONE, colorOf, paintFrom, readLine, readPaint, readTheme, type ColorCtx, type Line, type Paint, type Rels, type Rgba } from './pptxStyle'
import { geometryPath, pictureShape } from './pptxGeometry'

/**
 * Reads a .pptx into positioned slides: boxes in pixels, resolved colors, text with its inherited styles, pictures and tables.
 * Nothing here touches the DOM, so the same code is tested in Node and drawn in the browser.
 */
export type Box = { x: number; y: number; w: number; h: number; rot: number; flipH: boolean; flipV: boolean }
export type Run = { text: string; size: number; bold: boolean; italic: boolean; underline: boolean; strike: boolean; color: string; font: string; baseline: number; caps: boolean; spacing: number; highlight?: string; link?: string }
export type LineBreak = { br: true }
export type Paragraph = { align: 'left' | 'center' | 'right' | 'justify'; marL: number; indent: number; before: number; after: number; line: number; exact?: number; rtl: boolean; size: number; bullet?: { text: string; color: string; font?: string; size: number }; runs: (Run | LineBreak)[] }
export type TextBody = { anchor: 'flex-start' | 'center' | 'flex-end'; insets: [number, number, number, number]; wrap: boolean; paragraphs: Paragraph[] }
export type Cell = { text: TextBody; fill: Paint; borders: [Line | null, Line | null, Line | null, Line | null]; colSpan: number; rowSpan: number }
export type Item =
  | { kind: 'shape'; box: Box; path: string | null; fill: Paint; line: Line | null; text: TextBody | null }
  | { kind: 'image'; box: Box; media: string; crop: [number, number, number, number]; radius?: string; opacity: number; line: Line | null }
  | { kind: 'table'; box: Box; columns: number[]; rows: { height: number; cells: Cell[] }[] }
  | { kind: 'note'; box: Box; label: string }
export type SlideModel = { number: number; background: Paint; items: Item[] }
export type Deck = { width: number; height: number; count: number; slide: (index: number) => Promise<SlideModel>; imageUrl: (path: string) => Promise<string | null>; dispose: () => void }

const MAX_SLIDES = 300, MAX_ITEMS = 1500, MAX_PART = 4_000_000, PT = 96 / 72
type Part = { path: string; xml: XmlNode; rels: Rels }
type Xf = (box: Box) => Box
type Bullet = { kind: 'char'; char: string } | { kind: 'auto'; type: string; start: number }
type Spacing = { pct: number } | { pts: number }
type RP = { sz?: number; b?: boolean; i?: boolean; u?: boolean; strike?: boolean; color?: Rgba; latin?: string; baseline?: number; caps?: boolean; spc?: number; highlight?: Rgba }
type PP = { algn?: string; marL?: number; indent?: number; rtl?: boolean; ln?: Spacing; bef?: Spacing; aft?: Spacing; bullet?: Bullet | 'none'; buClr?: Rgba; buSz?: number; buFont?: string; r: RP }
type Env = { ctx: ColorCtx; rels: Rels; deck: XmlNode | undefined; styles: XmlNode | undefined; layout: Part; master: Part; layoutPh: XmlNode[]; masterPh: XmlNode[]; tableStyles: Map<string, XmlNode>; diagrams: Map<string, Part>; slideNumber: number }

const dirname = (path: string) => path.slice(0, path.lastIndexOf('/') + 1)
const relsPath = (path: string) => `${dirname(path)}_rels/${path.slice(path.lastIndexOf('/') + 1)}.rels`
function resolveTarget(base: string, target: string) {
  if (target.startsWith('/')) return target.slice(1)
  const out: string[] = []
  for (const part of (dirname(base) + target).split('/')) { if (part === '..') out.pop(); else if (part && part !== '.') out.push(part) }
  return out.join('/')
}
function parseRels(xml: XmlNode, base: string): Rels {
  const rels: Rels = new Map()
  for (const rel of all(xml, 'Relationship')) {
    const external = rel.attrs.TargetMode === 'External', target = rel.attrs.Target ?? ''
    rels.set(rel.attrs.Id ?? '', { type: (rel.attrs.Type ?? '').split('/').pop() ?? '', target: external ? target : resolveTarget(base, target), external })
  }
  return rels
}
const relOfType = (part: Part | undefined, type: string) => [...(part?.rels.values() ?? [])].find(rel => rel.type === type && !rel.external)?.target

const MEDIA: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' }
/** The browser type of an embedded picture, or `null` for formats a browser cannot draw (EMF, WMF, TIFF). */
export const mediaType = (path: string) => MEDIA[(path.split('.').pop() ?? '').toLowerCase()] ?? null

const nvPr = (node: XmlNode | undefined) => node ? at(node, node.name === 'p:sp' ? 'p:nvSpPr' : node.name === 'p:pic' ? 'p:nvPicPr' : node.name === 'p:cxnSp' ? 'p:nvCxnSpPr' : 'p:nvGraphicFramePr', 'p:nvPr') : undefined
const phOf = (node: XmlNode | undefined) => find(nvPr(node), 'p:ph')
const placeholderKind = (ph: XmlNode) => { const type = ph.attrs.type ?? 'obj'; return type === 'ctrTitle' ? 'title' : type === 'subTitle' || type === 'obj' ? 'body' : type }
const placeholders = (tree: XmlNode | undefined) => (tree?.children ?? []).filter(node => phOf(node))
function matchPlaceholder(list: XmlNode[], ph: XmlNode, byKindOnly = false) {
  if (!byKindOnly && ph.attrs.idx !== undefined) { const exact = list.find(node => phOf(node)?.attrs.idx === ph.attrs.idx); if (exact) return exact }
  return list.find(node => placeholderKind(phOf(node)!) === placeholderKind(ph))
}

function boxOf(xfrm: XmlNode | undefined, offName = 'a:off', extName = 'a:ext'): Box {
  const off = find(xfrm, offName), ext = find(xfrm, extName)
  return { x: (num(off, 'x') ?? 0) / EMU, y: (num(off, 'y') ?? 0) / EMU, w: (num(ext, 'cx') ?? 0) / EMU, h: (num(ext, 'cy') ?? 0) / EMU, rot: (num(xfrm, 'rot') ?? 0) / 60000, flipH: flag(xfrm, 'flipH') ?? false, flipV: flag(xfrm, 'flipV') ?? false }
}

/** Child shapes of a group live in the group's own coordinates; this maps them onto the slide, including scale, flips and rotation. */
function groupXf(group: XmlNode, parent: Xf): Xf {
  const xfrm = at(group, 'p:grpSpPr', 'a:xfrm')
  if (!xfrm) return parent
  const frame = boxOf(xfrm), childOff = find(xfrm, 'a:chOff'), childExt = find(xfrm, 'a:chExt')
  const cx = (num(childOff, 'x') ?? 0) / EMU, cy = (num(childOff, 'y') ?? 0) / EMU, cw = (num(childExt, 'cx') ?? 0) / EMU, ch = (num(childExt, 'cy') ?? 0) / EMU
  const sx = cw ? frame.w / cw : 1, sy = ch ? frame.h / ch : 1
  return box => {
    let x = frame.x + (box.x - cx) * sx, y = frame.y + (box.y - cy) * sy, rot = box.rot, flipH = box.flipH, flipV = box.flipV
    const w = box.w * sx, h = box.h * sy
    if (frame.flipH) { x = frame.x + frame.w - (x - frame.x) - w; flipH = !flipH; rot = -rot }
    if (frame.flipV) { y = frame.y + frame.h - (y - frame.y) - h; flipV = !flipV; rot = -rot }
    if (frame.rot) {
      const angle = frame.rot * Math.PI / 180, gx = frame.x + frame.w / 2, gy = frame.y + frame.h / 2, dx = x + w / 2 - gx, dy = y + h / 2 - gy
      x = gx + dx * Math.cos(angle) - dy * Math.sin(angle) - w / 2; y = gy + dx * Math.sin(angle) + dy * Math.cos(angle) - h / 2; rot += frame.rot
    }
    return parent({ x, y, w, h, rot, flipH, flipV })
  }
}

// ---- text ---------------------------------------------------------------------------------------------------------

function readRP(node: XmlNode | undefined, env: Env): RP {
  const run: RP = {}
  if (!node) return run
  const size = num(node, 'sz'), bold = flag(node, 'b'), italic = flag(node, 'i'), baseline = num(node, 'baseline'), spacing = num(node, 'spc')
  if (size !== undefined) run.sz = size
  if (bold !== undefined) run.b = bold
  if (italic !== undefined) run.i = italic
  if (node.attrs.u !== undefined) run.u = node.attrs.u !== 'none'
  if (node.attrs.strike !== undefined) run.strike = node.attrs.strike !== 'noStrike'
  if (baseline !== undefined) run.baseline = baseline
  if (node.attrs.cap !== undefined) run.caps = node.attrs.cap === 'all'
  if (spacing !== undefined) run.spc = spacing
  const color = colorOf(find(node, 'a:solidFill'), env.ctx), latin = find(node, 'a:latin')?.attrs.typeface, highlight = colorOf(find(node, 'a:highlight'), env.ctx)
  if (color) run.color = color
  if (latin) run.latin = latin
  if (highlight) run.highlight = highlight
  return run
}
function readSpacing(node: XmlNode | undefined): Spacing | undefined {
  const pct = num(find(node, 'a:spcPct'), 'val'), pts = num(find(node, 'a:spcPts'), 'val')
  return pct !== undefined ? { pct: pct / 100000 } : pts !== undefined ? { pts: pts / 100 } : undefined
}
function readPP(node: XmlNode | undefined, env: Env): PP {
  const props: PP = { r: {} }
  if (!node) return props
  const marL = num(node, 'marL'), indent = num(node, 'indent'), ln = readSpacing(find(node, 'a:lnSpc')), bef = readSpacing(find(node, 'a:spcBef')), aft = readSpacing(find(node, 'a:spcAft'))
  if (node.attrs.algn) props.algn = node.attrs.algn
  if (marL !== undefined) props.marL = marL
  if (indent !== undefined) props.indent = indent
  if (node.attrs.rtl !== undefined) props.rtl = node.attrs.rtl === '1'
  if (ln) props.ln = ln
  if (bef) props.bef = bef
  if (aft) props.aft = aft
  if (find(node, 'a:buNone')) props.bullet = 'none'
  const char = find(node, 'a:buChar'), auto = find(node, 'a:buAutoNum')
  if (char) props.bullet = { kind: 'char', char: char.attrs.char ?? '•' }
  else if (auto) props.bullet = { kind: 'auto', type: auto.attrs.type ?? 'arabicPeriod', start: num(auto, 'startAt') ?? 1 }
  else if (find(node, 'a:buBlip')) props.bullet = { kind: 'char', char: '•' }
  const buColor = colorOf(find(node, 'a:buClr'), env.ctx), buSize = num(find(node, 'a:buSzPct'), 'val'), buFont = find(node, 'a:buFont')?.attrs.typeface
  if (buColor) props.buClr = buColor
  if (buSize !== undefined) props.buSz = buSize / 100000
  if (buFont) props.buFont = buFont
  props.r = readRP(find(node, 'a:defRPr'), env)
  return props
}
const mergeP = (base: PP, over: PP): PP => ({ ...base, ...over, r: { ...base.r, ...over.r } })

const WINGDINGS: Record<string, string> = { '\u00a7': '\u25aa', '\u00d8': '\u27a2', '\u00fc': '\u2713', q: '\u2751', v: '\u2756', l: '\u25cf', n: '\u25a0', u: '\u25c6', w: '\u25c6', '\u00e0': '\u2794', '\u00e8': '\u2794' }
function bulletChar(char: string, font?: string) {
  if (font && /wingdings|webdings/i.test(font)) return WINGDINGS[char] ?? '•'
  if (font && /^symbol$/i.test(font)) return char === '·' || char === '' ? '•' : char
  return char
}
function numbering(type: string, value: number) {
  const letters = (n: number) => { let out = ''; for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) out = String.fromCharCode(97 + ((k - 1) % 26)) + out; return out }
  const roman = (n: number) => { let out = ''; for (const [size, glyph] of [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']] as [number, string][]) while (n >= size) { out += glyph; n -= size } return out }
  const body = type.startsWith('roman') ? roman(value) : type.startsWith('alpha') ? letters(value) : String(value)
  const text = /Uc/.test(type) ? body.toUpperCase() : body
  return /ParenBoth/.test(type) ? `(${text})` : /ParenR/.test(type) ? `${text})` : /Plain/.test(type) ? text : `${text}.`
}

const rgba = (color: { hex: string; alpha: number }) => color.alpha >= 1 ? color.hex : `rgba(${parseInt(color.hex.slice(1, 3), 16)},${parseInt(color.hex.slice(3, 5), 16)},${parseInt(color.hex.slice(5, 7), 16)},${Math.round(color.alpha * 100) / 100})`
const textColor = (env: Env) => env.ctx.theme.colors[env.ctx.map.tx1 ?? 'dk1'] ?? '#000000'

function readText(txBody: XmlNode | undefined, env: Env, layers: (XmlNode | PP | undefined)[], bodyProps: { fontScale: number; lnReduction: number; anchor: TextBody['anchor']; insets: TextBody['insets']; wrap: boolean }): TextBody | null {
  const paragraphs: Paragraph[] = []
  const counters: number[] = []
  for (const para of all(txBody, 'a:p')) {
    const pPr = find(para, 'a:pPr'), level = Math.max(0, Math.min(8, num(pPr, 'lvl') ?? 0))
    let props: PP = { r: {} }
    for (const layer of layers) props = mergeP(props, !layer ? { r: {} } : 'name' in layer ? readPP(find(layer, `a:lvl${level + 1}pPr`), env) : layer)
    props = mergeP(props, readPP(pPr, env))
    const runs: (Run | LineBreak)[] = []
    const styled = (own: XmlNode | undefined, text: string, extra: Partial<Run> = {}, linked = false): Run => {
      const rp = { ...props.r, ...readRP(own, env) }, size = (rp.sz ?? 1800) / 100 * PT * bodyProps.fontScale
      const latin = rp.latin === '+mn-lt' || rp.latin === '+mj-lt' ? env.ctx.theme.fonts[rp.latin] : rp.latin
      return { text, size, bold: rp.b ?? false, italic: rp.i ?? false, underline: rp.u ?? linked, strike: rp.strike ?? false, color: rp.color ? rgba(rp.color) : linked ? env.ctx.theme.colors.hlink ?? textColor(env) : textColor(env), font: latin || env.ctx.theme.fonts['+mn-lt'] || 'Calibri', baseline: rp.baseline ?? 0, caps: rp.caps ?? false, spacing: (rp.spc ?? 0) / 100 * PT, highlight: rp.highlight ? rgba(rp.highlight) : undefined, ...extra }
    }
    for (const child of para.children) {
      if (child.name === 'a:r' || child.name === 'a:fld') {
        const own = find(child, 'a:rPr'), rid = at(own, 'a:hlinkClick')?.attrs['r:id'], target = rid ? env.rels.get(rid) : undefined
        const text = child.name === 'a:fld' && /slidenum/i.test(child.attrs.type ?? '') ? String(env.slideNumber) : find(child, 'a:t')?.text ?? ''
        const link = target?.external && /^(https?:|mailto:)/i.test(target.target) ? target.target : undefined
        // Linked text takes the theme hyperlink color and an underline unless the run says otherwise.
        runs.push(styled(own, text, link ? { link } : {}, Boolean(at(own, 'a:hlinkClick'))))
      } else if (child.name === 'a:br') runs.push({ br: true })
    }
    const end = styled(find(para, 'a:endParaRPr'), ''), first = runs.find((run): run is Run => 'text' in run) ?? end
    // Numbered lists restart whenever a plain paragraph interrupts them.
    let bullet: Paragraph['bullet']
    if (props.bullet && props.bullet !== 'none' && (runs.length || find(para, 'a:endParaRPr'))) {
      const color = props.buClr ? rgba(props.buClr) : first.color, size = first.size * (props.buSz ?? 1)
      if (props.bullet.kind === 'auto') {
        const previous = counters[level]
        counters[level] = previous === undefined ? props.bullet.start : previous + 1
        counters.length = level + 1
        bullet = { text: numbering(props.bullet.type, counters[level]!), color, font: props.buFont, size }
      } else { counters.length = Math.min(counters.length, level); bullet = { text: bulletChar(props.bullet.char, props.buFont), color, font: props.buFont, size } }
    } else counters.length = Math.min(counters.length, level)
    const align = props.algn === 'ctr' ? 'center' : props.algn === 'r' ? 'right' : props.algn === 'just' || props.algn === 'dist' ? 'justify' : 'left'
    const lineHeight = props.ln && 'pct' in props.ln ? Math.max(0.5, props.ln.pct - bodyProps.lnReduction) * 1.2 : 1.2
    const spacing = (value: Spacing | undefined) => !value ? 0 : 'pts' in value ? value.pts * PT : value.pct * end.size * 1.2
    // PowerPoint ignores "space before" on the first paragraph of a text frame.
    paragraphs.push({ align, marL: (props.marL ?? 0) / EMU, indent: (props.indent ?? 0) / EMU, before: paragraphs.length ? spacing(props.bef) : 0, after: spacing(props.aft), line: lineHeight, exact: props.ln && 'pts' in props.ln ? props.ln.pts * PT : undefined, rtl: props.rtl ?? false, size: end.size, bullet, runs })
  }
  return paragraphs.length ? { anchor: bodyProps.anchor, insets: bodyProps.insets, wrap: bodyProps.wrap, paragraphs } : null
}

function bodyProperties(nodes: (XmlNode | undefined)[]) {
  const out = { fontScale: 1, lnReduction: 0, anchor: 'flex-start' as TextBody['anchor'], insets: [91440, 45720, 91440, 45720] as [number, number, number, number], wrap: true }
  for (const node of nodes) {
    if (!node) continue
    if (node.attrs.anchor) out.anchor = node.attrs.anchor === 'ctr' ? 'center' : node.attrs.anchor === 'b' ? 'flex-end' : 'flex-start'
    if (node.attrs.wrap) out.wrap = node.attrs.wrap !== 'none'
    for (const [index, key] of ['lIns', 'tIns', 'rIns', 'bIns'].entries()) { const value = num(node, key); if (value !== undefined) out.insets[index] = value }
    const fit = find(node, 'a:normAutofit')
    if (fit) { out.fontScale = (num(fit, 'fontScale') ?? 100000) / 100000; out.lnReduction = (num(fit, 'lnSpcReduction') ?? 0) / 100000 }
    else if (find(node, 'a:noAutofit') || find(node, 'a:spAutoFit')) { out.fontScale = 1; out.lnReduction = 0 }
  }
  return { ...out, insets: out.insets.map(value => value / EMU) as [number, number, number, number] }
}

// ---- shapes -------------------------------------------------------------------------------------------------------

function styleColorRef(style: XmlNode | undefined, name: string, env: Env) {
  const ref = find(style, name)
  return ref ? { idx: num(ref, 'idx') ?? 0, color: colorOf(ref, env.ctx) } : undefined
}

function readShape(sp: XmlNode, env: Env, xf: Xf, connector: boolean): Item | null {
  if (flag(at(sp, connector ? 'p:nvCxnSpPr' : 'p:nvSpPr', 'p:cNvPr'), 'hidden')) return null
  const ph = phOf(sp), layoutNode = ph ? matchPlaceholder(env.layoutPh, ph) : undefined
  const masterNode = ph ? matchPlaceholder(env.masterPh, layoutNode ? phOf(layoutNode)! : ph, true) : undefined
  const sources = [masterNode, layoutNode, sp], props = sources.map(node => at(node, 'p:spPr'))
  const xfrm = at(sp, 'p:spPr', 'a:xfrm') ?? at(layoutNode, 'p:spPr', 'a:xfrm') ?? at(masterNode, 'p:spPr', 'a:xfrm')
  if (!xfrm) return null
  const box = xf(boxOf(xfrm))
  const geometry = [...props].reverse().find(node => find(node, 'a:prstGeom') || find(node, 'a:custGeom'))
  const style = find(sp, 'p:style')
  const fillRef = styleColorRef(style, 'a:fillRef', env), lineRef = styleColorRef(style, 'a:lnRef', env), fontRef = styleColorRef(style, 'a:fontRef', env)
  const rels = [env.master.rels, env.layout.rels, env.rels]
  let fill: Paint | undefined
  props.forEach((node, index) => { fill = readPaint(node, env.ctx, rels[index], fillRef?.color) ?? fill })
  if (!fill) fill = fillRef && fillRef.idx > 0 ? paintFrom(env.ctx.theme.fills[fillRef.idx - 1], env.ctx, env.rels, fillRef.color) ?? NONE : NONE
  let line: Line | undefined = lineRef && lineRef.idx > 0 ? readLine(env.ctx.theme.lines[lineRef.idx - 1], env.ctx, env.rels, lineRef.color) : undefined
  props.forEach((node, index) => { const ln = at(node, 'a:ln'); if (ln) line = readLine(ln, env.ctx, rels[index], lineRef?.color, line) })
  const kind = ph ? placeholderKind(ph) : undefined
  const styleKey = !ph ? undefined : kind === 'title' ? 'p:titleStyle' : kind === 'body' ? 'p:bodyStyle' : 'p:otherStyle'
  const own = at(sp, 'p:txBody'), body = bodyProperties([at(masterNode, 'p:txBody', 'a:bodyPr'), at(layoutNode, 'p:txBody', 'a:bodyPr'), at(own, 'a:bodyPr')])
  const layers = [env.deck, styleKey ? find(env.styles, styleKey) : undefined, at(masterNode, 'p:txBody', 'a:lstStyle'), at(layoutNode, 'p:txBody', 'a:lstStyle'), ...(fontRef?.color ? [{ r: { color: fontRef.color } } as PP] : []), at(own, 'a:lstStyle')]
  const text = own ? readText(own, env, layers, body) : null
  const path = geometry ? geometryPath(geometry, box.w, box.h) : connector ? geometryPath(undefined, box.w, box.h) : null
  const stroke = line && line.paint.type !== 'none' && line.width > 0 ? line : null
  if (!text && !path) return null
  return { kind: 'shape', box, path: fill.type === 'none' && !stroke ? null : path, fill, line: stroke, text }
}

function readPicture(pic: XmlNode, env: Env, xf: Xf): Item | null {
  if (flag(at(pic, 'p:nvPicPr', 'p:cNvPr'), 'hidden')) return null
  const ph = phOf(pic), layoutNode = ph ? matchPlaceholder(env.layoutPh, ph) : undefined, masterNode = ph ? matchPlaceholder(env.masterPh, layoutNode ? phOf(layoutNode)! : ph, true) : undefined
  const xfrm = at(pic, 'p:spPr', 'a:xfrm') ?? at(layoutNode, 'p:spPr', 'a:xfrm') ?? at(masterNode, 'p:spPr', 'a:xfrm')
  const embed = at(pic, 'p:blipFill', 'a:blip')?.attrs['r:embed'], media = embed ? env.rels.get(embed)?.target : undefined
  if (!xfrm || !media) return null
  const box = xf(boxOf(xfrm)), source = at(pic, 'p:blipFill', 'a:srcRect'), spPr = at(pic, 'p:spPr')
  const crop = (['l', 't', 'r', 'b'] as const).map(side => (num(source, side) ?? 0) / 100000) as [number, number, number, number]
  const line = readLine(at(spPr, 'a:ln'), env.ctx, env.rels)
  return { kind: 'image', box, media, crop, radius: pictureShape(spPr, box.w, box.h)?.radius, opacity: (num(at(pic, 'p:blipFill', 'a:blip', 'a:alphaModFix'), 'amt') ?? 100000) / 100000, line: line && line.paint.type !== 'none' ? line : null }
}

// ---- tables -------------------------------------------------------------------------------------------------------

const MEDIUM_2 = '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}'
type CellStyle = { fill?: Paint; color?: Rgba; bold?: boolean; edges: Partial<Record<'top' | 'right' | 'bottom' | 'left' | 'insideH' | 'insideV', Line | null>> }

function readTableStyle(styleNode: XmlNode | undefined, part: string, env: Env): CellStyle {
  const node = find(styleNode, part)
  const style: CellStyle = { edges: {} }
  if (!node) return style
  const text = find(node, 'a:tcTxStyle')
  if (text) { style.color = colorOf(text, env.ctx) ?? colorOf(find(text, 'a:fontRef'), env.ctx); if (text.attrs.b) style.bold = text.attrs.b === 'on' }
  const cellStyle = find(node, 'a:tcStyle'), fill = find(cellStyle, 'a:fill'), fillRef = find(cellStyle, 'a:fillRef')
  if (fill) style.fill = readPaint(fill, env.ctx, env.rels)
  else if (fillRef) { const idx = num(fillRef, 'idx') ?? 0; style.fill = idx > 0 ? paintFrom(env.ctx.theme.fills[idx - 1], env.ctx, env.rels, colorOf(fillRef, env.ctx)) : NONE }
  for (const edge of ['left', 'right', 'top', 'bottom', 'insideH', 'insideV'] as const) {
    const border = at(cellStyle, 'a:tcBdr', `a:${edge}`)
    if (!border) continue
    const ln = find(border, 'a:ln'), ref = find(border, 'a:lnRef')
    style.edges[edge] = ln ? readLine(ln, env.ctx, env.rels) ?? null : ref && (num(ref, 'idx') ?? 0) > 0 ? readLine(env.ctx.theme.lines[(num(ref, 'idx') ?? 1) - 1], env.ctx, env.rels, colorOf(ref, env.ctx)) ?? null : null
  }
  return style
}
const medium2 = (): XmlNode => parseXml(`<a:tblStyle styleId="${MEDIUM_2}"><a:wholeTbl><a:tcTxStyle><a:fontRef idx="minor"/><a:schemeClr val="dk1"/></a:tcTxStyle><a:tcStyle><a:tcBdr><a:left><a:ln w="12700"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:left><a:right><a:ln w="12700"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:right><a:top><a:ln w="12700"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:top><a:bottom><a:ln w="12700"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:bottom><a:insideH><a:ln w="12700"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:insideH><a:insideV><a:ln w="12700"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:insideV></a:tcBdr><a:fill><a:solidFill><a:schemeClr val="accent1"><a:tint val="20000"/></a:schemeClr></a:solidFill></a:fill></a:tcStyle></a:wholeTbl><a:band1H><a:tcStyle><a:tcBdr/><a:fill><a:solidFill><a:schemeClr val="accent1"><a:tint val="40000"/></a:schemeClr></a:solidFill></a:fill></a:tcStyle></a:band1H><a:band1V><a:tcStyle><a:tcBdr/><a:fill><a:solidFill><a:schemeClr val="accent1"><a:tint val="40000"/></a:schemeClr></a:solidFill></a:fill></a:tcStyle></a:band1V><a:lastCol><a:tcTxStyle b="on"><a:fontRef idx="minor"/><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:tcBdr/><a:fill><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fill></a:tcStyle></a:lastCol><a:firstCol><a:tcTxStyle b="on"><a:fontRef idx="minor"/><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:tcBdr/><a:fill><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fill></a:tcStyle></a:firstCol><a:lastRow><a:tcTxStyle b="on"><a:fontRef idx="minor"/><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:tcBdr/><a:fill><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fill></a:tcStyle></a:lastRow><a:firstRow><a:tcTxStyle b="on"><a:fontRef idx="minor"/><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:tcBdr/><a:fill><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></a:fill></a:tcStyle></a:firstRow></a:tblStyle>`)

function readTable(frame: XmlNode, env: Env, xf: Xf): Item | null {
  const table = at(frame, 'a:graphic', 'a:graphicData', 'a:tbl'), properties = find(table, 'a:tblPr')
  if (!table) return null
  const box = xf(boxOf(find(frame, 'p:xfrm'))), columns = all(find(table, 'a:tblGrid'), 'a:gridCol').map(column => (num(column, 'w') ?? 0) / EMU)
  const styleId = find(properties, 'a:tableStyleId')?.text.trim() ?? '', styleNode = env.tableStyles.get(styleId) ?? (styleId === MEDIUM_2 ? medium2() : undefined)
  const firstRow = flag(properties, 'firstRow'), lastRow = flag(properties, 'lastRow'), firstCol = flag(properties, 'firstCol'), lastCol = flag(properties, 'lastCol'), bandRow = flag(properties, 'bandRow'), bandCol = flag(properties, 'bandCol')
  const rowNodes = all(table, 'a:tr')
  const rows = rowNodes.map((row, r) => {
    const cells: Cell[] = []
    all(row, 'a:tc').forEach((cell, c) => {
      if (flag(cell, 'hMerge') || flag(cell, 'vMerge')) return
      const parts = ['a:wholeTbl']
      if (bandRow) parts.push((r - (firstRow ? 1 : 0)) % 2 === 0 ? 'a:band1H' : 'a:band2H')
      if (bandCol) parts.push(c % 2 === 0 ? 'a:band1V' : 'a:band2V')
      if (firstCol && c === 0) parts.push('a:firstCol')
      if (lastCol && c === columns.length - 1) parts.push('a:lastCol')
      if (lastRow && r === rowNodes.length - 1) parts.push('a:lastRow')
      if (firstRow && r === 0) parts.push('a:firstRow')
      const merged = parts.reduce<CellStyle>((acc, part) => { const next = readTableStyle(styleNode, part, env); return { fill: next.fill ?? acc.fill, color: next.color ?? acc.color, bold: next.bold ?? acc.bold, edges: { ...acc.edges, ...next.edges } } }, { edges: {} })
      const properties = find(cell, 'a:tcPr'), colSpan = num(cell, 'gridSpan') ?? 1, rowSpan = num(cell, 'rowSpan') ?? 1
      const explicit = (name: string) => { const ln = find(properties, name); return ln ? readLine(ln, env.ctx, env.rels) ?? null : undefined }
      const edge = (own: Line | null | undefined, inherited: Line | null | undefined, inside: Line | null | undefined, outer: boolean): Line | null => own !== undefined ? own : (outer ? inherited : inside ?? inherited) ?? null
      const lastColumn = c + colSpan >= columns.length, lastRowEdge = r + rowSpan >= rowNodes.length
      const borders: Cell['borders'] = [edge(explicit('a:lnT'), merged.edges.top, merged.edges.insideH, r === 0), edge(explicit('a:lnR'), merged.edges.right, merged.edges.insideV, lastColumn), edge(explicit('a:lnB'), merged.edges.bottom, merged.edges.insideH, lastRowEdge), edge(explicit('a:lnL'), merged.edges.left, merged.edges.insideV, c === 0)]
      const fill = readPaint(properties, env.ctx, env.rels) ?? merged.fill ?? NONE
      const insets: TextBody['insets'] = [(num(properties, 'marL') ?? 91440) / EMU, (num(properties, 'marT') ?? 45720) / EMU, (num(properties, 'marR') ?? 91440) / EMU, (num(properties, 'marB') ?? 45720) / EMU]
      const anchor = properties?.attrs.anchor === 'ctr' ? 'center' : properties?.attrs.anchor === 'b' ? 'flex-end' : 'flex-start'
      const layers = [env.deck, { r: { color: merged.color, b: merged.bold } } as PP]
      const text = readText(at(cell, 'a:txBody'), env, layers, { fontScale: 1, lnReduction: 0, anchor, insets, wrap: true }) ?? { anchor, insets, wrap: true, paragraphs: [] }
      cells.push({ text, fill, borders, colSpan, rowSpan })
    })
    return { height: (num(row, 'h') ?? 0) / EMU, cells }
  })
  return { kind: 'table', box, columns, rows }
}

function readFrame(frame: XmlNode, env: Env, xf: Xf, out: Item[], depth: number) {
  const uri = at(frame, 'a:graphic', 'a:graphicData')?.attrs.uri ?? ''
  if (/\/table$/.test(uri)) { const table = readTable(frame, env, xf); if (table) out.push(table); return }
  if (/\/diagram$/.test(uri)) {
    // SmartArt keeps a drawn copy of itself in the file; its shapes are laid out relative to the frame.
    const drawing = env.diagrams.get(at(frame, 'a:graphic', 'a:graphicData', 'dgm:relIds')?.attrs['r:dm'] ?? ''), tree = at(drawing?.xml, 'p:spTree'), local = boxOf(find(frame, 'p:xfrm'))
    if (drawing && tree) { readTree(tree.children, { ...env, rels: drawing.rels }, box => xf({ ...box, x: box.x + local.x, y: box.y + local.y }), false, out, depth + 1); return }
  }
  out.push({ kind: 'note', box: xf(boxOf(find(frame, 'p:xfrm'))), label: /chart$/.test(uri) ? 'Chart' : /diagram$/.test(uri) ? 'Diagram' : 'Embedded object' })
}

function readTree(nodes: XmlNode[], env: Env, xf: Xf, skipPlaceholders: boolean, out: Item[], depth = 0) {
  if (depth > 12) return
  for (const node of nodes) {
    if (out.length >= MAX_ITEMS) return
    let item: Item | null = null
    if (node.name === 'p:sp') { if (skipPlaceholders && phOf(node)) continue; item = readShape(node, env, xf, false) }
    else if (node.name === 'p:cxnSp') item = readShape(node, env, xf, true)
    else if (node.name === 'p:pic') { if (skipPlaceholders && phOf(node)) continue; item = readPicture(node, env, xf) }
    else if (node.name === 'p:graphicFrame') readFrame(node, env, xf, out, depth)
    else if (node.name === 'p:grpSp') readTree(node.children, env, groupXf(node, xf), skipPlaceholders, out, depth + 1)
    else if (node.name === 'mc:AlternateContent') { const chosen = find(node, 'mc:Fallback') ?? find(node, 'mc:Choice'); if (chosen) readTree(chosen.children, env, xf, skipPlaceholders, out, depth + 1) }
    if (item) out.push(item)
  }
}

function readBackground(parts: Part[], ctx: ColorCtx): Paint {
  for (const part of parts) {
    const bg = at(part.xml, 'p:cSld', 'p:bg')
    if (!bg) continue
    const declared = readPaint(find(bg, 'p:bgPr'), ctx, part.rels)
    if (declared) return declared
    const ref = find(bg, 'p:bgRef')
    if (ref) {
      const idx = num(ref, 'idx') ?? 0
      return paintFrom(idx >= 1001 ? ctx.theme.backgrounds[idx - 1001] : ctx.theme.fills[idx - 1], ctx, part.rels, colorOf(ref, ctx)) ?? { type: 'solid', color: '#ffffff', opacity: 1 }
    }
  }
  return { type: 'solid', color: '#ffffff', opacity: 1 }
}

/** Opens a presentation. Slides are built on demand, so a long deck costs nothing until it is scrolled to. */
export async function readPptx(bytes: Uint8Array): Promise<Deck> {
  const info = inspectZip(bytes)
  if (!info.names.includes('ppt/presentation.xml')) throw new Error('This file is not a PowerPoint presentation.')
  const zip = await JSZip.loadAsync(bytes)
  const parts = new Map<string, Promise<Part | undefined>>()
  const load = async (path: string): Promise<Part | undefined> => {
    const file = zip.file(path)
    if (!file) return undefined
    const source = await file.async('string')
    if (source.length > MAX_PART) throw new Error('A slide in this file is too large to display.')
    const relsFile = zip.file(relsPath(path))
    // A SmartArt drawing uses its own prefix for the same shape elements a slide has.
    return { path, xml: parseXml(/\/diagrams\/drawing\d*\.xml$/.test(path) ? source.replace(/<(\/?)dsp:/g, '<$1p:') : source), rels: relsFile ? parseRels(parseXml(await relsFile.async('string')), path) : new Map() }
  }
  const part = (path: string | undefined) => { if (!path) return Promise.resolve(undefined); let cached = parts.get(path); if (!cached) { cached = load(path); parts.set(path, cached) } return cached }
  const presentation = await part('ppt/presentation.xml')
  if (!presentation) throw new Error('This presentation has no slide list.')
  const size = at(presentation.xml, 'p:sldSz')
  const width = (num(size, 'cx') ?? 9144000) / EMU, height = (num(size, 'cy') ?? 6858000) / EMU
  let order = all(at(presentation.xml, 'p:sldIdLst'), 'p:sldId').map(id => presentation.rels.get(id.attrs['r:id'] ?? '')?.target).filter((target): target is string => Boolean(target))
  if (!order.length) order = info.names.filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/g)?.pop()) - Number(b.match(/\d+/g)?.pop()))
  if (!order.length) throw new Error('This presentation has no slides.')
  order = order.slice(0, MAX_SLIDES)
  const tableStyles = new Map<string, XmlNode>()
  for (const style of all((await part('ppt/tableStyles.xml'))?.xml, 'a:tblStyle')) tableStyles.set(style.attrs.styleId ?? '', style)
  const built = new Map<number, Promise<SlideModel>>()
  const build = async (index: number): Promise<SlideModel> => {
    const slide = (await part(order[index]))!
    const layout = await part(relOfType(slide, 'slideLayout')) ?? { path: '', xml: parseXml('<p:sldLayout/>'), rels: new Map() as Rels }
    const master = await part(relOfType(layout, 'slideMaster')) ?? { path: '', xml: parseXml('<p:sldMaster/>'), rels: new Map() as Rels }
    const theme = readTheme((await part(relOfType(master, 'theme')))?.xml)
    const map = { ...find(master.xml, 'p:clrMap')?.attrs }
    for (const owner of [layout, slide]) Object.assign(map, at(owner.xml, 'p:clrMapOvr', 'a:overrideClrMapping')?.attrs)
    const ctx: ColorCtx = { theme, map }
    const diagrams = new Map<string, Part>()
    for (const [id, rel] of slide.rels) {
      if (rel.type !== 'diagramData') continue
      const data = await zip.file(rel.target)?.async('string'), drawingId = /<dsp:dataModelExt[^>]*\brelId="([^"]+)"/.exec(data ?? '')?.[1]
      const drawing = await part(drawingId ? slide.rels.get(drawingId)?.target : undefined)
      if (drawing) diagrams.set(id, drawing)
    }
    const env: Env = { ctx, rels: slide.rels, deck: at(presentation.xml, 'p:defaultTextStyle'), styles: at(master.xml, 'p:txStyles'), layout, master, layoutPh: placeholders(at(layout.xml, 'p:cSld', 'p:spTree')), masterPh: placeholders(at(master.xml, 'p:cSld', 'p:spTree')), tableStyles, diagrams, slideNumber: index + 1 }
    const items: Item[] = []
    const identity: Xf = box => box
    const showMaster = flag(slide.xml, 'showMasterSp') !== false && flag(layout.xml, 'showMasterSp') !== false
    if (showMaster) readTree(at(master.xml, 'p:cSld', 'p:spTree')?.children ?? [], { ...env, rels: master.rels }, identity, true, items)
    readTree(at(layout.xml, 'p:cSld', 'p:spTree')?.children ?? [], { ...env, rels: layout.rels }, identity, true, items)
    readTree(at(slide.xml, 'p:cSld', 'p:spTree')?.children ?? [], env, identity, false, items)
    return { number: index + 1, background: readBackground([slide, layout, master], ctx), items }
  }
  const pictures = new Map<string, Promise<string | null>>()
  return {
    width, height, count: order.length,
    slide: index => { let cached = built.get(index); if (!cached) { cached = build(index); built.set(index, cached) } return cached },
    // Pictures become object URLs on demand and are released with the deck.
    imageUrl: path => {
      let cached = pictures.get(path)
      if (!cached) {
        const type = mediaType(path), file = zip.file(path)
        cached = !type || !file ? Promise.resolve(null) : file.async('uint8array').then(data => data.length > 8_000_000 ? null : URL.createObjectURL(new Blob([data as BlobPart], { type })))
        pictures.set(path, cached)
      }
      return cached
    },
    dispose: () => { for (const url of pictures.values()) void url.then(value => { if (value) URL.revokeObjectURL(value) }); pictures.clear() },
  }
}
