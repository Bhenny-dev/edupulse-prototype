import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The landing page's colour tokens, read from the stylesheets themselves, meet WCAG 2.x
// contrast in both themes: 4.5:1 for text on the surface it is used on, 3:1 for the
// focus ring against the section around it (docs/DESIGN.md).
const app = readFileSync('src/index.css', 'utf8')
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

const light: Vars = { ...block(app, ':root'), ...block(landing, '.landing-page') }
const dark: Vars = { ...block(app, ':root'), ...block(app, '.dark-mode'), ...block(landing, '.landing-page'), ...block(landing, '.dark-mode .landing-page') }

// [foreground, background]: the paper sections change with the theme; the navy sections do not.
const PAPER_TEXT = [
  ['--ink', '--paper'], ['--ink', '--card'], ['--ink-soft', '--paper'], ['--ink-soft', '--card'],
  ['--ink-faint', '--paper'], ['--ink-faint', '--card'], ['--gold-text', '--paper'], ['--gold-text', '--card'],
  ['--success-text', '--paper'], ['--paper', '--ink'], ['--on-gold-text', '--gold-text'],
]
const NAVY_TEXT = [
  ['--on-navy', '--navy'], ['--on-navy-soft', '--navy'], ['--gold-soft', '--navy'],
  ['--on-navy', '--navy-2'], ['--on-navy-soft', '--navy-2'], ['--gold-soft', '--navy-2'],
  ['--navy', '--gold-soft'], ['--navy', '--on-navy'],
]
const FOCUS = [['--gold-text', '--paper'], ['--gold-text', '--card'], ['--gold-soft', '--navy'], ['--gold-soft', '--navy-2']]

for (const [theme, vars] of [['light', light], ['dark', dark]] as const) {
  test(`landing text colours reach 4.5:1 in the ${theme} theme`, () => {
    for (const [fg, bg] of [...PAPER_TEXT, ...NAVY_TEXT]) {
      const ratio = contrast(color(vars, fg), color(vars, bg))
      assert.ok(ratio >= 4.5, `${fg} on ${bg}: ${ratio.toFixed(2)}:1`)
    }
  })
  test(`landing focus rings reach 3:1 against their sections in the ${theme} theme`, () => {
    for (const [ring, bg] of FOCUS) {
      const ratio = contrast(color(vars, ring), color(vars, bg))
      assert.ok(ratio >= 3, `${ring} ring on ${bg}: ${ratio.toFixed(2)}:1`)
    }
  })
}

test('the decorative gold is never used for landing text', () => {
  // --gold reaches only 2.7:1 on paper, so text and meaningful icons use --gold-text.
  const textRules = [...landing.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, , body]) => /(^|[;\s])color:\s*var\(--gold\)/.test(body))
  assert.deepEqual(textRules.map(([, selector]) => selector.trim()), [])
})
