import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inline, markdownBlocks, printableText } from '../src/utils/markdownBlocks.js'
import { materialContent } from '../src/utils/pdfExport.js'

// A generated reply as Pulse writes it (including the narrow no-break spaces models emit).
const REPLY = `**Courseware: IT 202 – Fundamentals of Networking**
*Based on the approved syllabus (Reference 1) and supporting resources.*

---

### 1. Course Information
- **Course Code:** IT 202 [3]
- **Credit Units:** 3 units
  - Lecture: 2 units
  - Laboratory: 1 unit

| Week | Topic | Assessment |
| --- | --- | --- |
| 1 | OSI model | Quiz |
| 2 | Subnetting | Lab activity |

1. Explain core networking concepts [1].
2. Perform subnetting.`

const texts = (node: any): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(texts).join('') : node?.text !== undefined ? texts(node.text) : ''

test('Markdown from Pulse becomes laid-out PDF content, not raw symbols', () => {
  const blocks: any[] = markdownBlocks(REPLY)
  const all = JSON.stringify(blocks)
  for (const raw of ['**', '###', '| ---', '\\u202f', ' ', ' ']) assert.ok(!all.includes(raw), `raw Markdown or unprintable space left: ${raw}`)

  const title = blocks[0].text.find((run: any) => run.bold)
  assert.equal(title.text, 'Courseware: IT 202 – Fundamentals of Networking')
  assert.ok(blocks[0].text.some((run: any) => run.text === '\n'), 'a single line break starts a new line')
  assert.ok(blocks[0].text.some((run: any) => run.italics && run.text.startsWith('Based on')))
  assert.ok(blocks.some(block => block.canvas), 'a --- line becomes a rule')

  const heading = blocks.find(block => texts(block) === '1. Course Information')
  assert.equal(heading.bold, true)
  assert.equal(heading.fontSize, 12.5)

  const bullets = blocks.find(block => block.ul)
  assert.equal(bullets.ul.length, 2)
  assert.deepEqual(bullets.ul[0].text.slice(0, 2), [{ text: 'Course Code:', bold: true }, { text: ' IT 202 ' }])
  assert.deepEqual(bullets.ul[0].text[2], { text: '[3]', fontSize: 7.5, color: '#52657b' })
  assert.equal(bullets.ul[1].stack[1].ul.length, 2, 'indented items become a nested list')

  const table = blocks.find(block => block.table?.headerRows === 1)
  assert.equal(table.table.body.length, 3)
  assert.equal(texts(table.table.body[0][1]), 'Topic')
  assert.equal(table.table.body[0][1].bold, true)
  assert.equal(texts(table.table.body[2][2]), 'Lab activity')

  const numbered = blocks.find(block => block.ol)
  assert.equal(numbered.ol.length, 2)
})

test('inline runs keep code and links as plain text and spaces printable', () => {
  assert.deepEqual(inline('Use `ping` now'), [{ text: 'Use ' }, { text: 'ping', background: '#eef2f6', color: '#1f3a5c' }, { text: ' now' }])
  assert.deepEqual(inline('[CHED](https://ched.gov.ph/)'), [{ text: 'CHED' }, { text: ' (https://ched.gov.ph/)', color: '#52657b', fontSize: 8.5 }])
  assert.equal(printableText('IT 202‑A​'), 'IT 202-A')
  assert.deepEqual(inline('snake_case_name stays'), [{ text: 'snake_case_name stays' }])
})

test('a quotation keeps its gold bar in the narrow first column only', () => {
  const [quote]: any[] = markdownBlocks('> Approved by the Dean\n> on 3 June')
  assert.equal(texts(quote.table.body[0][1]), 'Approved by the Dean on 3 June')
  // pdfmake calls fillColor(rowIndex, node, columnIndex); the bar must not fill the text cell.
  assert.equal(quote.layout.fillColor(0, quote, 0), '#b88a2e')
  assert.equal(quote.layout.fillColor(0, quote, 1), null)
})

test('material PDFs lay out the reply body and list sources once', () => {
  const nodes: any[] = materialContent({ title: 'Pulse learning material', text: REPLY, sources: [{ citation: 1, title: 'IT 202 syllabus', page: 3 }] })
  assert.equal(nodes[0].text, 'Pulse learning material')
  assert.ok(nodes.some(node => node.table?.headerRows === 1))
  const sources = nodes.at(-1)
  assert.equal(sources.stack[0].text, '[1] IT 202 syllabus - Page 3')
})
