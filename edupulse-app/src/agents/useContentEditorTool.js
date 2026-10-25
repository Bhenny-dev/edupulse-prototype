import { useRef } from 'react'
import { useContentStore } from '../context/ContentStoreContext'
import { usePulseEditor } from './usePulseEditor'

export function useContentEditorTool(content, current, apply, isStudent, onBack) {
  const { store, commitContent } = useContentStore()
  const baseline = useRef({ id: content?._storeId, data: store[content?._storeId]?.content })
  if (baseline.current.id !== content?._storeId) baseline.current = { id: content?._storeId, data: store[content?._storeId]?.content }
  usePulseEditor({ kind: 'content', label: content?.title || 'Courseware draft', data: current, enabled: !isStudent && Boolean(content?._storeId), apply,
    save: async next => {
      const { _storeId, ...document } = next
      const result = await commitContent(content._storeId, document, baseline.current.data)
      onBack?.()
      return result
    },
  })
}
