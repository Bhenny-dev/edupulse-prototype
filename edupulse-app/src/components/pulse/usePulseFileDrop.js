import { useRef, useState } from 'react'

const hasFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files')

/** Native file drops share the paperclip reader; page text and internal row drags are untouched. */
export default function usePulseFileDrop({ disabled, onFiles, onBlocked }) {
  const [active, setActive] = useState(false)
  const depth = useRef(0)
  const reset = () => { depth.current = 0; setActive(false) }
  return { active, handlers: {
    onDragEnter(event) { if (!hasFiles(event)) return; event.preventDefault(); depth.current++; setActive(true) },
    onDragOver(event) { if (!hasFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy' },
    onDragLeave(event) { if (!hasFiles(event)) return; event.preventDefault(); if (--depth.current <= 0) reset() },
    onDrop(event) {
      if (!hasFiles(event)) return
      event.preventDefault(); event.stopPropagation(); reset()
      if (disabled) { onBlocked(); return }
      const files = Array.from(event.dataTransfer.files || [])
      if (files.length) onFiles(files)
    },
  } }
}
