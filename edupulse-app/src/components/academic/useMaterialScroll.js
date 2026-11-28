import { useEffect, useRef, useState } from 'react'
import { aiSessionVersion } from '../../lib/aiClient'
import { readingPercent } from './academicData'

function position(scroller) {
  const content = scroller.querySelector('[data-reading-content]')
  if (!content?.offsetHeight || content.querySelector('.loading-status, [data-reading-loading]')) return null
  if ([...content.querySelectorAll('img')].some(image => !image.complete)) return null
  const viewport = scroller.getBoundingClientRect(), bounds = content.getBoundingClientRect()
  // Convert the animated dialog's visual bounds to the layout coordinates used by scrollTop.
  const scale = viewport.height / scroller.offsetHeight
  if (!scale) return null
  const current = scroller.scrollTop
  const contentTop = (bounds.top - viewport.top) / scale
  const top = Math.max(0, contentTop + current)
  const end = (bounds.bottom - viewport.top) / scale + current - scroller.clientHeight
  if (current >= end - 1) return { percent: 100, fits: content.offsetHeight <= scroller.clientHeight && contentTop >= -1 }
  return { percent: Math.min(99, Math.round(100 * Math.max(0, current - top) / Math.max(1, end - top))), fits: false }
}

export function useMaterialScroll({ root, exit, opening, enabled, publication, version, adminTest, saved, command }) {
  const furthest = useRef(0), confirmed = useRef(saved), sent = useRef(0)
  const [measured, setMeasured] = useState(0), [error, setError] = useState('')
  confirmed.current = Math.max(confirmed.current, saved)

  useEffect(() => {
    if (!enabled) return
    const scroller = root.current?.closest('.reader-page-body')
    if (!scroller) return
    const identity = aiSessionVersion()
    let active = true, timer, lastTop = scroller.scrollTop
    const save = async () => {
      clearTimeout(timer)
      const percent = furthest.current
      if (percent <= Math.max(sent.current, confirmed.current) || identity !== aiSessionVersion()) return
      sent.current = percent
      try {
        const pending = opening.current
        if (pending?.publication === publication && pending.version === version) await pending.promise
        if (identity !== aiSessionVersion()) return
        const row = await command({ operation: 'reading-progress', publication, version, percent, ...(adminTest ? { adminTest: true } : {}) }, { keepalive: true })
        confirmed.current = Math.max(confirmed.current, readingPercent(row))
        if (active) setError('')
      } catch {
        if (sent.current === percent) {
          sent.current = 0
          if (active && confirmed.current < percent) setError('Reading progress could not be saved.')
        }
      }
    }
    const measure = (explicitClose = false) => {
      const movedDown = scroller.scrollTop > lastTop
      lastTop = scroller.scrollTop
      const current = position(scroller)
      if (!current || (!movedDown && !(explicitClose && current.fits))) return
      if (current.percent > furthest.current) {
        furthest.current = current.percent
        setMeasured(current.percent)
      }
      clearTimeout(timer)
      timer = setTimeout(save, 650)
    }
    const scroll = () => measure()
    const finish = () => { measure(true); void save() }
    scroller.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('pagehide', save)
    exit.current = finish
    return () => {
      active = false
      scroller.removeEventListener('scroll', scroll)
      window.removeEventListener('pagehide', save)
      if (exit.current === finish) exit.current = null
      void save()
    }
  }, [adminTest, command, enabled, exit, opening, publication, root, version])

  return { percent: Math.max(saved, measured), error }
}
