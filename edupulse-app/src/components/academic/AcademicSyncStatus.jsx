import { useAcademicRecords } from '../../context/AcademicContext'
import { Spinner } from '../ui/LoadingFeedback'
import { useWorkspace } from '../../context/WorkspaceContext'

export default function AcademicSyncStatus() {
  const { loading, loaded, online, error, load } = useAcademicRecords()
  const workspace = useWorkspace()
  return <div className="academic-sync-status">
    <span role="status">{!online ? loaded ? 'Offline · showing previously loaded records' : 'Offline · waiting for connection' : workspace.conflict ? 'Workspace conflict · review pending edits' : workspace.error ? 'Workspace needs attention' : workspace.saving || workspace.dirty ? 'Waiting for workspace save…' : loading ? <><Spinner /> Updating records…</> : error ? 'Automatic refresh will retry' : loaded ? 'Records up to date' : 'Waiting for records'}</span>
    {error && <button type="button" className="btn btn-secondary btn-sm" disabled={!online || loading} onClick={() => void load(true)}>Retry connection</button>}
  </div>
}
