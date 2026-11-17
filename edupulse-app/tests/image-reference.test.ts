import test from 'node:test'
import assert from 'node:assert/strict'
import { imageScale, IMAGE_MAX_SIDE, IMAGE_MIN_SIDE } from '../src/lib/ocrText.js'
import { isImageFile, CHAT_UPLOAD_ACCEPT, UPLOAD_ACCEPT, readReferenceFile, ApiRequestError } from '../src/lib/aiClient.js'
import { readImageReference, IMAGE_LIMIT } from '../src/lib/imageReference.js'

const picture = (name: string, size = 2048, type = 'image/png') => ({ name, type, size }) as File

test('PDF OCR recovery never bypasses authorization, rate, network or other document failures', async t => {
  const previousFetch=globalThis.fetch
  t.after(()=>{globalThis.fetch=previousFetch})
  for(const [status,code] of [[401,'AUTH_REQUIRED'],[403,'FORBIDDEN'],[429,'RATE_LIMIT'],[500,'NO_READABLE_TEXT']] as const){
    globalThis.fetch=async()=>Response.json({error:{code,message:'Extraction refused'}},{status})
    await assert.rejects(readReferenceFile(new File(['%PDF-1.4'],'scan.pdf',{type:'application/pdf'})),error=>error instanceof ApiRequestError&&error.status===status&&error.code===code)
  }
  globalThis.fetch=async()=>{throw new TypeError('Disconnected')}
  await assert.rejects(readReferenceFile(new File(['%PDF-1.4'],'scan.pdf')),error=>error instanceof ApiRequestError&&error.code==='NETWORK_ERROR')
  globalThis.fetch=async()=>Response.json({error:{code:'NO_READABLE_TEXT',message:'No usable text'}},{status:422})
  await assert.rejects(readReferenceFile(new File([''],'empty.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})),/empty/)
  await assert.rejects(readReferenceFile(new File(['No text'],'notes.txt')),error=>error instanceof ApiRequestError&&error.code==='NO_READABLE_TEXT')
})

test('small screenshots are enlarged, camera photos reduced, and a readable size is left alone', () => {
  assert.equal(imageScale(800, 600), 2, 'an 800 px screenshot reaches the reading size')
  assert.equal(imageScale(300, 200), 3, 'a tiny image is enlarged at most three times')
  assert.equal(imageScale(6000, 4000), IMAGE_MAX_SIDE / 6000)
  assert.equal(imageScale(2400, 1800), 1)
  assert.equal(imageScale(IMAGE_MIN_SIDE, 10), 1)
  assert.equal(imageScale(0, 0), 1)
})

test('the chat accepts the documents the library accepts and common picture formats, chosen by type or by extension', () => {
  for (const name of ['scan.png', 'photo.JPG', 'photo.jpeg', 'board.webp', 'note.gif', 'slide.bmp']) assert.equal(isImageFile(picture(name, 10, '')), true, name)
  assert.equal(isImageFile(picture('camera-1234', 10, 'image/jpeg')), true, 'the type is enough when the name has no extension')
  for (const name of ['syllabus.pdf', 'list.csv', 'drawing.svg', 'icon.ico']) assert.equal(isImageFile(picture(name, 10, name.endsWith('.svg') ? 'image/svg+xml' : '')), false, name)
  for (const extension of UPLOAD_ACCEPT.split(',')) assert.ok(CHAT_UPLOAD_ACCEPT.split(',').includes(extension), extension)
  for (const extension of ['.png', '.jpg', '.jpeg', '.webp', 'image/png', 'image/jpeg']) assert.ok(CHAT_UPLOAD_ACCEPT.split(',').includes(extension), extension)
  assert.ok(!UPLOAD_ACCEPT.includes('.png'), 'the knowledge library keeps its document-only list')
})

test('a picture becomes an attachment whose text was read on this device, with its confidence and a title that says so', async () => {
  const progress: string[] = []
  const reader = async (file: File, options: { onProgress: (progress: { done: number; total: number; page: number | null; status: string }) => void }) => {
    options.onProgress({ done: 0, total: 1, page: null, status: 'Reading the text' })
    assert.equal(file.name, 'outline photo.png')
    return { page: 1, text: 'Week 3   \r\nNetwork   Security\n\n\n\nQuiz 1  ', confidence: 91.4 }
  }
  const reference = await readImageReference(picture('outline photo.png'), message => progress.push(message), reader)
  assert.deepEqual(progress, ['Reading the text…'])
  assert.equal(reference.title, 'outline photo.png (OCR)')
  assert.equal(reference.kind, 'image')
  assert.equal(reference.sourceType, 'text')
  assert.equal(reference.fileName, 'outline photo.png')
  assert.equal(reference.text, 'Week 3\nNetwork   Security\n\nQuiz 1')
  assert.deepEqual(reference.ocr, { confidence: 91, low: false })
  const faint = await readImageReference(picture('blurry.jpg'), () => {}, async () => ({ page: 1, text: 'Course load: IT 101', confidence: 52 }))
  assert.deepEqual(faint.ocr, { confidence: 52, low: true })
})

test('a picture with no readable text, an empty file or an oversized file is refused with a plain reason instead of an empty attachment', async () => {
  const none = async () => ({ page: 1, text: ' \n . \n', confidence: 12 })
  await assert.rejects(readImageReference(picture('landscape.jpg'), () => {}, none), /No readable text was found in landscape\.jpg/)
  await assert.rejects(readImageReference(picture('empty.png', 0), () => {}, none), /empty/)
  await assert.rejects(readImageReference(picture('huge.png', IMAGE_LIMIT + 1), () => {}, none), /12 MB or smaller/)
})
