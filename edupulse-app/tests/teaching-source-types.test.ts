import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { sniff, SUPPORTED } from '../server/ingest/formats.mjs'
import { TEACHING_SOURCE_TYPES, readableTeachingSource, teachingSourceAccept } from '../src/utils/teachingSources'

// "Attach teaching file" builds a material from the file's text, so every type it offers must be one the server reads.
const zip = async (entry: string) => new JSZip().file('[Content_Types].xml', '<Types/>').file(entry, '<root/>').generateAsync({ type: 'uint8array' })
const sample: Record<string, () => Promise<Uint8Array>> = {
  pdf: async () => new TextEncoder().encode('%PDF-1.4\n%%EOF'), docx: () => zip('word/document.xml'), pptx: () => zip('ppt/presentation.xml'), xlsx: () => zip('xl/workbook.xml'),
  csv: async () => new TextEncoder().encode('Topic,Week\nVariables,1\n'), html: async () => new TextEncoder().encode('<p>Variables</p>'), htm: async () => new TextEncoder().encode('<p>Loops</p>'),
  txt: async () => new TextEncoder().encode('Variables store values.'), md: async () => new TextEncoder().encode('# Variables'),
}

test('every file type offered by "Attach teaching file" is one the server extractor reads', async () => {
  assert.equal(teachingSourceAccept, '.pdf,.docx,.pptx,.xlsx,.csv,.html,.htm,.txt,.md')
  for (const type of TEACHING_SOURCE_TYPES) {
    const kind = sniff(await sample[type](), `lesson.${type}`).kind
    assert.ok((SUPPORTED as readonly string[]).includes(kind), `${type} is read as ${kind}`)
    assert.ok(readableTeachingSource(`Week 1 Lesson.${type.toUpperCase()}`), `${type} is accepted whatever its case`)
  }
  for (const name of ['slides.ppt', 'sheet.xls', 'notes.doc', 'photo.png', 'archive.zip', 'lesson']) assert.equal(readableTeachingSource(name), false, name)
})
