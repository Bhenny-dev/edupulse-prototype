import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { aiRequest } from '../lib/aiClient'

const EMPTY_ACADEMIC = { courses: [], publications: [], enrollments: [], attempts: [], accesses: [], institutional: [], faculty: [], events: [], notices: [] }
const AcademicContext = createContext(null)

export function AcademicProvider({ children }) {
  const { user } = useAuth()
  return <AcademicSession key={`${user?.id}:${user?.role}:${!!user?.authenticated}`} user={user}>{children}</AcademicSession>
}

function AcademicSession({ children, user }) {
  const [data, setData] = useState(EMPTY_ACADEMIC)
  const [loading, setLoading] = useState(Boolean(user?.authenticated && user.role !== 'admin'))
  const [error, setError] = useState('')
  const [loaded,setLoaded]=useState(false)
  const request = useRef(null)
  const load = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError('')
    try {
      const records = await aiRequest('academic', 'GET', undefined, controller.signal)
      if (!controller.signal.aborted) {setData(Object.fromEntries(Object.keys(EMPTY_ACADEMIC).map(key => [key, Array.isArray(records[key]) ? records[key] : []])));setLoaded(true)}
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    if (user?.authenticated && user.role !== 'admin') void load()
    return () => request.current?.abort()
  }, [load, user?.authenticated, user?.role])
  const command = useCallback(async input => {
    const result = await aiRequest('academic','POST',input)
    await load()
    return result
  }, [load])
  useEffect(() => {
    if (!user?.authenticated || user.role === 'admin') return
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 60000)
    return () => clearInterval(timer)
  }, [load, user?.authenticated, user?.role])
  return <AcademicContext.Provider value={{ data, loading, loaded, error, load, command }}>{children}</AcademicContext.Provider>
}

export function useAcademicRecords() {
  const value = useContext(AcademicContext)
  if (!value) throw new Error('AcademicProvider is required')
  return value
}
