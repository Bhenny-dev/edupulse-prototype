import { jsonValue } from '../utils/jsonValue'
import { createContext, useContext, useCallback } from 'react'
import { useWorkspace } from './WorkspaceContext'
import { mergeDrafts, mergeGeneratedWeek } from '../utils/contentUpdates'

/* ─── Content Store Context ───
 * Workspace-backed, account-scoped store for generated courseware content.
 * Both Courseware and StudentMonitoring read from this store.
 * Content is keyed by contentId: { content, status, type, week, syllabusId, title, generatedAt }
 * Lifecycle: draft → checked → published
 * Legacy status-only preview placeholders are excluded: they are not saved content.
 */

const ContentStoreContext = createContext(null)

export function ContentStoreProvider({ children }) {
  const { content: store, setContent: setStore, commit } = useWorkspace()

  const generateCourse = useCallback((syllabusId, courseUpdates) => {
    setStore(prev => mergeDrafts(prev, courseUpdates))
  }, [setStore])

  const generateWeek = useCallback((weekUpdates) => {
    setStore(prev => mergeDrafts(prev, weekUpdates))
  }, [setStore])

  const commitWeekDrafts = useCallback(async (updates,{syllabus,week,expected,types,missingOnly=false}) => {
    let saved=0
    const receipt=await commit(data=>{
      if(jsonValue(data.syllabi.find(item=>item.id===syllabus.id))!==jsonValue(syllabus))throw new Error('The syllabus changed during generation. Generate from its current outline.')
      const content=mergeGeneratedWeek(data.content,updates,expected,{syllabusId:syllabus.id,week,types,missingOnly})
      saved=Object.keys(updates).filter(id=>content[id]!==data.content[id]).length
      return {...data,content}
    })
    return {...receipt,saved}
  },[commit])

  const checkItem = useCallback((contentId) => {
    setStore(prev => !prev[contentId] ? prev : ({
      ...prev,
      [contentId]: { ...prev[contentId], status: 'checked', outOfAlignment:false },
    }))
  }, [setStore])

  const bulkCheck = useCallback((contentIds) => {
    setStore(prev => {
      const next = { ...prev }
      for (const id of contentIds) {
        if (next[id]) next[id] = { ...next[id], status: 'checked', outOfAlignment:false }
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
  const commitContent = useCallback(async (contentId, newContent, expected) => commit(data => {
    const current = data.content[contentId]
    if (!current) throw new Error('Open a saved courseware draft before asking Pulse to revise it.')
    if (current.status === 'published') throw new Error('Published content is protected. Create or open a draft version before using Pulse edits.')
    if (jsonValue(current.content) !== jsonValue(expected)) throw new Error('This courseware changed while the proposal was being prepared. Reopen it and request a fresh preview.')
    return { ...data, content: { ...data.content, [contentId]: { ...current, content: newContent, title: newContent.title, status: 'draft' } } }
  }), [commit])

  return (
    <ContentStoreContext.Provider value={{ store, generateCourse, generateWeek, commitWeekDrafts, checkItem, bulkCheck, toggleVisibility, saveContent, commitContent }}>
      {children}
    </ContentStoreContext.Provider>
  )
}

export function useContentStore() {
  const ctx = useContext(ContentStoreContext)
  if (!ctx) throw new Error('useContentStore must be used within ContentStoreProvider')
  return ctx
}
