import { useState } from 'react'
import { useAcademicRecords } from '../../context/AcademicContext'

/** One Dean command at a time; the records reload after every saved change. */
export function useDeanAction() {
  const { command } = useAcademicRecords()
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(null)
  const run = async (label, payload, success) => {
    setBusy(label); setError(''); setNotice(null)
    try { const result = await command({ operation: 'dean', command: payload }); if (success) setNotice(success(result)); return result }
    catch (failure) { setError(failure.message || 'The change could not be saved.'); return null }
    finally { setBusy('') }
  }
  return { run, busy, error, notice, setNotice, setError }
}

/** Strong one-time password for a new staff account. */
export function staffPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', bytes = crypto.getRandomValues(new Uint8Array(14))
  return `Ep9!${[...bytes].map(byte => alphabet[byte % alphabet.length]).join('')}`
}

