import assert from 'node:assert/strict'
import test from 'node:test'
import JSZip from 'jszip'
import { mediaType, readPptx, type Item } from '../src/utils/pptxSlides'
import { parseXml } from '../src/utils/xmlTree'
import { makePptx } from './pptx-fixture'

const near = (actual: number, expected: number, tolerance = 0.5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)
const shape = (item: Item | undefined) => { assert.equal(item?.kind, 'shape'); return item as Extract<Item, { kind: 'shape' }> }
const firstRun = (item: Extract<Item, { kind: 'shape' }>, paragraph = 0) => { const run = item.text!.paragraphs[paragraph]!.runs[0]!; assert.ok('text' in run); return run }

test('the XML reader decodes entities and CDATA and keeps self-closing tags', () => {
  const root = parseXml('<?xml version="1.0"?><!-- note --><a:root x="1 &amp; 2"><a:t>5 &lt; 6 &#x41;</a:t><a:c><![CDATA[<raw>]]></a:c><a:e/></a:root>')
  assert.equal(root.name, 'a:root')
  assert.equal(root.attrs.x, '1 & 2')
  assert.equal(root.children[0]!.text, '5 < 6 A')
  assert.equal(root.children[1]!.text, '<raw>')
  assert.equal(root.children[2]!.name, 'a:e')
})

test('a presentation opens with its slide size and count, and rejects files that are not presentations', async () => {
  const deck = await readPptx(await makePptx())
  assert.deepEqual([deck.width, deck.height, deck.count], [1280, 720, 3])
  await assert.rejects(readPptx(new Uint8Array([1, 2, 3, 4])))
  const word = new JSZip(); word.file('word/document.xml', '<w:document/>')
  await assert.rejects(readPptx(await word.generateAsync({ type: 'uint8array' })), /not a PowerPoint presentation/)
  assert.equal(mediaType('ppt/media/a.PNG'), 'image/png')
  assert.equal(mediaType('ppt/media/a.emf'), null)
})

test('title and body take their position, size, color, font and bullets from the layout and master', async () => {
  const slide = await (await readPptx(await makePptx())).slide(0)
  // The master draws its own corner mark first; its placeholders are not drawn on the slide.
  const mark = shape(slide.items[0])
  assert.deepEqual([mark.box.x, mark.box.y, mark.box.w, mark.box.h], [1200, 672, 40, 24])
  assert.deepEqual(mark.fill, { type: 'solid', color: '#c0504d', opacity: 1 })
  const title = shape(slide.items[1]), body = shape(slide.items[2])
  assert.deepEqual([title.box.x, title.box.y, title.box.w, title.box.h], [96, 48, 1088, 120])
  assert.equal(title.text!.anchor, 'center')
  const heading = firstRun(title)
  assert.equal(heading.text, 'Variables and named values')
  near(heading.size, 40 * 96 / 72)
  assert.equal(heading.bold, true)
  assert.equal(heading.color, '#1f497d')
  assert.equal(heading.font, 'Calibri Light')
  assert.deepEqual([body.box.x, body.box.y, body.box.w, body.box.h], [96, 192, 640, 360])
  const [first, second, nested] = body.text!.paragraphs as [any, any, any]
  assert.equal(first.bullet.text, '•')
  assert.deepEqual([first.marL, first.indent], [36, -36])
  assert.equal(first.before, 0, 'space before is ignored on the first paragraph')
  near(second.before, 0.2 * (28 * 96 / 72) * 1.2, 0.05)
  assert.equal(nested.bullet.text, '–')
  assert.deepEqual([nested.marL, nested.indent], [78, -30])
  near(nested.size, 24 * 96 / 72)
})

test('shapes keep their own fill and geometry, and text color comes from the shape style', async () => {
  const slide = await (await readPptx(await makePptx())).slide(0)
  const card = shape(slide.items[3])
  assert.deepEqual(card.fill, { type: 'solid', color: '#ff0000', opacity: 1 })
  assert.match(card.path!, /A/, 'rounded corners are arcs')
  const label = firstRun(card)
  assert.equal(label.color, '#ffffff')
  assert.equal(label.bold, true)
  near(label.size, 20 * 96 / 72)
  assert.equal(card.text!.anchor, 'center')
})

test('pictures, groups and tables are placed on the slide', async () => {
  const slide = await (await readPptx(await makePptx())).slide(0)
  const picture = slide.items[4]!
  assert.equal(picture.kind, 'image')
  assert.equal((picture as any).media, 'ppt/media/image1.png')
  assert.deepEqual([picture.box.x, picture.box.y, picture.box.w, picture.box.h], [800, 384, 160, 120])
  // The group is drawn at half the size of its own coordinates, so its child lands inside the group's frame.
  const grouped = shape(slide.items[5])
  near(grouped.box.x, 1500000 / 9525); near(grouped.box.y, 5250000 / 9525); near(grouped.box.w, 500000 / 9525); near(grouped.box.h, 250000 / 9525)
  const table = slide.items[6] as Extract<Item, { kind: 'table' }>
  assert.equal(table.kind, 'table')
  near(table.columns[0]!, 2000000 / 9525)
  assert.equal(table.rows.length, 2)
  assert.equal(table.rows[0]!.cells.length, 1, 'the merged cell is not repeated')
  assert.equal(table.rows[0]!.cells[0]!.colSpan, 2)
  assert.equal(table.rows[0]!.cells[0]!.fill.type, 'solid')
  assert.deepEqual(table.rows[1]!.cells.map(cell => (cell.text.paragraphs[0]!.runs[0] as any).text), ['Left cell', 'Right cell'])
})

test('slides keep their own background, numbered lists restart after a plain line, and tints are mixed in linear light', async () => {
  const slide = await (await readPptx(await makePptx())).slide(1)
  assert.deepEqual(slide.background, { type: 'solid', color: '#fff3c4', opacity: 1 })
  const steps = shape(slide.items.find(item => item.kind === 'shape' && item.text?.paragraphs.length === 4))
  assert.deepEqual(steps.text!.paragraphs.map(paragraph => paragraph.bullet?.text), ['1.', '2.', undefined, 'a)'])
  const note = shape(slide.items.at(-1))
  assert.equal(firstRun(note).color, '#898989')
  assert.deepEqual(note.text!.paragraphs[0]!.runs.map(run => (run as any).text), ['Slide ', '2'])
})

test('a SmartArt diagram is drawn from the copy of itself stored in the file', async () => {
  const slide = await (await readPptx(await makePptx())).slide(2)
  const node = shape(slide.items[1]) // after the master's corner mark
  near(node.box.x, 1500000 / 9525); near(node.box.y, 1250000 / 9525); near(node.box.w, 1500000 / 9525); near(node.box.h, 800000 / 9525)
  assert.equal(firstRun(node).text, 'Diagram node')
  assert.deepEqual(node.fill, { type: 'solid', color: '#4472c4', opacity: 1 })
})
