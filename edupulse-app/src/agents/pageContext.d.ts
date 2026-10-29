import type { ReferenceFile } from '../lib/aiClient.js'
export function focusedSection(focus: { section?: number | string; label?: string; field?: string } | null, message?: string): string
export function sourceContext(file: ReferenceFile, section?: string): string
export function activeSources<T extends { fileName: string }>(attached: T[], pageSources: T[]): T[]

export function focusedFields(focus: {section?: number | string; field?: string} | null, message?: string): string[] | undefined
