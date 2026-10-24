export const EXEMPT = /^Docs-Impact:\s*none\s*[—–:-]\s*(.{15,})$/im
/** @typedef {{name: string, source: string[], docs: string[], fallback?: boolean}} Rule */
/** @typedef {Rule & {matchers: RegExp[]}} CompiledRule */
/** @param {string} file @param {string} path */
const inside = (file, path) => file === path || file.startsWith(`${path}/`)
/** @param {string} pattern */
const glob = pattern => new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').split('**').map(part => part.replace(/\*/g, '[^/]*')).join('.*')}$`)

/** @param {Rule[]} rules */
export const compileRules = rules => rules.map(rule => ({ ...rule, matchers: rule.source.map(glob) }))

/** @param {string[]} files @param {CompiledRule[]} rules */
export function triggered(files, rules) {
  /** @type {Map<CompiledRule, string[]>} */
  const hits = new Map()
  for (const file of files) {
    const specific = rules.filter(rule => !rule.fallback && rule.matchers.some(m => m.test(file)))
    const matched = specific.length ? specific : rules.filter(rule => rule.fallback && rule.matchers.some(m => m.test(file)))
    for (const rule of matched) hits.set(rule, [...(hits.get(rule) || []), file])
  }
  return hits
}

/** @param {string[]} files @param {string} label @param {CompiledRule[]} rules */
export function impact(files, label, rules) {
  const problems = []
  for (const [rule, sources] of triggered(files, rules)) {
    if (files.some(file => rule.docs.some(doc => inside(file, doc)))) continue
    problems.push(`${label} changes ${rule.name.toLowerCase()} without updating its documentation.\n    Changed: ${sources.slice(0, 6).join(', ')}\n    Update at least one of: ${rule.docs.join(', ')}`)
  }
  return problems
}

/** @param {string} range @param {(...args: string[]) => string} git @param {CompiledRule[]} rules */
export function rangeImpact(range, git, rules) {
  const [base, head] = range.split('..')
  if (!head || !/^[a-zA-Z0-9_./~-]+$/.test(head) || (base && !/^[a-zA-Z0-9_./~-]+$/.test(base))) throw new Error('Expected a valid base..head revision range.')
  // workflow_dispatch has no "before" SHA: check the selected commit only.
  const selection = !base ? `${head}^!` : /^0+$/.test(base) ? head : `${base}..${head}`
  const shas = git('rev-list', '--reverse', selection).split('\n').filter(Boolean)
  const union = new Set(), problems = []
  for (const sha of shas) {
    if (EXEMPT.test(git('log', '-1', '--format=%B', sha))) continue
    const files = [...new Set(git('diff-tree', '--first-parent', '-m', '--no-commit-id', '--name-only', '-r', '--root', sha).split('\n').filter(Boolean))]
    problems.push(...impact(files, `Commit ${sha.slice(0, 12)}`, rules))
    files.forEach(file => union.add(file))
  }
  return [...problems, ...impact([...union], 'This push', rules)]
}
