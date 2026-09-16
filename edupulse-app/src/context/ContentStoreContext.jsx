import { createContext, useContext, useCallback } from 'react'
import { useWorkspace } from './WorkspaceContext'
import { mergeDrafts } from '../utils/contentUpdates'

/* ─── Content Store Context ───
 * Workspace-backed, account-scoped store for generated courseware content.
 * Both Courseware and StudentMonitoring read from this store.
 * Content is keyed by contentId: { content, status, type, week, syllabusId, title, generatedAt }
 * Lifecycle: draft → checked → published
 * Legacy status-only preview placeholders are excluded: they are not saved content.
 */

const ContentStoreContext = createContext(null)

export function ContentStoreProvider({ children }) {
  const { content: store, setContent: setStore } = useWorkspace()

  const generateCourse = useCallback((syllabusId, courseUpdates) => {
    setStore(prev => mergeDrafts(prev, courseUpdates))
  }, [setStore])

  const generateWeek = useCallback((weekUpdates) => {
    setStore(prev => mergeDrafts(prev, weekUpdates))
  }, [setStore])

  const checkItem = useCallback((contentId) => {
    setStore(prev => !prev[contentId] ? prev : ({
      ...prev,
      [contentId]: { ...prev[contentId], status: 'checked' },
    }))
  }, [setStore])

  const bulkCheck = useCallback((contentIds) => {
    setStore(prev => {
      const next = { ...prev }
      for (const id of contentIds) {
        if (next[id]) next[id] = { ...next[id], status: 'checked' }
      }
      return next
    })
  }, [setStore])

  const toggleVisibility = useCallback((contentId, newStatus) => {
    setStore(prev => !prev[contentId] || (newStatus === 'published' && !['checked', 'published'].includes(prev[contentId].status)) ? prev : ({
      ...prev,
      [contentId]: { ...prev[contentId], status: newStatus },
    }))
  }, [setStore])

  const saveContent = useCallback((contentId, newContent) => {
    setStore(prev => !prev[contentId] ? prev : ({
      ...prev,
      [contentId]: { ...prev[contentId], content: newContent, status: 'draft' },
    }))
  }, [setStore])

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
