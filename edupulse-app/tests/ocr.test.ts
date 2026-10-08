import test from 'node:test'
import assert from 'node:assert/strict'
import { mergePageText, summarizeOcr, tidyOcrText } from '../src/lib/ocrText.js'
import { extractUpload } from '../server/ingest/prepare.js'

test('OCR text goes under its own page marker; pages with a text layer and the intro are kept', () => {
  const extracted = 'Course notes\n\n[[Page 1]]\nWeek 1 covers variables.\n\n[[Page 2]]\n\n[[Page 3]]\n12'
  const merged = mergePageText(extracted, [
    { page: 2, text: 'Week 2 covers loops.  \n\n\n\nA for loop repeats.\n', confidence: 93 },
    { page: 3, text: 'Week 3 covers arrays.\n12', confidence: 88 },
  ])
  assert.equal(merged, 'Course notes\n\n[[Page 1]]\nWeek 1 covers variables.\n\n[[Page 2]]\nWeek 2 covers loops.\n\nA for loop repeats.\n\n[[Page 3]]\nWeek 3 covers arrays.\n12')
})

test('a fully scanned PDF becomes paged text; blank pages keep their marker and edited-away markers return in order', () => {
  assert.equal(mergePageText('', [{ page: 2, text: 'Second page text', confidence: 90 }, { page: 1, text: 'First page text', confidence: 90 }, { page: 3, text: ' \n', confidence: 0 }]),
    '[[Page 1]]\nFirst page text\n\n[[Page 2]]\nSecond page text\n\n[[Page 3]]')
  assert.equal(mergePageText('[[Page 2]]\nkept', [{ page: 1, text: 'restored', confidence: 80 }]), '[[Page 1]]\nrestored\n\n[[Page 2]]\nkept')
  assert.equal(tidyOcrText('a  \r\nb\n\n\n\nc  '), 'a\nb\n\nc')
})

test('the OCR summary names blank pages and pages below the confidence threshold', () => {
  const summary = summarizeOcr([
    { page: 1, text: 'A readable page of course notes.', confidence: 94.4 },
    { page: 2, text: 'Smudged page with uncertain words.', confidence: 61.2 },
    { page: 3, text: '', confidence: 0 },
  ])
  assert.deepEqual(summary, { pages: 3, read: 2, blank: [3], confidence: 78, low: [{ page: 2, confidence: 61 }] })
})

test('plain text with page markers reports its pages, so OCR output is scored like the PDF it came from', async () => {
  const text = `[[Page 1]]\n${'Week one introduces variables, constants and data types in C. '.repeat(4)}\r\n[[Page 2]]\r\n\r\n[[Page 3]]\n${'Week three introduces bounded loops and tracing tables. '.repeat(4)}`
  const report = await extractUpload(new TextEncoder().encode(text), 'scan.txt', AbortSignal.timeout(60000))
  assert.equal(report.quality.metrics.pages, 3)
  assert.equal(report.quality.metrics.emptyPages, 1)
  assert.match(report.text, /\[\[Page 2\]\]/)
})
