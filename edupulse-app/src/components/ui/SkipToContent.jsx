// The first focusable element on the landing page and on every signed-in page.
// HashRouter reads "#main-content" as a route (it would open Not Found), so the link
// moves focus to the page's main landmark itself.
export default function SkipToContent() {
  const skip = event => {
    const target = document.getElementById('main-content')
    if (!target) return
    event.preventDefault()
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'start' })
  }
  return <a href="#main-content" className="skip-to-content" onClick={skip}>Skip to main content</a>
}
