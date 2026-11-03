import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'

// A textarea that is always as tall as its text, so it never scrolls inside itself. It refits
// when its value changes and when its width changes (the text re-wraps); min-height still
// applies, so an empty box keeps its usual size.
const AutoTextarea = forwardRef(function AutoTextarea({ value, style, ...props }, forwardedRef) {
  const ref = useRef(null)
  const setRef = useCallback(node => {
    ref.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }, [forwardedRef])

  const fit = useCallback(() => {
    const element = ref.current
    if (!element) return
    element.style.height = 'auto'
    const borders = element.offsetHeight - element.clientHeight
    element.style.height = `${element.scrollHeight + borders}px`
  }, [])

  useLayoutEffect(fit, [value, fit])
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return undefined
    let width = element.clientWidth
    let frame = 0
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return
      width = element.clientWidth
      // Resizing inside the observer's delivery can trigger another layout in
      // that delivery and produce an undelivered-notifications page error.
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    })
    observer.observe(element)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [fit])

  return <textarea ref={setRef} value={value} style={{ ...style, overflowY: 'hidden', resize: 'none' }} {...props} />
})

export default AutoTextarea
