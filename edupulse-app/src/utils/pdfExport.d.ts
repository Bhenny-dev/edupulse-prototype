// Declarations for pdfExport.js, used by the strict test program (tsconfig.server.json).
import type { PdfNode } from './markdownBlocks.js'

export type MaterialSource = { citation?: number | string; title?: string; page?: number | string; url?: string }
export type MaterialContent = { title?: string; subtitle?: string; text?: string; sections?: { heading: string; body: string }[]; sources?: MaterialSource[] }

export function documentPdf(blocks: { text?: unknown; heading?: boolean }[], title?: string, status?: string): Promise<Blob>
export function downloadSyllabusPdf(syllabus: Record<string, unknown>, filename?: string): Promise<void>
/** The pdfmake content for a generated reply or material: Markdown laid out, sources listed once. */
export function materialContent(content: MaterialContent): PdfNode[]
export function downloadMaterialPdf(content: MaterialContent): Promise<void>
