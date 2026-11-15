import { useEffect, useState } from 'react'

/** True while the element is near the visible part of its scroll area, so pages far from the reader can give their pixels back. */
export default function useNearViewport(box) {
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    // The margin only reaches past the scroll area when that area is the observer's root.
    const root = (() => { for (let node = box.current.parentElement; node; node = node.parentElement) if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node; return null })()
    const observer = new IntersectionObserver(entries => setNear(entries[entries.length - 1].isIntersecting), { root, rootMargin: '1200px 0px' })
    observer.observe(box.current)
    return () => observer.disconnect()
  }, [box])
  return near
}
