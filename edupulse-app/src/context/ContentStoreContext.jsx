import { createContext, useContext, useState, useCallback } from 'react'

/* ─── Content Store Context ───
 * Shared ephemeral store for generated courseware content.
 * Both Courseware and StudentMonitoring read from this store.
 * Content is keyed by contentId: { content, status, type, week, syllabusId, title, generatedAt }
 */

const ContentStoreContext = createContext(null)

export function ContentStoreProvider({ children }) {
  const [store, setStore] = useState({})

  const generateCourse = useCallback((syllabusId, courseUpdates) => {
    setStore(prev => ({ ...prev, ...courseUpdates }))
  }, [])

  const toggleVisibility = useCallback((contentId, newStatus) => {
    setStore(prev => ({
      ...prev,
      [contentId]: { ...prev[contentId], status: newStatus },
    }))
  }, [])

  const saveContent = useCallback((contentId, newContent) => {
    setStore(prev => ({
      ...prev,
      [contentId]: { ...prev[contentId], content: newContent },
    }))
  }, [])

  return (
    <ContentStoreContext.Provider value={{ store, generateCourse, toggleVisibility, saveContent }}>
      {children}
    </ContentStoreContext.Provider>
  )
}

export function useContentStore() {
  const ctx = useContext(ContentStoreContext)
  if (!ctx) throw new Error('useContentStore must be used within ContentStoreProvider')
  return ctx
}
