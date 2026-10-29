// Declarations for markdownBlocks.js, used by the strict test program (tsconfig.server.json).
export type TextRun = { text: string; bold?: boolean; italics?: boolean; background?: string; color?: string; fontSize?: number }
/** A pdfmake content node (text, list, table, canvas or stack). */
export type PdfNode = Record<string, unknown>
export function printableText(value: unknown): string
export function inline(value: unknown): TextRun[]
export function markdownBlocks(markdown: unknown): PdfNode[]
