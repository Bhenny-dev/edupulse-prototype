import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The landing page's colour tokens, read from its stylesheet, meet WCAG 2.x contrast: 4.5:1 for
// text on the surface it is used on, 3:1 for the focus ring and form-control borders against
// their surfaces (docs/DESIGN.md). The public page keeps one light palette in both app themes.
const landing = readFileSync('src/components/landing/landing.css', 'utf8')

type Vars = Record<string, string>
function block(css: string, selector: string): Vars {
  const start = css.search(new RegExp(`(^|\\n)${selector.replace(/\./g, '\\.')} \\{`))
  assert.ok(start >= 0, `${selector} block not found`)
  const open = css.indexOf('{', start)
  return Object.fromEntries([...css.slice(open, css.indexOf('}', open)).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]))
}
function color(vars: Vars, name: string, depth = 0): string {
  const value = vars[name]
  assert.ok(value && depth < 8, `${name} is not defined`)
  const ref = value.match(/^var\((--[\w-]+)\)$/)
  if (ref) return color(vars, ref[1], depth + 1)
  assert.match(value, /^#[0-9a-f]{6}$/i, `${name} should end in a hex colour, got ${value}`)
  return value
}
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const vars = block(landing, '.landing-page')
const SURFACES = ['--lp-white', '--lp-mist', '--lp-ice']

test('the landing palette is the one in the brief', () => {
  const brief = { '--lp-white': '#ffffff', '--lp-mist': '#f4f9ff', '--lp-ice': '#dbeafe', '--lp-blue': '#2563eb', '--lp-ink': '#0f172a', '--lp-slate': '#475569', '--lp-line': '#e2e8f0' }
  for (const [name, hex] of Object.entries(brief)) assert.equal(color(vars, name).toLowerCase(), hex, name)
})

test('landing text colours reach 4.5:1 on the surfaces they are used on', () => {
  const pairs = [
    ...['--lp-ink', '--lp-slate', '--lp-blue-deep'].flatMap(fg => SURFACES.map(bg => [fg, bg])),
    // Blue text (links, labels) is used on white and mist only; on the ice surface it is the deeper blue.
    ['--lp-blue', '--lp-white'], ['--lp-blue', '--lp-mist'],
    ['--lp-success', '--lp-white'], ['--lp-success', '--lp-mist'],
    // Button and chat-bubble text.
    ['--lp-white', '--lp-blue'], ['--lp-white', '--lp-blue-deep'],
  ]
  for (const [fg, bg] of pairs) {
    const ratio = contrast(color(vars, fg), color(vars, bg))
    assert.ok(ratio >= 4.5, `${fg} on ${bg}: ${ratio.toFixed(2)}:1`)
  }
})

test('the focus ring and form-control borders reach 3:1', () => {
  for (const [fg, bg] of [...SURFACES.map(bg => ['--focus-ring', bg]), ['--lp-field', '--lp-white']]) {
    const ratio = contrast(color(vars, fg), color(vars, bg))
    assert.ok(ratio >= 3, `${fg} against ${bg}: ${ratio.toFixed(2)}:1`)
  }
})

test('the public page keeps its light palette when the app is in dark mode', () => {
  assert.doesNotMatch(landing, /\.dark-mode\s+\.landing-page\s*\{/)
  assert.match(landing.slice(landing.search(/(^|\n)\.landing-page \{/)), /color-scheme:\s*light/)
})

test('decorative tokens are never used as a text colour', () => {
  // --lp-line, --lp-ice-soft and --lp-blue-soft are below 4.5:1 on white; they are for rules and shapes.
  const textRules = [...landing.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, , body]) => /(^|[;\s])color:\s*var\(--lp-(line|ice-soft|blue-soft)\)/.test(body))
  assert.deepEqual(textRules.map(([, selector]) => selector.trim()), [])
})
