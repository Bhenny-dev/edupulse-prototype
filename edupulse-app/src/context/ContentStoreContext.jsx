import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { mergeDrafts } from '../utils/contentUpdates'

/* ─── Content Store Context ───
 * Device-persisted, account-scoped store for generated courseware content.
 * Both Courseware and StudentMonitoring read from this store.
 * Content is keyed by contentId: { content, status, type, week, syllabusId, title, generatedAt }
 * Lifecycle: draft → checked → published
 * Legacy status-only preview placeholders are excluded: they are not saved content.
 */

const ContentStoreContext = createContext(null)

export function ContentStoreProvider({ children }) {
  const { user } = useAuth()
  const owner = user?.authenticated ? user.id : 'preview'
  return <ScopedContentStore key={owner} owner={owner}>{children}</ScopedContentStore>
}

function ScopedContentStore({ children, owner }) {
  const key = `edupulse-content-v1-${owner}`
  const [store, setStore] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null')
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) return Object.fromEntries(Object.entries(saved).filter(([, item]) => item?.content && typeof item.content.title === 'string' && ['material', 'activity', 'assessment'].includes(item.type)))
    } catch { /* Ignore corrupted local cache. */ }
    return {}
  })
  const [storageError, setStorageError] = useState('')
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(store)); setStorageError('') }
    catch { setStorageError('Courseware could not be saved on this device. Export important work before closing the page.') }
  }, [key, store])

  const generateCourse = useCallback((syllabusId, courseUpdates) => {
    setStore(prev => mergeDrafts(prev, courseUpdates))
  }, [])

  const generateWeek = useCallback((weekUpdates) => {
    setStore(prev => mergeDrafts(prev, weekUpdates))
  }, [])

  const checkItem = useCallback((contentId) => {
    setStore(prev => !prev[contentId] ? prev : ({
      ...prev,
      [contentId]: { ...prev[contentId], status: 'checked' },
    }))
  }, [])

  const bulkCheck = useCallback((contentIds) => {
    setStore(prev => {
      const next = { ...prev }
      for (const id of contentIds) {
        if (next[id]) next[id] = { ...next[id], status: 'checked' }
      }
      return next
    })
  }, [])

  const toggleVisibility = useCallback((contentId, newStatus) => {
    setStore(prev => !prev[contentId] || (newStatus === 'published' && !['checked', 'published'].includes(prev[contentId].status)) ? prev : ({
      ...prev,
      [contentId]: { ...prev[contentId], status: newStatus },
    }))
  }, [])

  const saveContent = useCallback((contentId, newContent) => {
    setStore(prev => !prev[contentId] ? prev : ({
      ...prev,
      [contentId]: { ...prev[contentId], content: newContent, status: 'draft' },
    }))
  }, [])

  return (
    <ContentStoreContext.Provider value={{ store, generateCourse, generateWeek, checkItem, bulkCheck, toggleVisibility, saveContent }}>
      {storageError && <p className="ai-notice" role="alert">{storageError}</p>}
      {children}
    </ContentStoreContext.Provider>
  )
}

export function useContentStore() {
  const ctx = useContext(ContentStoreContext)
  if (!ctx) throw new Error('useContentStore must be used within ContentStoreProvider')
  return ctx
}
