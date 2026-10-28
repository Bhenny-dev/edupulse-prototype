import { useEffect, useRef, useState } from 'react'

// Scroll-triggered reveal. Plays once; `variant` picks the entrance (up, left, right, zoom).
// Content is shown at once when the reader prefers reduced motion or the browser lacks
// IntersectionObserver. A zero threshold lets elements taller than the viewport reveal too.
// The delay is a CSS variable so hover transitions on the same element are not delayed.
export default function Reveal({ children, as: Tag = 'div', delay = 0, variant = 'up', className = '', style, ...props }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal reveal-${variant} ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ ...style, '--reveal-delay': visible ? `${delay}ms` : '0ms' }}
      {...props}
    >
      {children}
    </Tag>
  )
}
