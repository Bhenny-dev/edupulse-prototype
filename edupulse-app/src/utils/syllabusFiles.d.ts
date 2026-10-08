export const APPROVED_FILE_LIMIT: number
export type RetainedSyllabusFile = { name: string; size: number; base64: string; sha256: string; uploadedAt: string }
export function meaningfulOutline(rows: unknown): boolean
export function downloadBlob(blob: Blob, filename: string): void
export function syllabusDocx(syllabus: Record<string, unknown>): Promise<Blob>
export function retainApprovedFile(file: File): Promise<RetainedSyllabusFile>
export function downloadApprovedFile(file: Pick<RetainedSyllabusFile, 'name' | 'base64'>): void
