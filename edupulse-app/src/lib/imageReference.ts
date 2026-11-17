import type { ReferenceFile } from './aiClient'
import type { OcrProgress } from './ocr'
import { LOW_CONFIDENCE, tidyOcrText, type OcrPage } from './ocrText'

/** Pictures are read on this device, so the 4 MB server limit does not apply; phone photos are larger. */
export const IMAGE_LIMIT = 12_000_000
type Recognize = (file: File, options: { signal: AbortSignal; onProgress: (progress: OcrProgress) => void }) => Promise<OcrPage>

/**
 * A picture as a chat attachment: the text in it, read by OCR in this browser. The picture is never uploaded, and the
 * title says the text came from OCR so citations and the library do not present it as typed text.
 */
export async function readImageReference(file: File, onProgress: (message: string) => void, recognize?: Recognize): Promise<ReferenceFile> {
  if (!file.size) throw new Error('The file is empty.')
  if (file.size > IMAGE_LIMIT) throw new Error('Images must be 12 MB or smaller.')
  const read = recognize || (await import('./ocr')).ocrImage
  const page = await read(file, { signal: AbortSignal.timeout(120_000), onProgress: progress => onProgress(`${progress.status}…`) })
  const text = tidyOcrText(page.text)
  if (text.replace(/\s/g, '').length < 3) throw new Error(`No readable text was found in ${file.name}. Use a sharper, well-lit picture, or a screenshot with the text in focus.`)
  const confidence = Math.round(page.confidence)
  return { title: `${file.name.slice(0, 140)} (OCR)`, text: text.slice(0, 150000), fileName: file.name.slice(-255), kind: 'image', sourceType: 'text', ocr: { confidence, low: confidence < LOW_CONFIDENCE } }
}
