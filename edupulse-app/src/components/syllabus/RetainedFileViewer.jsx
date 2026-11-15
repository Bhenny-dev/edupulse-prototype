import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import { LoadingStatus } from '../ui/LoadingFeedback'
import { downloadApprovedFile } from '../../utils/syllabusFiles'
import './retained-file-viewer.css'

const isPdf = file => /\.pdf$/i.test(file.name)
const bytesOf = file => Uint8Array.from(atob(file.base64), char => char.charCodeAt(0))

/** One page of the uploaded PDF, drawn only when it is near the visible area. */
function PdfPage({ pdf, number, total, ratio, onFail }) {
  const box = useRef(null), canvas = useRef(null)
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined'), [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    // The margin only reaches past the scroll area when that area is the observer's root.
    const root = (() => { for (let node = box.current.parentElement; node; node = node.parentElement) if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node; return null })()
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { root, rootMargin: '1200px 0px' })
    observer.observe(box.current)
    return () => observer.disconnect()
  }, [])
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
    <canvas ref={canvas} role="img" aria-label={`Page ${number} of ${total} of the uploaded syllabus`} />
  </div>
}

function PdfPages({ file, onFail }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    let cancelled = false, loaded
    ;(async () => {
      const { getDocumentProxy } = await import('unpdf')
      // Same eval-free build and options as OCR: glyphs are drawn without FontFace, and the image decoders (scans) come from this origin, as the CSP requires.
      loaded = await getDocumentProxy(bytesOf(file), { disableFontFace: true, verbosity: 0, wasmUrl: new URL('/ocr/pdf/', window.location.origin).href })
      const first = await loaded.getPage(1), view = first.getViewport({ scale: 1 })
      if (cancelled) { await loaded.loadingTask.destroy(); return }
      setDoc({ pdf: loaded, total: loaded.numPages, ratio: `${view.width} / ${view.height}` })
    })().catch(() => { if (!cancelled) onFail() })
    return () => { cancelled = true; setDoc(null); loaded?.loadingTask.destroy() }
  }, [file, onFail])
  if (!doc) return <LoadingStatus label="Opening the uploaded syllabus..." />
  return <div className="retained-pages">{Array.from({ length: doc.total }, (_, index) => <PdfPage key={index} pdf={doc.pdf} number={index + 1} total={doc.total} ratio={doc.ratio} onFail={onFail} />)}</div>
}

const KEEP = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'U', 'BR', 'SUP', 'SUB', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH'])
/** Copies only plain document structure: text, lists and tables with their merged cells. No links, images or scripts. */
function copyStructure(from, into, doc) {
  for (const child of from.childNodes) {
    if (child.nodeType === 3) into.append(doc.createTextNode(child.textContent))
    else if (child.nodeType === 1 && KEEP.has(child.tagName)) {
      const copy = doc.createElement(child.tagName.toLowerCase())
      for (const name of ['colspan', 'rowspan']) if (/^\d{1,2}$/.test(child.getAttribute(name) || '')) copy.setAttribute(name, child.getAttribute(name))
      copyStructure(child, copy, doc); into.append(copy)
    } else if (child.nodeType === 1) copyStructure(child, into, doc)
  }
}
const WORD_STYLE = 'body{font:15px/1.5 system-ui,sans-serif;color:#111827;margin:24px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #9ca3af;padding:6px 8px;vertical-align:top;text-align:left}p{margin:0 0 8px}'

/** A browser cannot open a Word file, so its own content is shown in a script-free frame. */
function WordPages({ file, onFail }) {
  const [html, setHtml] = useState('')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const mammoth = await import('mammoth')
      const result = await mammoth.convertToHtml({ arrayBuffer: bytesOf(file).buffer }, { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })) })
      const source = new DOMParser().parseFromString(result.value, 'text/html'), clean = new DOMParser().parseFromString('<body></body>', 'text/html')
      copyStructure(source.body, clean.body, clean)
      if (!cancelled) setHtml(`<!doctype html><meta charset="utf-8"><style>${WORD_STYLE}</style>${clean.body.innerHTML}`)
    })().catch(() => { if (!cancelled) onFail() })
    return () => { cancelled = true }
  }, [file, onFail])
  if (!html) return <LoadingStatus label="Opening the uploaded syllabus..." />
  return <iframe className="retained-word" title="Uploaded syllabus" sandbox="" srcDoc={html} />
}

/** Shows the file the instructor uploaded, never text extracted from it. */
export default function RetainedFileViewer({ file, title, onBack }) {
  const [failed, setFailed] = useState(false), fail = useRef(() => setFailed(true)).current
  return <div className="retained-viewer">
    <div className="retained-viewer-bar">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back</button>
      <div className="retained-viewer-title"><strong>{title}</strong><span className="text-sm text-muted">{file.name}</span></div>
      <button type="button" className="btn btn-secondary" onClick={() => downloadApprovedFile(file)}><FileText size={14} aria-hidden="true" />Original approved file</button>
    </div>
    {failed ? <p role="alert" className="retained-viewer-error">This file could not be displayed here. Use Original approved file to open the uploaded copy.</p>
      : isPdf(file) ? <PdfPages file={file} onFail={fail} /> : <WordPages file={file} onFail={fail} />}
  </div>
}
