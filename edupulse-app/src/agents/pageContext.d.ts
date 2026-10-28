import type { ReferenceFile } from '../lib/aiClient.js'
export function focusedSection(focus: { section?: number; label?: string } | null, message?: string): string
export function sourceContext(file: ReferenceFile, section?: string): string
export function activeSources<T extends { fileName: string }>(attached: T[], pageSources: T[]): T[]
