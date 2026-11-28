import { useCallback, useEffect, useState } from 'react'
import { LoadingStatus } from '../ui/LoadingFeedback'
import { teachingFileBytes, teachingFileKind, teachingImageType } from '../../utils/teachingFiles'
import { ImagePage, PdfPages, TextPage, WordPages } from '../documents/FilePages'
import SlidePages from '../documents/SlidePages'

/** The uploaded file itself, drawn as pages: PDF pages, Word pages, PowerPoint slides, a picture or plain text. */
export default function OriginalFile({ file, onFail, flow }) {
  const [bytes, setBytes] = useState(null), kind = teachingFileKind(file), path = file.path
  const fail = useCallback(() => onFail(path), [onFail, path])
  useEffect(() => {
    let cancelled = false
    ;(async () => { const data = await teachingFileBytes(path); if (!cancelled) setBytes(data) })().catch(() => { if (!cancelled) fail() })
    return () => { cancelled = true }
  }, [path, fail])
  if (!bytes) return <LoadingStatus label={`Opening ${file.name}...`} />
  if (kind === 'pdf') return <PdfPages bytes={bytes} onFail={fail} />
  if (kind === 'pptx') return <SlidePages bytes={bytes} onFail={fail} />
  if (kind === 'docx') return <WordPages bytes={bytes} onFail={fail} flow={flow} />
  if (kind === 'image') return <ImagePage bytes={bytes} type={teachingImageType(file)} name={file.name} onFail={fail} />
  return <TextPage bytes={bytes} />
}
