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

test('a picture of a teaching-load form becomes the same reviewable table as the PDF, read cell by cell from its ruled grid', async () => {
  // OCR word boxes in image pixels, laid out like the CIT teaching-load form: title, instructor, ruled header, one class, totals.
  const line = (y: number, words: [string, number, number][]) => words.map(([text, x0, x1]) => ({ text, x0, x1, y0: y - 12, y1: y, baseline: y }))
  const words = [
    ...line(22, [['CIT', 300, 330], ['TENTATIVE', 335, 420], ['TEACHING', 425, 500], ['LOAD', 505, 550]]),
    ...line(40, [['First', 330, 370], ['Semester,', 375, 450], ['AY', 455, 475], ['2026-2027', 480, 560]]),
    ...line(62, [['Instructor:', 10, 90], ['MARIELLE', 95, 170], ['ANGELA', 175, 235], ['FIANZA-BUYA', 240, 340]]),
    ...line(80, [['Highest', 10, 70], ['Degree', 75, 130], ['Earned:', 135, 195], ['Masters', 200, 260]]),
    ...line(120, [['SUBJECT', 40, 100], ['DESCRIPTIVE', 130, 220], ['TITLE', 225, 265], ['TIME', 330, 370], ['DAY', 430, 460], ['UNIT', 474, 500], ['LEC', 514, 540], ['LAB', 554, 580], ['HOURS', 594, 636], ['ROOM', 650, 690], ['STUDENT', 724, 786], ['COURSE', 795, 845]]),
    ...line(150, [['1', 15, 20], ['IT', 40, 50], ['101', 55, 75], ['A', 80, 86], ['Introduction', 130, 200], ['to', 205, 215], ['Computing', 220, 290], ['1:00', 305, 330], ['-', 333, 338], ['3:30', 342, 368], ['WF', 430, 452], ['3', 480, 486], ['2', 520, 526], ['1', 560, 566], ['5', 600, 606], ['A301', 650, 685], ['35', 730, 746], ['BSIT', 800, 835]]),
    ...line(180, [['TOTAL', 305, 345], ['UNITS:', 350, 400], ['3', 480, 486], ['TOTAL', 515, 545], ['HOURS:', 555, 585], ['5', 600, 606]]),
    ...line(212, [['Conforme:', 10, 80]]),
  ]
  const grid = { horizontal: [100, 130, 160, 190], vertical: [10, 30, 120, 300, 420, 470, 510, 550, 590, 640, 720, 790, 850] }
  const text = 'CIT TENTATIVE TEACHING LOAD\nFirst Semester, AY 2026-2027\nInstructor: MARIELLE ANGELA FIANZA-BUYA\nHighest Degree Earned: Masters\nSUBJECT DESCRIPTIVE TITLE TIME DAY UNIT LEC LAB HOURS ROOM STUDENT COURSE\n1 IT 101 A Introduction to Computing 1:00 - 3:30 WF 3 2 1 5 A301 35 BSIT\nTOTAL UNITS: 3 TOTAL HOURS: 5\nConforme:'
  const reference = await readImageReference(picture('Screenshot 2026-11-18 074307.png'), () => {}, async () => ({ page: 1, text, confidence: 88, words, grid }))
  const load = reference.teachingLoad!
  assert.equal(load.entries.length, 1)
  const [entry] = load.entries
  assert.deepEqual({ ...entry, time: entry.time.replace(/\s+/g, ' '), warnings: [] }, { id: '1:1', page: 1, row: 1, instructor: 'MARIELLE ANGELA FIANZA-BUYA', degree: 'Masters', semester: '1st Semester', academicYear: '2026-2027', subjectCode: 'IT 101 A', title: 'Introduction to Computing', time: '1:00 - 3:30', days: 'WF', units: 3, lecture: 2, lab: 1, hours: 5, computedHours: 5, room: 'A301', students: 35, program: 'BSIT', warnings: [] })
  assert.deepEqual(load.totals, [{ instructor: 'MARIELLE ANGELA FIANZA-BUYA', page: 1, units: 3, hours: 5, computedUnits: 3, computedHours: 5 }])
  assert.match(load.warnings.join(' '), /read from a picture by OCR/)
  assert.equal(reference.title, 'Screenshot 2026-11-18 074307.png (OCR)', 'the table never hides that its text came from OCR')
  // Misreads seen on a real screenshot: DESCRIPTIVE as DRSCRIPTIVE, LEC as LRC, and a lone row number not read at all.
  const misread = words.filter(word => !(word.text === '1' && word.x0 === 15)).map(word => ({ ...word, text: word.text === 'DESCRIPTIVE' ? 'DRSCRIPTIVE' : word.text === 'LEC' ? 'LRC' : word.text }))
  const rough = (await readImageReference(picture('rough.png'), () => {}, async () => ({ page: 1, text, confidence: 80, words: misread, grid }))).teachingLoad!
  assert.equal(rough.entries.length, 1)
  assert.equal(rough.entries[0].title, 'Introduction to Computing')
  assert.equal(rough.entries[0].lecture, 2)
  assert.equal(rough.entries[0].row, 1)
  assert.match(rough.entries[0].warnings.join(' '), /row number was not read/)
  const plain = await readImageReference(picture('board.png'), () => {}, async () => ({ page: 1, text: 'Week 3 Network Security', confidence: 90 }))
  assert.equal(plain.teachingLoad, undefined, 'a picture without a ruled form stays a plain text reference')
})

test('a picture with no readable text, an empty file or an oversized file is refused with a plain reason instead of an empty attachment', async () => {
  const none = async () => ({ page: 1, text: ' \n . \n', confidence: 12 })
  await assert.rejects(readImageReference(picture('landscape.jpg'), () => {}, none), /No readable text was found in landscape\.jpg/)
  await assert.rejects(readImageReference(picture('empty.png', 0), () => {}, none), /empty/)
  await assert.rejects(readImageReference(picture('huge.png', IMAGE_LIMIT + 1), () => {}, none), /12 MB or smaller/)
})
