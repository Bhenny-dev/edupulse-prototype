import { useEffect, useMemo, useRef, useState } from 'react'
import useNearViewport from './useNearViewport'
import { LoadingStatus } from '../ui/LoadingFeedback'
import './file-pages.css'

/** One page of a PDF, drawn only when it is near the visible area. */
function PdfPage({ pdf, number, total, ratio, onFail }) {
  const box = useRef(null), canvas = useRef(null), near = useNearViewport(box), [drawn, setDrawn] = useState(false)
  useEffect(() => {
    // A page far from the reader gives its pixels back, so a long scan stays light on a phone.
    if (!near) { canvas.current.width = 0; canvas.current.height = 0; setDrawn(false); return undefined }
    let cancelled = false, task
    ;(async () => {
      const page = await pdf.getPage(number)
      const base = page.getViewport({ scale: 1 }), scale = Math.min(window.devicePixelRatio || 1, 2) * Math.max(box.current.clientWidth || 800, 600) / base.width
      const viewport = page.getViewport({ scale }), element = canvas.current
      element.width = Math.floor(viewport.width); element.height = Math.floor(viewport.height)
      task = page.render({ canvasContext: element.getContext('2d'), canvas: element, viewport })
      await task.promise
      if (!cancelled) setDrawn(true)
    })().catch(failure => { if (!cancelled && failure?.name !== 'RenderingCancelledException') onFail() })
    return () => { cancelled = true; task?.cancel() }
  }, [near, pdf, number, onFail])
  return <div ref={box} className="retained-page" data-page={number} data-drawn={drawn} style={drawn ? undefined : { aspectRatio: ratio }}>
    <canvas ref={canvas} role="img" aria-label={`Page ${number} of ${total} of the uploaded file`} />
  </div>
}

export function PdfPages({ bytes, onFail }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    let cancelled = false, loaded
    ;(async () => {
      const { getDocumentProxy } = await import('unpdf')
      // Same eval-free build and options as OCR: glyphs are drawn without FontFace, and the image decoders (scans) come from this origin, as the CSP requires.
      loaded = await getDocumentProxy(bytes.slice(), { disableFontFace: true, verbosity: 0, wasmUrl: new URL('/ocr/pdf/', window.location.origin).href })
      const first = await loaded.getPage(1), view = first.getViewport({ scale: 1 })
      if (cancelled) { await loaded.loadingTask.destroy(); return }
      setDoc({ pdf: loaded, total: loaded.numPages, ratio: `${view.width} / ${view.height}` })
    })().catch(() => { if (!cancelled) onFail() })
    return () => { cancelled = true; setDoc(null); loaded?.loadingTask.destroy() }
  }, [bytes, onFail])
  if (!doc) return <LoadingStatus label="Opening the uploaded file..." />
  return <div className="retained-pages">{Array.from({ length: doc.total }, (_, index) => <PdfPage key={index} pdf={doc.pdf} number={index + 1} total={doc.total} ratio={doc.ratio} onFail={onFail} />)}</div>
}

const KEEP = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'U', 'BR', 'SUP', 'SUB', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH'])
const INLINE_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i
/** Copies only plain document structure: text, lists, tables with their merged cells and embedded pictures. No links, scripts or styles. */
function copyStructure(from, into, doc) {
  for (const child of from.childNodes) {
    if (child.nodeType === 3) into.append(doc.createTextNode(child.textContent))
    else if (child.nodeType === 1 && child.tagName === 'IMG') {
      const source = child.getAttribute('src') || ''
      if (INLINE_IMAGE.test(source)) { const image = doc.createElement('img'); image.setAttribute('src', source); image.setAttribute('alt', (child.getAttribute('alt') || '').slice(0, 200)); into.append(image) }
    } else if (child.nodeType === 1 && KEEP.has(child.tagName)) {
      const copy = doc.createElement(child.tagName.toLowerCase())
      for (const name of ['colspan', 'rowspan']) if (/^\d{1,2}$/.test(child.getAttribute(name) || '')) copy.setAttribute(name, child.getAttribute(name))
      copyStructure(child, copy, doc); into.append(copy)
    } else if (child.nodeType === 1) copyStructure(child, into, doc)
  }
}
const WORD_STYLE = 'body{font:15px/1.5 system-ui,sans-serif;color:#111827;margin:24px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #9ca3af;padding:6px 8px;vertical-align:top;text-align:left}p{margin:0 0 8px}img{max-width:100%;height:auto}'

/** A browser cannot open a Word file, so its own content is shown in a script-free frame. */
export function WordPages({ bytes, onFail, flow = false }) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const mammoth = await import('mammoth')
      const result = await mammoth.convertToHtml({ arrayBuffer: bytes.slice().buffer })
      const source = new DOMParser().parseFromString(result.value, 'text/html'), clean = new DOMParser().parseFromString('<body></body>', 'text/html')
      copyStructure(source.body, clean.body, clean)
      if (!cancelled) setHtml(`<!doctype html><meta charset="utf-8"><style>${WORD_STYLE}</style>${clean.body.innerHTML}`)
    })().catch(() => { if (!cancelled) onFail() })
    return () => { cancelled = true }
  }, [bytes, onFail])
  if (!html) return <LoadingStatus label="Opening the uploaded file..." />
  return flow ? <FlowWordPage html={html} /> : <iframe className="retained-word" title="Uploaded file" sandbox="" srcDoc={html} />
}

// The sanitized, script-free Word view can size to its contents so it scrolls with the reader.
function FlowWordPage({ html }) {
  const frame = useRef(null), observer = useRef(null)
  const [height, setHeight] = useState(null)
  useEffect(() => () => observer.current?.disconnect(), [])
  const loaded = () => {
    observer.current?.disconnect()
    const body = frame.current?.contentDocument?.body
    if (!body) return
    const resize = () => setHeight(Math.ceil(body.getBoundingClientRect().bottom + 26))
    resize()
    observer.current = new ResizeObserver(resize)
    observer.current.observe(body)
  }
  return <iframe ref={frame} className="retained-word retained-word-flow" title="Uploaded file" sandbox="allow-same-origin" srcDoc={html} onLoad={loaded}
    style={{ height: height || 1 }} data-reading-loading={height ? undefined : ''} />
}

export function ImagePage({ bytes, type, name, onFail }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const made = URL.createObjectURL(new Blob([bytes], { type })); setUrl(made); return () => URL.revokeObjectURL(made) }, [bytes, type])
  return url ? <img className="retained-image" src={url} alt={name} onError={onFail} /> : <LoadingStatus label="Opening the uploaded file..." />
}

export function TextPage({ bytes }) {
  const text = useMemo(() => new TextDecoder('utf-8').decode(bytes.subarray(0, 400_000)), [bytes])
  return <pre className="retained-text">{text}</pre>
}
