// Converts the Markdown that language models write into pdfmake content: headings,
// paragraphs, bold/italic/code runs, nested lists, tables, rules, quotes and code
// blocks. Output is plain data (text runs and styles) — nothing is evaluated, and
// links are printed as text rather than made active.

// Spaces and hyphens the embedded Roboto font cannot draw (they print as boxes).
export function printableText(value) {
  return String(value ?? '')
    .replace(/[  -   　]/g, ' ')
    .replace(/[​-‍⁠﻿]/g, '')
    .replace(/[‐‑]/g, '-')
}

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*(?!\s)[^*]+?\*|(?<![\w])_(?!\s)[^_]+?_(?![\w])|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)\s]+\)|\[\d+(?:\s*[,–-]\s*\d+)*\])/g

/** Splits one line of Markdown into styled text runs. */
export function inline(value) {
  const text = printableText(value)
  const runs = []
  for (const part of text.split(INLINE)) {
    if (!part) continue
    if (/^(\*\*|__).+\1$/.test(part)) runs.push(...inline(part.slice(2, -2)).map(run => ({ ...run, bold: true })))
    else if (/^\*.+\*$/.test(part) || /^_.+_$/.test(part)) runs.push(...inline(part.slice(1, -1)).map(run => ({ ...run, italics: true })))
    else if (/^`.+`$/.test(part)) runs.push({ text: part.slice(1, -1), background: '#eef2f6', color: '#1f3a5c' })
    else if (/^\[[^\]]+\]\(/.test(part)) { const [, label, url] = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/); runs.push({ text: label }, { text: ` (${url})`, color: '#52657b', fontSize: 8.5 }) }
    else if (/^\[\d/.test(part)) runs.push({ text: part, fontSize: 7.5, color: '#52657b' })
    else runs.push({ text: part })
  }
  return runs.length ? runs : [{ text: '' }]
}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/
const LIST = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
const HEADING_STYLE = { 1: { fontSize: 16, margin: [0, 16, 0, 8] }, 2: { fontSize: 14, margin: [0, 14, 0, 7] }, 3: { fontSize: 12.5, margin: [0, 12, 0, 6] } }

function list(lines) {
  // Builds nested ul/ol structures from indentation (two or more spaces per level).
  const root = { ordered: /\d/.test(lines[0].match(LIST)[2]), items: [], indent: lines[0].match(LIST)[1].length }
  const stack = [root]
  for (const line of lines) {
    const [, space, marker, body] = line.match(LIST)
    const indent = space.replace(/\t/g, '  ').length
    while (stack.length > 1 && indent < stack.at(-1).indent) stack.pop()
    let level = stack.at(-1)
    if (indent > level.indent + 1 && level.items.length) {
      const child = { ordered: /\d/.test(marker), items: [], indent }
      level.items.at(-1).children.push(child)
      stack.push(child); level = child
    }
    level.items.push({ text: inline(body), children: [] })
  }
  const render = node => ({
    [node.ordered ? 'ol' : 'ul']: node.items.map(item => item.children.length ? { stack: [{ text: item.text }, ...item.children.map(render)] } : { text: item.text }),
    margin: [0, 0, 0, 6],
  })
  return render(root)
}

/** Converts Markdown text into an array of pdfmake content nodes. */
export function markdownBlocks(markdown) {
  const lines = printableText(markdown).replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let paragraph = []
  // Single line breaks are kept: models use them to start a new line, not to wrap text.
  const flush = () => { if (paragraph.length) { out.push({ text: paragraph.flatMap((line, i) => (i ? [{ text: '\n' }, ...inline(line)] : inline(line))), margin: [0, 0, 0, 7] }); paragraph = [] } }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      flush()
      const code = []
      while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i])
      out.push({ table: { widths: ['*'], body: [[{ text: code.join('\n'), fontSize: 8.5, preserveLeadingSpaces: true, color: '#1f3a5c', margin: [6, 5, 6, 5] }]] }, layout: { fillColor: () => '#f2f5f9', hLineWidth: () => 0, vLineWidth: () => 0 }, margin: [0, 2, 0, 8] })
    } else if (!line.trim()) flush()
    else if (HEADING.test(line)) {
      flush()
      const [, hashes, title] = line.match(HEADING)
      out.push({ text: inline(title), bold: true, color: '#14263f', ...(HEADING_STYLE[hashes.length] || { fontSize: 11, margin: [0, 10, 0, 5] }), headlineLevel: hashes.length <= 2 ? 1 : undefined })
    } else if (RULE.test(line)) {
      flush()
      out.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 507, y2: 0, lineWidth: 0.6, lineColor: '#c9d3df' }], margin: [0, 6, 0, 10] })
    } else if (line.includes('|') && TABLE_SEPARATOR.test(lines[i + 1] || '')) {
      flush()
      const header = cells(line), body = []
      i++
      while (i + 1 < lines.length && lines[i + 1].includes('|') && lines[i + 1].trim()) body.push(cells(lines[++i]))
      const width = header.length
      out.push({
        table: { headerRows: 1, widths: Array(width).fill('*'), body: [header.map(cell => ({ text: inline(cell), bold: true, color: '#14263f' })), ...body.map(row => Array.from({ length: width }, (_, c) => ({ text: inline(row[c] ?? '') })))] },
        layout: { fillColor: row => (row === 0 ? '#eaf0f6' : row % 2 ? null : '#f7f9fb'), hLineColor: () => '#d5dde7', vLineColor: () => '#d5dde7', hLineWidth: () => 0.5, vLineWidth: () => 0.5, paddingTop: () => 4, paddingBottom: () => 4 },
        fontSize: 9.5, margin: [0, 2, 0, 10],
      })
    } else if (LIST.test(line)) {
      flush()
      const items = [line]
      while (i + 1 < lines.length && (LIST.test(lines[i + 1]) || (/^\s{2,}\S/.test(lines[i + 1]) && !HEADING.test(lines[i + 1])))) {
        const next = lines[++i]
        if (LIST.test(next)) items.push(next)
        else items[items.length - 1] += ` ${next.trim()}`
      }
      out.push(list(items))
    } else if (/^\s*>/.test(line)) {
      flush()
      const quote = [line.replace(/^\s*>\s?/, '')]
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) quote.push(lines[++i].replace(/^\s*>\s?/, ''))
      out.push({ table: { widths: [2, '*'], body: [[{ text: '' }, { text: inline(quote.join(' ')), italics: true, color: '#3b4d63', margin: [8, 2, 0, 2] }]] }, layout: { fillColor: (row, node, column) => (column === 0 ? '#b88a2e' : null), hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0 }, margin: [0, 2, 0, 8] })
    } else paragraph.push(line.trim())
  }
  flush()
  return out
}
