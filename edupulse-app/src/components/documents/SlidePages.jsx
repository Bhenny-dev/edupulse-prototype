import { useEffect, useRef, useState } from 'react'
import { LoadingStatus } from '../ui/LoadingFeedback'
import useNearViewport from './useNearViewport'
import './file-pages.css'

/* Draws the slides of an uploaded .pptx the way they were laid out: every shape, picture and table sits where the file puts it. */

const rgba = (hex, opacity = 1) => opacity >= 1 ? hex : `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.round(opacity * 100) / 100})`
const FONTS = {
  calibri: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif', 'calibri light': '"Calibri Light", Calibri, Carlito, "Segoe UI", Arial, sans-serif',
  arial: 'Arial, Helvetica, sans-serif', 'arial black': '"Arial Black", Arial, sans-serif', 'times new roman': '"Times New Roman", Times, serif', georgia: 'Georgia, serif',
  'courier new': '"Courier New", Courier, monospace', consolas: 'Consolas, "Courier New", monospace', verdana: 'Verdana, Geneva, sans-serif', 'segoe ui': '"Segoe UI", system-ui, sans-serif',
}
const fontStack = name => FONTS[name.toLowerCase()] ?? `"${name.replace(/["\\]/g, '')}", Calibri, "Segoe UI", Arial, sans-serif`

function background(paint, urls) {
  if (paint.type === 'solid') return { background: rgba(paint.color, paint.opacity) }
  if (paint.type === 'gradient') {
    const stops = paint.stops.map(stop => `${rgba(stop.color, stop.opacity)} ${Math.round(stop.pos * 100)}%`).join(', ')
    return { background: paint.radial ? `radial-gradient(circle farthest-corner at ${paint.cx * 100}% ${paint.cy * 100}%, ${stops})` : `linear-gradient(${paint.angle + 90}deg, ${stops})` }
  }
  if (paint.type === 'image' && urls[paint.media]) return { background: `url("${urls[paint.media]}") center / 100% 100% no-repeat` }
  return {}
}
const placement = box => ({ left: box.x, top: box.y, width: box.w, height: box.h, transform: box.rot ? `rotate(${box.rot}deg)` : undefined })
const flips = box => box.flipH || box.flipV ? `scale(${box.flipH ? -1 : 1}, ${box.flipV ? -1 : 1})` : undefined
const strokeColor = line => line ? line.paint.type === 'solid' ? line.paint.color : line.paint.type === 'gradient' ? line.paint.stops[0].color : 'none' : 'none'
const edge = line => line && line.paint.type === 'solid' ? `${Math.max(line.width, 0.5)}px ${line.dash.length ? 'dashed' : 'solid'} ${rgba(line.paint.color, line.paint.opacity)}` : 'none'

function Gradient({ id, paint }) {
  const stops = paint.stops.map((stop, index) => <stop key={index} offset={`${stop.pos * 100}%`} stopColor={stop.color} stopOpacity={stop.opacity} />)
  if (paint.radial) return <radialGradient id={id} cx={paint.cx} cy={paint.cy} fx={paint.cx} fy={paint.cy} r={Math.hypot(Math.max(paint.cx, 1 - paint.cx), Math.max(paint.cy, 1 - paint.cy))}>{stops}</radialGradient>
  const angle = paint.angle * Math.PI / 180, dx = Math.cos(angle) / 2, dy = Math.sin(angle) / 2
  return <linearGradient id={id} x1={0.5 - dx} y1={0.5 - dy} x2={0.5 + dx} y2={0.5 + dy}>{stops}</linearGradient>
}
/** PowerPoint draws arrowheads at least as large as those of a 2.5pt line, so thin lines still get a visible head. */
function Arrow({ id, type, color, width }) {
  const round = type === 'oval' || type === 'diamond', size = Math.max(width * 3, 9)
  const shape = type === 'oval' ? <circle cx="5" cy="5" r="4.5" /> : type === 'diamond' ? <path d="M0 5L5 0L10 5L5 10Z" /> : <path d="M0 0L10 5L0 10Z" />
  return <marker id={id} viewBox="0 0 10 10" refX={round ? 5 : 10} refY="5" markerUnits="userSpaceOnUse" markerWidth={size} markerHeight={size} orient="auto-start-reverse" fill={color}>{shape}</marker>
}

