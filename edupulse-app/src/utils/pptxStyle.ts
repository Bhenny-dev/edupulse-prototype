import { all, at, find, num, type XmlNode } from './xmlTree'

/** Colors, fills and lines of a presentation, resolved to plain values the slide view can draw. */
export const EMU = 9525
export type Rel = { type: string; target: string; external: boolean }
export type Rels = Map<string, Rel>
export type Rgba = { hex: string; alpha: number }
export type Theme = { colors: Record<string, string>; fonts: Record<string, string>; fills: XmlNode[]; lines: XmlNode[]; backgrounds: XmlNode[] }
export type ColorCtx = { theme: Theme; map: Record<string, string> }
export type Stop = { pos: number; color: string; opacity: number }
export type Paint = { type: 'none' } | { type: 'solid'; color: string; opacity: number } | { type: 'gradient'; radial: boolean; angle: number; cx: number; cy: number; stops: Stop[] } | { type: 'image'; media: string; opacity: number }
export type Line = { width: number; paint: Paint; dash: number[]; head?: string; tail?: string }
export const NONE: Paint = { type: 'none' }

const SYSTEM: Record<string, string> = { windowText: '000000', window: 'ffffff', menuText: '000000', menu: 'ffffff', highlight: '3399ff', highlightText: 'ffffff', btnFace: 'f0f0f0', btnText: '000000', grayText: '808080' }
const PRESET: Record<string, string> = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', lime: '#00ff00', blue: '#0000ff', yellow: '#ffff00', cyan: '#00ffff', aqua: '#00ffff', magenta: '#ff00ff', fuchsia: '#ff00ff', gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000', navy: '#000080', olive: '#808000', purple: '#800080', teal: '#008080', orange: '#ffa500', brown: '#a52a2a', pink: '#ffc0cb', darkBlue: '#00008b', darkRed: '#8b0000', darkGreen: '#006400', lightGray: '#d3d3d3', dkGray: '#a9a9a9', ltGray: '#d3d3d3' }
const DEFAULT_MAP: Record<string, string> = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }
const COLOR_NODES = new Set(['a:srgbClr', 'a:schemeClr', 'a:sysClr', 'a:prstClr', 'a:scrgbClr'])

export function readTheme(root: XmlNode | undefined): Theme {
  const elements = at(root, 'a:themeElements')
  const colors: Record<string, string> = {}
  for (const entry of at(elements, 'a:clrScheme')?.children ?? []) {
    const value = entry.children[0], raw = value?.attrs.val ?? ''
    const hex = value?.name === 'a:sysClr' ? value.attrs.lastClr ?? SYSTEM[raw] ?? '000000' : value?.name === 'a:srgbClr' ? raw : ''
    if (/^[0-9a-fA-F]{6}$/.test(hex)) colors[entry.name.replace('a:', '')] = `#${hex.toLowerCase()}`
  }
  const font = (scheme: string, kind: string) => at(elements, 'a:fontScheme', scheme, kind)?.attrs.typeface ?? ''
  const fonts = { '+mj-lt': font('a:majorFont', 'a:latin'), '+mn-lt': font('a:minorFont', 'a:latin'), '+mj-ea': font('a:majorFont', 'a:ea'), '+mn-ea': font('a:minorFont', 'a:ea'), '+mj-cs': font('a:majorFont', 'a:cs'), '+mn-cs': font('a:minorFont', 'a:cs') }
  const format = at(elements, 'a:fmtScheme')
  return { colors, fonts, fills: at(format, 'a:fillStyleLst')?.children ?? [], lines: at(format, 'a:lnStyleLst')?.children ?? [], backgrounds: at(format, 'a:bgFillStyleLst')?.children ?? [] }
}

