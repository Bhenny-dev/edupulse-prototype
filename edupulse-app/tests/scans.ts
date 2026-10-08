import type { Browser } from '@playwright/test'

// Course text is rendered to page images at scanner resolutions and wrapped in image-only PDFs, then
// read through the real Knowledge library. The OCR text is scored against this ground truth.
export const PAGES = [
  ['Week 5: Repetition Structures', 'A loop repeats a block of statements while its condition stays true. The for loop suits a known number of passes, such as reading twelve monthly sales figures.', 'A while loop checks its condition before every pass, so its body may never run. A do-while loop runs its body once before it checks the condition.', 'Students trace each loop by hand, recording the counter and the accumulator in a table before they run the program.'],
  ['Laboratory Activity 5: Nested Loops', 'Work in pairs. Write a program that prints a multiplication table from 1 to 9 using two nested for loops.', 'Before running the program, trace the first three rows and predict the output. Compare your trace with the actual output and explain every difference.', 'Submit the source file, the trace table and a short reflection of at most one hundred words.'],
]
export type Scan = { dpi: number; degraded: boolean }

export async function scanPage(browser: Browser, [title, ...paragraphs]: string[], { dpi, degraded }: Scan) {
  const context = await browser.newContext({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: dpi / 96 })
  const page = await context.newPage()
  // A degraded scan: slightly skewed, soft and low in contrast, saved with stronger JPEG compression.
  const damage = degraded ? 'filter: blur(.6px) contrast(.75) grayscale(1); transform: rotate(.8deg);' : ''
  await page.setContent(`<body style="margin:0;background:#fff"><main style="padding:96px;font:16px/1.5 'Times New Roman',serif;color:#111;${damage}"><h1 style="font-size:24px">${title}</h1>${paragraphs.map(p => `<p>${p}</p>`).join('')}</main></body>`)
  const jpeg = await page.screenshot({ type: 'jpeg', quality: degraded ? 55 : 85 })
  await context.close()
  return new Uint8Array(jpeg)
}

const words = (text: string) => text.toLowerCase().replace(/\[\[page \d+\]\]/g, ' ').match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/g) || []
const characters = (text: string) => [...text.toLowerCase().replace(/\[\[page \d+\]\]/g, ' ').replace(/\s+/g, ' ').trim()]
function distance<T>(a: T[], b: T[]) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    previous = row
  }
  return previous[b.length]!
}
/** Word and character error rates of OCR text against the ground truth (0 is perfect). */
export function score(ocr: string, truth: string[]) {
  const expected = truth.join('\n')
  return { wer: distance(words(ocr), words(expected)) / words(expected).length, cer: distance(characters(ocr), characters(expected)) / characters(expected).length }
}
