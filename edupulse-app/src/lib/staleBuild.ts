/**
 * A tab opened before a deployment still asks for the old hashed files, which the new deployment no longer has (the
 * host answers with index.html instead), so every lazy import in it fails with "Failed to fetch dynamically imported
 * module". Vite reports that as `vite:preloadError`. The error still reaches the caller, now saying what to do, and one
 * banner offers the reload.
 */
export const STALE_BUILD_MESSAGE = 'EduPulse was updated while this page was open. Reload the page, then try again.'

type Host = Pick<EventTarget, 'addEventListener'> & { location: { reload: () => void } }

function showReloadBanner(doc: Document, target: Host) {
  const bar = doc.createElement('div'), text = doc.createElement('span'), button = doc.createElement('button')
  bar.setAttribute('role', 'alert')
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;padding:10px 16px;background:#fff4cc;color:#3d2e00;border-bottom:1px solid #d9b94a;font:600 14px/1.4 system-ui,sans-serif'
  text.textContent = 'A new version of EduPulse is available. Reload to keep working.'
  button.type = 'button'
  button.textContent = 'Reload'
  button.style.cssText = 'padding:6px 14px;border:1px solid #3d2e00;border-radius:8px;background:#3d2e00;color:#fff4cc;font:inherit;cursor:pointer'
  button.addEventListener('click', () => target.location.reload())
  bar.append(text, button)
  doc.body.prepend(bar)
}

export function installStaleBuildGuard({ target = window, doc = document }: { target?: Host; doc?: Document } = {}) {
  let shown = false
  target.addEventListener('vite:preloadError', event => {
    const error = (event as Event & { payload?: unknown }).payload
    // The same error object is rethrown to whoever awaited the import, so their screen shows this text.
    if (error instanceof Error) Object.assign(error, { originalMessage: error.message, message: STALE_BUILD_MESSAGE })
    if (!shown) { shown = true; showReloadBanner(doc, target) }
  })
}