function Geometry({ item, id, urls }) {
  const { box, path, fill, line } = item, defs = []
  let fillValue = 'none', fillOpacity
  if (fill.type === 'solid') { fillValue = fill.color; fillOpacity = fill.opacity }
  else if (fill.type === 'gradient') { fillValue = `url(#${id}g)`; defs.push(<Gradient key="g" id={`${id}g`} paint={fill} />) }
  else if (fill.type === 'image' && urls[fill.media]) defs.push(<clipPath key="c" id={`${id}c`}><path d={path} /></clipPath>)
  const color = strokeColor(line), gradientStroke = line?.paint.type === 'gradient' && box.w > 0 && box.h > 0
  if (gradientStroke) defs.push(<Gradient key="s" id={`${id}s`} paint={line.paint} />)
  if (line?.head) defs.push(<Arrow key="h" id={`${id}h`} type={line.head} color={color} width={line.width} />)
  if (line?.tail) defs.push(<Arrow key="t" id={`${id}t`} type={line.tail} color={color} width={line.width} />)
  // An SVG with a zero side is not drawn at all, so straight horizontal and vertical lines keep a one pixel box.
  return <svg width={Math.max(box.w, 1)} height={Math.max(box.h, 1)} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: flips(box), transformOrigin: 'center' }}>
    <defs>{defs}</defs>
    {fill.type === 'image' && urls[fill.media] && <image href={urls[fill.media]} width={box.w} height={box.h} preserveAspectRatio="none" clipPath={`url(#${id}c)`} opacity={fill.opacity} />}
    <path d={path} fill={fillValue} fillOpacity={fillOpacity} fillRule="evenodd" stroke={gradientStroke ? `url(#${id}s)` : color} strokeWidth={line?.width} strokeOpacity={line?.paint.type === 'solid' ? line.paint.opacity : 1} strokeDasharray={line?.dash.length ? line.dash.map(part => part * Math.max(line.width, 1)).join(' ') : undefined} strokeLinejoin="round"
      markerStart={line?.head ? `url(#${id}h)` : undefined} markerEnd={line?.tail ? `url(#${id}t)` : undefined} />
  </svg>
}

function Run({ run, flat }) {
  const small = run.baseline !== 0
  const style = {
    fontSize: small ? run.size * 0.65 : run.size, fontFamily: fontStack(run.font), fontWeight: run.bold ? 700 : undefined, fontStyle: run.italic ? 'italic' : undefined,
    textDecoration: [run.underline && 'underline', run.strike && 'line-through'].filter(Boolean).join(' ') || undefined, color: run.color, textTransform: run.caps ? 'uppercase' : undefined,
    lineHeight: flat ? 0 : undefined, letterSpacing: run.spacing || undefined, backgroundColor: run.highlight, verticalAlign: run.baseline > 0 ? 'super' : run.baseline < 0 ? 'sub' : undefined,
  }
  return run.link ? <a href={run.link} target="_blank" rel="noopener noreferrer" style={style}>{run.text}</a> : <span style={style}>{run.text}</span>
}
function Paragraph({ paragraph }) {
  const { bullet } = paragraph, flat = Boolean(paragraph.exact)
  // The line box follows the largest run, as in PowerPoint, so the paragraph's own (end-of-paragraph) size must not stretch it.
  const largest = paragraph.runs.reduce((size, run) => 'text' in run ? Math.max(size, run.size) : size, 0) || paragraph.size
  const style = { margin: 0, marginTop: paragraph.before, marginBottom: paragraph.after, paddingLeft: paragraph.marL, textIndent: paragraph.indent, textAlign: paragraph.align, direction: paragraph.rtl ? 'rtl' : undefined, fontSize: largest, lineHeight: paragraph.exact ? `${paragraph.exact}px` : paragraph.line }
  return <p style={style}>
    {bullet && <span aria-hidden="true" style={{ display: 'inline-block', minWidth: Math.max(0, -paragraph.indent), paddingRight: paragraph.indent < 0 ? 0 : '0.4em', textIndent: 0, lineHeight: flat ? 0 : undefined, color: bullet.color, fontSize: bullet.size, fontFamily: bullet.font && !/wingdings|webdings|symbol/i.test(bullet.font) ? fontStack(bullet.font) : undefined }}>{bullet.text}</span>}
    {paragraph.runs.map((run, index) => 'br' in run ? <br key={index} /> : <Run key={index} run={run} flat={flat} />)}
    {!paragraph.runs.length && <br />}
  </p>
}
function TextLayer({ text }) {
  const [left, top, right, bottom] = text.insets
  return <div className="slide-text" style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', padding: `${top}px ${right}px ${bottom}px ${left}px`, display: 'flex', flexDirection: 'column', justifyContent: text.anchor, whiteSpace: text.wrap ? 'pre-wrap' : 'pre' }}>
    {text.paragraphs.map((paragraph, index) => <Paragraph key={index} paragraph={paragraph} />)}
  </div>
}

function Picture({ item, urls }) {
  const { box, crop: [l, t, r, b] } = item, url = urls[item.media], w = box.w / Math.max(0.01, 1 - l - r), h = box.h / Math.max(0.01, 1 - t - b)
  return <div className="slide-item" style={{ ...placement(box), overflow: 'hidden', borderRadius: item.radius, opacity: item.opacity < 1 ? item.opacity : undefined, boxShadow: item.line ? `inset 0 0 0 ${item.line.width}px ${strokeColor(item.line)}` : undefined }}>
    {url ? <img src={url} alt="" draggable={false} style={{ position: 'absolute', left: -l * w, top: -t * h, width: w, height: h, maxWidth: 'none', transform: flips(box) }} /> : <div className="slide-note" style={{ width: '100%', height: '100%' }}>Picture</div>}
  </div>
}

