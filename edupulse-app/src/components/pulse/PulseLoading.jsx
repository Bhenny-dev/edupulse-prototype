import { useEffect, useState } from 'react'
import { LoadingStatus } from '../ui/LoadingFeedback'
export default function PulseLoading({ buddy = 'quill', startedAt }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { setTick(0); const timer = setInterval(() => setTick(value => value + 1), 4500); return () => clearInterval(timer) }, [buddy, startedAt])
  return <div className="pulse-loading"><LoadingStatus dots label={tick >= 4 ? 'Still working…' : 'Thinking…'} /></div>
}
