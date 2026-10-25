import { useCallback, useEffect, useState } from 'react'
export default function useOffice(owner) {
  const [tasks, setTasks] = useState([])
  useEffect(() => setTasks([]), [owner])
  const begin = useCallback((buddy, label) => {
    const id = crypto.randomUUID()
    setTasks(previous => [...previous.slice(-49), { id, buddy, label, status: 'working', at: Date.now() }])
    return id
  }, [])
  const finish = useCallback((id, status = 'done', detail, onlyWorking = false) => setTasks(previous => previous.map(task => task.id === id && (!onlyWorking || task.status === 'working') ? { ...task, status, detail, at: Date.now() } : task)), [])
  return { tasks, begin, finish }
}
