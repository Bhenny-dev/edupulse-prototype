import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Pencil, Save, X, Plus, Trash2,
} from 'lucide-react'

/* ─── Presentation Viewer ───
 * Landscape slides with key points extracted from sections.
 * Horizontal scrolling with prev/next navigation.
 * Instructors can toggle edit mode to modify slide headings and key points.
 * Students see read-only view.
 */

function extractKeyPoints(body) {
  if (!body) return []
  return body.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => l.replace(/^[•\-\*]\s*/, '').replace(/^\d+[\.\)]\s*/, ''))
    .slice(0, 6)
}

function keyPointsToBody(points) {
  return points.map(p => `• ${p}`).join('\n')
}

export default function PresentationViewer({ content, onBack, isStudent = false, onSave }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  if (!content) return null

  const sections = editing ? draft : (content.sections || [])
  const totalSlides = sections.length + 1

  const goTo = (idx) => {
    if (idx >= 0 && idx < totalSlides) setCurrentSlide(idx)
  }

  const nextSlide = () => goTo(currentSlide + 1)
  const prevSlide = () => goTo(currentSlide - 1)

  const toggleFullscreen = () => {
    if (!fullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  const startEditing = () => {
    setDraft(JSON.parse(JSON.stringify(content.sections || [])))
    setEditing(true)
  }

  const cancelEditing = () => {
    setDraft(null)
    setEditing(false)
  }

  const updateSlideHeading = (idx, value) => {
    setDraft(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], heading: value }
      return next
    })
  }

  const updateSlidePoint = (sectionIdx, pointIdx, value) => {
    setDraft(prev => {
      const next = [...prev]
      const points = extractKeyPoints(next[sectionIdx].body)
      points[pointIdx] = value
      next[sectionIdx] = { ...next[sectionIdx], body: keyPointsToBody(points) }
      return next
    })
  }

  const addSlidePoint = (sectionIdx) => {
    setDraft(prev => {
      const next = [...prev]
      const points = extractKeyPoints(next[sectionIdx].body)
      if (points.length >= 8) return prev
      points.push('New key point')
      next[sectionIdx] = { ...next[sectionIdx], body: keyPointsToBody(points) }
      return next
    })
  }

  const removeSlidePoint = (sectionIdx, pointIdx) => {
    setDraft(prev => {
      const next = [...prev]
      const points = extractKeyPoints(next[sectionIdx].body)
      if (points.length <= 1) return prev
      points.splice(pointIdx, 1)
      next[sectionIdx] = { ...next[sectionIdx], body: keyPointsToBody(points) }
      return next
    })
  }

  const addSlide = () => {
    setDraft(prev => {
      const next = [...prev, { heading: 'New Slide', body: '• Key point' }]
      setCurrentSlide(next.length) // go to new slide (1-indexed: title=0, sections=1..n, new=n+1)
      return next
    })
  }

  const removeSlide = (idx) => {
    setDraft(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter((_, i) => i !== idx)
      setCurrentSlide(prev2 => {
        if (prev2 > next.length) return next.length
        if (prev2 > idx + 1) return prev2 - 1
        return prev2
      })
      return next
    })
  }

  const saveEdits = () => {
    if (onSave) {
      onSave(draft)
    }
    setDraft(null)
    setEditing(false)
  }

  const renderSlide = (idx, isEdit) => {
    if (idx === 0) {
      // Title slide (not editable)
      return (
        <div className="pres-slide pres-slide-title" key={0}>
          <div className="pres-slide-institution">King's College of the Philippines</div>
          <div className="pres-slide-dept">College of Information Technology</div>
          <div className="pres-slide-main-title">{content.title}</div>
          {content.subtitle && <div className="pres-slide-subtitle">{content.subtitle}</div>}
          <div className="pres-slide-footer">Presentation Mode — Key Points</div>
        </div>
      )
    }

    const section = sections[idx - 1]
    const points = extractKeyPoints(section.body)

    return (
      <div className="pres-slide" key={idx}>
        <div className="pres-slide-section-num">{idx}/{sections.length}</div>

        {isEdit ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input
              className="form-input pres-edit-heading"
              value={section.heading}
              onChange={e => updateSlideHeading(idx - 1, e.target.value)}
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', flex: 1, color: 'var(--gray-900)' }}
            />
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 6px', color: 'var(--red-400)' }}
              onClick={() => removeSlide(idx - 1)}
              disabled={sections.length <= 1}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <h2 className="pres-slide-heading">{section.heading}</h2>
        )}

        <div className="pres-slide-points">
          {points.map((pt, i) => (
            <div key={i} className="pres-slide-point">
              <span className="pres-slide-bullet" />
              {isEdit ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    className="form-input pres-edit-point"
                    value={pt}
                    onChange={e => updateSlidePoint(idx - 1, i, e.target.value)}
                    style={{ flex: 1, fontSize: '0.9375rem' }}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 4px', color: 'var(--red-400)', flexShrink: 0 }}
                    onClick={() => removeSlidePoint(idx - 1, i)}
                    disabled={points.length <= 1}
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <span>{pt}</span>
              )}
            </div>
          ))}
          {isEdit && points.length < 8 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: '4px', alignSelf: 'flex-start' }} onClick={() => addSlidePoint(idx - 1)}>
              <Plus size={12} /> Add Point
            </button>
          )}
          {points.length === 0 && !isEdit && (
            <p className="pres-slide-empty">No key points in this section.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`pres-container ${fullscreen ? 'pres-fullscreen' : ''}`}
      tabIndex={0}
      onKeyDown={e => {
        if (editing) return
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide() }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide() }
        if (e.key === 'Escape') { if (fullscreen) toggleFullscreen(); else onBack() }
      }}
    >
      {/* Top bar */}
      <div className="pres-topbar">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="pres-topbar-title">{content.title}</div>
        <div className="pres-topbar-right">
          {!isStudent && (
            editing ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={cancelEditing}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveEdits}>
                  <Save size={14} /> Save
                </button>
              </>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={startEditing}>
                <Pencil size={14} /> Edit
              </button>
            )
          )}
          <span className="pres-topbar-counter">{currentSlide + 1} / {totalSlides}</span>
          <button className="btn btn-ghost btn-sm" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className="pres-viewport">
        <button
          className="pres-nav-btn pres-nav-prev"
          onClick={prevSlide}
          disabled={currentSlide === 0}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="pres-slide-wrapper">
          {renderSlide(currentSlide, editing)}
        </div>

        <button
          className="pres-nav-btn pres-nav-next"
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Progress dots + add slide in edit mode */}
      <div className="pres-dots">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            className={`pres-dot ${i === currentSlide ? 'active' : ''}`}
            onClick={() => goTo(i)}
            title={i === 0 ? 'Title' : sections[i - 1]?.heading}
          />
        ))}
        {editing && (
          <button
            className="pres-dot pres-dot-add"
            onClick={() => addSlide()}
            title="Add slide"
          >
            <Plus size={10} />
          </button>
        )}
      </div>

      <style>{`
        .pres-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--gray-900);
          outline: none;
          user-select: none;
        }
        .pres-container.pres-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 9999;
        }
        .pres-topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          background: rgba(0,0,0,0.3);
          flex-shrink: 0;
        }
        .pres-topbar .btn { color: rgba(255,255,255,0.7); }
        .pres-topbar .btn:hover { color: #fff; }
        .pres-topbar-title {
          flex: 1;
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.5);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pres-topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pres-topbar-counter {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          font-variant-numeric: tabular-nums;
        }
        .pres-viewport {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          min-height: 0;
        }
        .pres-nav-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .pres-nav-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
          color: #fff;
          border-color: rgba(255,255,255,0.3);
        }
        .pres-nav-btn:disabled {
          opacity: 0.2;
          cursor: default;
        }
        .pres-slide-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          height: 100%;
        }
        .pres-slide {
          width: 100%;
          max-width: 960px;
          aspect-ratio: 16 / 9;
          background: #fff;
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          padding: 48px 56px;
          position: relative;
          overflow: hidden;
        }
        .pres-slide-title {
          align-items: center;
          justify-content: center;
          text-align: center;
          background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%);
          color: #fff;
        }
        .pres-slide-institution {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 0.875rem;
          letter-spacing: 1px;
          text-transform: uppercase;
          opacity: 0.8;
          margin-bottom: 4px;
        }
        .pres-slide-dept {
          font-size: 0.75rem;
          opacity: 0.6;
          margin-bottom: 24px;
        }
        .pres-slide-main-title {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.75rem;
          line-height: 1.3;
          margin-bottom: 12px;
        }
        .pres-slide-subtitle {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.7;
        }
        .pres-slide-footer {
          position: absolute;
          bottom: 16px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 0.625rem;
          opacity: 0.4;
        }
        .pres-slide-section-num {
          position: absolute;
          top: 16px;
          right: 24px;
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--sky-500);
          background: var(--sky-50);
          padding: 2px 10px;
          border-radius: var(--radius-sm);
        }
        .pres-slide-heading {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.375rem;
          color: var(--gray-900);
          margin: 0 0 20px;
          padding-bottom: 12px;
          border-bottom: 3px solid var(--sky-500);
        }
        .pres-slide-points {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          justify-content: center;
        }
        .pres-slide-point {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          font-size: 1rem;
          line-height: 1.5;
          color: var(--gray-700);
        }
        .pres-slide-bullet {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--sky-500);
          flex-shrink: 0;
          margin-top: 7px;
        }
        .pres-slide-empty {
          color: var(--gray-400);
          font-style: italic;
          font-size: 0.875rem;
        }
        .pres-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          padding: 12px 0 16px;
          background: rgba(0,0,0,0.2);
          flex-shrink: 0;
        }
        .pres-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.2);
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }
        .pres-dot.active {
          background: var(--sky-400);
          transform: scale(1.3);
        }
        .pres-dot:hover:not(.active) {
          background: rgba(255,255,255,0.4);
        }
        .pres-dot-add {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1px dashed rgba(255,255,255,0.4);
          color: rgba(255,255,255,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
        }
        .pres-dot-add:hover {
          background: rgba(255,255,255,0.25);
          color: #fff;
        }
        .pres-edit-heading {
          font-size: 1.25rem;
          border: 1px solid var(--sky-300);
          border-radius: var(--radius-md);
          padding: 6px 12px;
          color: var(--gray-900);
        }
        .pres-edit-point {
          font-size: 0.9375rem;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-sm);
          padding: 4px 10px;
        }
        .pres-edit-point:focus, .pres-edit-heading:focus {
          border-color: var(--sky-400);
          box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
        }
      `}</style>
    </div>
  )
}
