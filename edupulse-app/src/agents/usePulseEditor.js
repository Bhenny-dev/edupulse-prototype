import { useEffect, useRef } from 'react'
import { registerEditor } from './editorTools'

/** Only mounted, explicitly registered editors can receive an agent patch. */
export function usePulseEditor({ kind, label, data, apply, save, prepareCourse, enabled = true }) {
  const instance = useRef(crypto.randomUUID()), latest = useRef(null)
  latest.current = { data, apply, save, label, prepareCourse }
  useEffect(() => {
    if (!enabled) return
    return registerEditor(instance.current, {
      read: () => ({ instance: instance.current, kind, label: latest.current.label, data: latest.current.data }),
      apply: patch => latest.current.apply(patch),
      prepareCourse: (code, data) => latest.current.prepareCourse ? latest.current.prepareCourse(code, data) : data,
      save: async next => { if (!latest.current.save) throw new Error('Use this editor’s Save control to persist changes.'); return latest.current.save(next) },
    })
  }, [kind, enabled])
}
