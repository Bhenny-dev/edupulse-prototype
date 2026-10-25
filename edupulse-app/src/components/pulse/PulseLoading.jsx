import { useEffect, useState } from 'react'
import { BUDDIES, loadingLine } from '../../agents/buddies'
export default function PulseLoading({ buddy = 'quill', startedAt }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { setTick(0); const timer = setInterval(() => setTick(value => value + 1), 4500); return () => clearInterval(timer) }, [buddy, startedAt])
  return <div className="pulse-loading" role="status"><span className="pulse-loading-orbit" aria-hidden="true" style={{ '--buddy-color': BUDDIES.find(item => item.id === buddy)?.color }}>✦</span><div><strong>{loadingLine(buddy, tick)}</strong><small>{tick >= 4 ? 'Still waiting for the active request. You can stop it below.' : 'A little desk activity while your request runs.'}</small></div></div>
}
