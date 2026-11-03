import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { aiRequest } from '../lib/aiClient'

const EMPTY_ACADEMIC = { courses: [], publications: [], enrollments: [], attempts: [], accesses: [], institutional: [], faculty: [], events: [], notices: [] }
const AcademicContext = createContext(null)

export function AcademicProvider({ children }) {
  const { user } = useAuth()
  // An owner-admin view switch keeps the same authenticated account. Preserve
  // the surrounding chat; actual account/assigned-role changes still remount it.
  return <AcademicSession key={`${user?.id}:${user?.baseRole || user?.role}:${!!user?.authenticated}`} user={user}>{children}</AcademicSession>
}

function AcademicSession({ children, user }) {
  const [data, setData] = useState(EMPTY_ACADEMIC)
  const [loading, setLoading] = useState(Boolean(user?.authenticated && user.role !== 'admin'))
  const [error, setError] = useState('')
  const [loaded,setLoaded]=useState(false)
  const role = user?.role
  const [recordRole,setRecordRole]=useState(role)
  const currentRole=useRef(role),loadedRole=useRef(role)
  currentRole.current=role
  const request = useRef(null)
  const load = useCallback(async () => {
    if(currentRole.current!==role)return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    if(loadedRole.current!==role){setData(EMPTY_ACADEMIC);setLoaded(false);loadedRole.current=role}
    setRecordRole(role)
    setLoading(true); setError('')
    try {
      const records = await aiRequest('academic', 'GET', undefined, controller.signal)
      if (!controller.signal.aborted) {setData(Object.fromEntries(Object.keys(EMPTY_ACADEMIC).map(key => [key, Array.isArray(records[key]) ? records[key] : []])));setLoaded(true)}
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message)
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }, [role])
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
  const sameView=recordRole===role
  return <AcademicContext.Provider value={{ data:sameView?data:EMPTY_ACADEMIC, loading:sameView?loading:Boolean(user?.authenticated&&role!=='admin'), loaded:sameView&&loaded, error:sameView?error:'', load, command }}>{children}</AcademicContext.Provider>
}

export function useAcademicRecords() {
  const value = useContext(AcademicContext)
  if (!value) throw new Error('AcademicProvider is required')
  return value
}
