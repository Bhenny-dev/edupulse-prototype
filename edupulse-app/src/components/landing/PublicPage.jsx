import { useLayoutEffect, useRef } from 'react'
import { useNavigationType } from 'react-router-dom'
import './public-page.css'

// Privacy and Terms open with a short geometric reveal of the page itself (about 320 ms): a
// rectangle opening to the page for one, a diagonal mask for the other. Nothing is laid over
// the page, the text is in place from the first frame, and with reduced motion there is no
// transition. A page opened from a link starts at the top with focus on its heading;
// the browser's history, titles and the landing page's Back position are left as they are.
export default function PublicPage({ variant, children }) {
  const ref = useRef(null)
  const navigationType = useNavigationType()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    if (navigationType !== 'PUSH') return
    const heading = ref.current?.querySelector('h1')
    if (!heading) return
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }, [navigationType])
  return <div ref={ref} className={`public-page is-${variant}`}>{children}</div>
}