const clamp = (value: number, low = 0, high = 255) => Math.max(low, Math.min(high, value))
const toLinear = (part: number) => { const value = clamp(part) / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4 }
const fromLinear = (value: number) => 255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * Math.max(0, value) ** (1 / 2.4) - 0.055)
const channels = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map(value => Math.round(clamp(value)).toString(16).padStart(2, '0')).join('')}`
function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const red = r / 255, green = g / 255, blue = b / 255, max = Math.max(red, green, blue), min = Math.min(red, green, blue), lightness = (max + min) / 2, delta = max - min
  if (!delta) return [0, 0, lightness]
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue = max === red ? ((green - blue) / delta) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4
  return [((hue * 60) + 360) % 360, saturation, lightness]
}
function fromHsl([hue, saturation, lightness]: [number, number, number]): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation, x = chroma * (1 - Math.abs((hue / 60) % 2 - 1)), m = lightness - chroma / 2
  const [r, g, b] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** Resolves one color element (`a:srgbClr`, `a:schemeClr`...) with its transforms. `ph` is the color that `phClr` stands for. */
export function resolveColor(node: XmlNode | undefined, ctx: ColorCtx, ph?: Rgba): Rgba | undefined {
  if (!node || !COLOR_NODES.has(node.name)) return undefined
  const value = node.attrs.val ?? ''
  let hex: string | undefined, alpha = 1
  if (node.name === 'a:srgbClr') hex = `#${value.toLowerCase()}`
  else if (node.name === 'a:sysClr') hex = `#${(node.attrs.lastClr ?? SYSTEM[value] ?? '000000').toLowerCase()}`
  else if (node.name === 'a:prstClr') hex = PRESET[value] ?? '#000000'
  else if (node.name === 'a:scrgbClr') hex = toHex(...[node.attrs.r, node.attrs.g, node.attrs.b].map(part => (Number(part) || 0) / 100000 * 255) as [number, number, number])
  else if (value === 'phClr') { if (!ph) return undefined; hex = ph.hex; alpha = ph.alpha }
  else { const mapped = ctx.map[value] ?? DEFAULT_MAP[value] ?? value; hex = ctx.theme.colors[mapped] ?? ctx.theme.colors[value] }
  if (!hex || !/^#[0-9a-f]{6}$/.test(hex)) return undefined
  let rgb = channels(hex)
  for (const step of node.children) {
    const amount = (num(step, 'val') ?? 0) / 100000
    switch (step.name) {
      case 'a:alpha': alpha = amount; break
      case 'a:alphaMod': alpha *= amount; break
      case 'a:alphaOff': alpha += amount; break
      // PowerPoint mixes tints and shades in linear light, which is why a 75% tint of black is a mid grey (#898989) and not #404040.
      case 'a:tint': rgb = rgb.map(part => fromLinear(toLinear(part) * amount + (1 - amount))) as typeof rgb; break
      case 'a:shade': rgb = rgb.map(part => fromLinear(toLinear(part) * amount)) as typeof rgb; break
      case 'a:lumMod': case 'a:lumOff': case 'a:lum': case 'a:satMod': case 'a:satOff': case 'a:sat': case 'a:hueMod': case 'a:hueOff': case 'a:hue': {
        const hsl = toHsl(rgb.map(part => clamp(part)) as typeof rgb)
        if (step.name === 'a:lumMod') hsl[2] *= amount; else if (step.name === 'a:lumOff') hsl[2] += amount; else if (step.name === 'a:lum') hsl[2] = amount
        else if (step.name === 'a:satMod') hsl[1] *= amount; else if (step.name === 'a:satOff') hsl[1] += amount; else if (step.name === 'a:sat') hsl[1] = amount
        else if (step.name === 'a:hueMod') hsl[0] *= amount; else if (step.name === 'a:hueOff') hsl[0] += (num(step, 'val') ?? 0) / 60000; else hsl[0] = (num(step, 'val') ?? 0) / 60000
        rgb = fromHsl([((hsl[0] % 360) + 360) % 360, clamp(hsl[1], 0, 1), clamp(hsl[2], 0, 1)])
        break
      }
      default: break
    }
  }
  return { hex: toHex(...rgb), alpha: clamp(alpha, 0, 1) }
}