const ANCHOR = { 'flex-start': 'top', center: 'middle', 'flex-end': 'bottom' }
function Table({ item, urls }) {
  const width = item.columns.reduce((sum, column) => sum + column, 0) || item.box.w
  return <div className="slide-item" style={placement(item.box)}>
    <table className="slide-table" style={{ width, borderSpacing: 0 }}>
      <colgroup>{item.columns.map((column, index) => <col key={index} style={{ width: column }} />)}</colgroup>
      <tbody>{item.rows.map((row, r) => <tr key={r} style={{ height: row.height }}>{row.cells.map((cell, c) => {
        const [left, top, right, bottom] = cell.text.insets
        return <td key={c} colSpan={cell.colSpan} rowSpan={cell.rowSpan} style={{ ...background(cell.fill, urls), borderTop: edge(cell.borders[0]), borderRight: edge(cell.borders[1]), borderBottom: edge(cell.borders[2]), borderLeft: edge(cell.borders[3]), verticalAlign: ANCHOR[cell.text.anchor] }}>
          <div className="slide-cell" style={{ padding: `${top}px ${right}px ${bottom}px ${left}px`, whiteSpace: 'pre-wrap' }}>{cell.text.paragraphs.map((paragraph, index) => <Paragraph key={index} paragraph={paragraph} />)}</div>
        </td>
      })}</tr>)}</tbody>
    </table>
  </div>
}

function SlideItem({ item, urls, id }) {
  if (item.kind === 'image') return <Picture item={item} urls={urls} />
  if (item.kind === 'table') return <Table item={item} urls={urls} />
  if (item.kind === 'note') return <div className="slide-item slide-note" style={placement(item.box)}>{item.label} (see the original file)</div>
  return <div className="slide-item" style={placement(item.box)}>{item.path && <Geometry item={item} id={id} urls={urls} />}{item.text && <TextLayer text={item.text} />}</div>
}

function mediaOf(model) {
  const paths = new Set()
  if (model.background.type === 'image') paths.add(model.background.media)
  for (const item of model.items) {
    if (item.kind === 'image') paths.add(item.media)
    else if (item.kind === 'shape' && item.fill.type === 'image') paths.add(item.fill.media)
    else if (item.kind === 'table') for (const row of item.rows) for (const cell of row.cells) if (cell.fill.type === 'image') paths.add(cell.fill.media)
  }
  return paths
}

/** One slide, built and drawn only when it is near the visible area. */
function SlidePage({ deck, index }) {
  const box = useRef(null), near = useNearViewport(box), [view, setView] = useState(null), [scale, setScale] = useState(0), [broken, setBroken] = useState(false)
  useEffect(() => {
    const element = box.current, measure = () => setScale(element.clientWidth / deck.width)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [deck])
  useEffect(() => {
    if (!near) { setView(null); return undefined }
    let cancelled = false
    ;(async () => {
      const model = await deck.slide(index), urls = {}
      for (const path of mediaOf(model)) urls[path] = await deck.imageUrl(path)
      if (!cancelled) setView({ model, urls })
    })().catch(() => { if (!cancelled) setBroken(true) })
    return () => { cancelled = true }
  }, [near, deck, index])
  return <div ref={box} className="retained-page slide-page" role="group" aria-label={`Slide ${index + 1} of ${deck.count}`} data-page={index + 1} data-drawn={Boolean(view)} style={{ aspectRatio: `${deck.width} / ${deck.height}` }}>
    {broken && <p role="alert" className="retained-viewer-error">This slide could not be displayed. Download the original file to see it.</p>}
    {view && scale > 0 && <div className="slide-stage" style={{ width: deck.width, height: deck.height, transform: `scale(${scale})`, ...background(view.model.background, view.urls) }}>
      {view.model.items.map((item, position) => <SlideItem key={position} item={item} urls={view.urls} id={`s${index}-${position}`} />)}
    </div>}
  </div>
}

export default function SlidePages({ bytes, onFail }) {
  const [deck, setDeck] = useState(null)
  useEffect(() => {
    let cancelled = false, opened
    ;(async () => {
      const { readPptx } = await import('../../utils/pptxSlides')
      opened = await readPptx(bytes.slice())
      if (cancelled) opened.dispose(); else setDeck(opened)
    })().catch(() => { if (!cancelled) onFail() })
    return () => { cancelled = true; setDeck(null); opened?.dispose() }
  }, [bytes, onFail])
  if (!deck) return <LoadingStatus label="Opening the uploaded file..." />
  return <div className="retained-pages">{Array.from({ length: deck.count }, (_, index) => <SlidePage key={index} deck={deck} index={index} />)}</div>
}
