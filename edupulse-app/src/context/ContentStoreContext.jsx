import { createContext, useContext, useState, useCallback } from 'react'
import { buildInitialContentStore } from '../data/mockData'

/* ─── Content Store Context ───
 * Shared ephemeral store for generated courseware content.
 * Both Courseware and StudentMonitoring read from this store.
 * Content is keyed by contentId: { content, status, type, week, syllabusId, title, generatedAt }
 * Lifecycle: draft → checked → published
 * Pre-seeded with published items for the 4 active syllabi so students
 * can immediately view courseware and instructors see their generated content.
 */

const ContentStoreContext = createContext(null)

export function ContentStoreProvider({ children }) {
  const [store, setStore] = useState(() => buildInitialContentStore())

  const generateCourse = useCallback((syllabusId, courseUpdates) => {
    setStore(prev => ({ ...prev, ...courseUpdates }))
  }, [])

  const generateWeek = useCallback((weekUpdates) => {
    setStore(prev => ({ ...prev, ...weekUpdates }))
  }, [])

  const checkItem = useCallback((contentId) => {
    setStore(prev => ({
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
    <ContentStoreContext.Provider value={{ store, generateCourse, generateWeek, checkItem, bulkCheck, toggleVisibility, saveContent }}>
      {children}
    </ContentStoreContext.Provider>
  )
}

export function useContentStore() {
  const ctx = useContext(ContentStoreContext)
  if (!ctx) throw new Error('useContentStore must be used within ContentStoreProvider')
  return ctx
}