/** The first color element inside a fill, text-color or `fontRef` parent. */
export const colorOf = (parent: XmlNode | undefined, ctx: ColorCtx, ph?: Rgba) => resolveColor(parent?.children.find(child => COLOR_NODES.has(child.name)), ctx, ph)

const solid = (color: Rgba | undefined): Paint => color ? { type: 'solid', color: color.hex, opacity: color.alpha } : NONE

/** Turns one fill element (`a:solidFill`, `a:gradFill`, `a:blipFill`...) into a paint. */
export function paintFrom(element: XmlNode | undefined, ctx: ColorCtx, rels?: Rels, ph?: Rgba): Paint | undefined {
  if (!element) return undefined
  if (element.name === 'a:noFill') return NONE
  if (element.name === 'a:solidFill') return solid(colorOf(element, ctx, ph))
  if (element.name === 'a:pattFill') return solid(colorOf(find(element, 'a:fgClr'), ctx, ph))
  if (element.name === 'a:blipFill') {
    const embed = at(element, 'a:blip')?.attrs['r:embed'], media = embed ? rels?.get(embed)?.target : undefined
    return media ? { type: 'image', media, opacity: (num(at(element, 'a:blip', 'a:alphaModFix'), 'amt') ?? 100000) / 100000 } : NONE
  }
  if (element.name === 'a:gradFill') {
    const stops = all(at(element, 'a:gsLst'), 'a:gs').flatMap(stop => { const color = colorOf(stop, ctx, ph); return color ? [{ pos: (num(stop, 'pos') ?? 0) / 100000, color: color.hex, opacity: color.alpha }] : [] })
    if (stops.length < 2) return stops[0] ? { type: 'solid', color: stops[0].color, opacity: stops[0].opacity } : NONE
    // A path gradient grows from the focus rectangle; its middle is where the stops start.
    const focus = at(element, 'a:path', 'a:fillToRect'), centerX = focus ? ((num(focus, 'l') ?? 0) + 100000 - (num(focus, 'r') ?? 0)) / 200000 : 0.5, centerY = focus ? ((num(focus, 't') ?? 0) + 100000 - (num(focus, 'b') ?? 0)) / 200000 : 0.5
    return { type: 'gradient', radial: !find(element, 'a:lin') && Boolean(find(element, 'a:path')), angle: (num(find(element, 'a:lin'), 'ang') ?? 0) / 60000, cx: centerX, cy: centerY, stops }
  }
  return undefined
}

/** The fill declared directly inside a shape-properties style element, or `undefined` when it inherits. */
export function readPaint(parent: XmlNode | undefined, ctx: ColorCtx, rels?: Rels, ph?: Rgba): Paint | undefined {
  const element = parent?.children.find(child => ['a:noFill', 'a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill'].includes(child.name))
  return paintFrom(element, ctx, rels, ph)
}

const DASH: Record<string, number[]> = { dot: [1, 3], sysDot: [1, 1], dash: [4, 3], sysDash: [3, 1], lgDash: [8, 3], dashDot: [4, 3, 1, 3], sysDashDot: [3, 1, 1, 1], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDashDotDot: [3, 1, 1, 1, 1, 1] }

/** An `a:ln` element on top of an optional base line (the theme's line style). */
export function readLine(ln: XmlNode | undefined, ctx: ColorCtx, rels?: Rels, ph?: Rgba, base?: Line): Line | undefined {
  if (!ln && !base) return undefined
  const paint = readPaint(ln, ctx, rels, ph) ?? base?.paint ?? NONE
  const width = num(ln, 'w') !== undefined ? num(ln, 'w')! / EMU : base?.width ?? 1
  const dash = DASH[find(ln, 'a:prstDash')?.attrs.val ?? ''] ?? (find(ln, 'a:prstDash') ? [] : base?.dash ?? [])
  const head = find(ln, 'a:headEnd')?.attrs.type, tail = find(ln, 'a:tailEnd')?.attrs.type
  return { width, paint, dash, head: head && head !== 'none' ? head : base?.head, tail: tail && tail !== 'none' ? tail : base?.tail }
}
