const IMAGES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }
const extensionOf = (name?: string) => /\.([a-z0-9]{1,8})$/i.exec(name || '')?.[1]?.toLowerCase() || ''
/** What the file viewer can draw for an attached file, judged by its name. Anything else stays a download. */
export function teachingFileKind(file?: { name?: string }): 'pdf' | 'pptx' | 'docx' | 'image' | 'text' | null {
  const extension = extensionOf(file?.name)
  if (extension === 'pdf' || extension === 'pptx' || extension === 'docx') return extension
  if (IMAGES[extension]) return 'image'
  return ['txt', 'md', 'markdown', 'csv'].includes(extension) ? 'text' : null
}
export const teachingImageType = (file: { name: string }) => IMAGES[extensionOf(file.name)]
