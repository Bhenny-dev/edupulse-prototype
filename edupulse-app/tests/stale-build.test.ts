import test from 'node:test'
import assert from 'node:assert/strict'
import { installStaleBuildGuard, STALE_BUILD_MESSAGE } from '../src/lib/staleBuild.js'

type Node = { tag: string; style: Record<string, string>; attrs: Record<string, string>; listeners: Record<string, () => void>; children: Node[]; textContent: string; type?: string
  setAttribute: (name: string, value: string) => void; append: (...nodes: Node[]) => void; addEventListener: (type: string, listener: () => void) => void }
const element = (tag: string): Node => ({ tag, style: {}, attrs: {}, listeners: {}, children: [], textContent: '',
  setAttribute(name, value) { this.attrs[name] = value }, append(...nodes) { this.children.push(...nodes) }, addEventListener(type, listener) { this.listeners[type] = listener } })

test('a missing lazy file says to reload, keeps the original error for the caller and offers one reload banner', () => {
  let reloads = 0
  const target = Object.assign(new EventTarget(), { location: { reload: () => { reloads++ } } })
  const body = { children: [] as Node[], prepend(node: Node) { this.children.unshift(node) } }
  installStaleBuildGuard({ target, doc: { body, createElement: element } as unknown as Document })

  const failure = (url: string) => {
    const error = new TypeError(`Failed to fetch dynamically imported module: ${url}`)
    const event = Object.assign(new Event('vite:preloadError', { cancelable: true }), { payload: error })
    target.dispatchEvent(event)
    return { error, event }
  }
  const first = failure('https://edupulse-prototype.vercel.app/assets/pdfSyllabus-BDn_uDV0.js')
  assert.equal(first.error.message, STALE_BUILD_MESSAGE)
  assert.match((first.error as unknown as { originalMessage: string }).originalMessage, /pdfSyllabus-BDn_uDV0\.js/)
  assert.equal(first.event.defaultPrevented, false, 'the import still rejects, so no caller carries on with a missing module')
  assert.equal(body.children.length, 1)
  const [bar] = body.children
  assert.equal(bar!.attrs.role, 'alert')
  assert.match(bar!.children[0]!.textContent, /new version of EduPulse is available/)

  assert.equal(failure('https://edupulse-prototype.vercel.app/assets/syllabusParser-x.js').error.message, STALE_BUILD_MESSAGE)
  assert.equal(body.children.length, 1, 'further failures do not stack banners')

  bar!.children[1]!.listeners.click!()
  assert.equal(reloads, 1)
})
