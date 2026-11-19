/** Files a teaching material can be built from: the formats the server's extractor reads (server/ingest/formats.mjs). */
export const TEACHING_SOURCE_TYPES = ['pdf', 'docx', 'pptx', 'xlsx', 'csv', 'html', 'htm', 'txt', 'md'] as const
export const teachingSourceAccept = TEACHING_SOURCE_TYPES.map(type => `.${type}`).join(',')
export const readableTeachingSource = (name: string) =>
  (TEACHING_SOURCE_TYPES as readonly string[]).includes(/\.([a-z0-9]{1,8})$/i.exec(name || '')?.[1]?.toLowerCase() || '')
