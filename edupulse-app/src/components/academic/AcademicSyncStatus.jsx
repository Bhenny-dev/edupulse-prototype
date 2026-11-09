import { useAcademicRecords } from '../../context/AcademicContext'
import { Spinner } from '../ui/LoadingFeedback'
import { useWorkspace } from '../../context/WorkspaceContext'

export default function AcademicSyncStatus() {
  const { loading, loaded, online, error, refreshAvailable, load } = useAcademicRecords()
  const workspace = useWorkspace()
  return <div className="academic-sync-status">
    <span role="status">{!online ? loaded ? 'Offline · showing previously loaded records' : 'Offline · waiting for connection' : workspace.conflict ? 'Workspace conflict · review pending edits' : workspace.error ? 'Workspace needs attention' : workspace.saving || workspace.dirty ? 'Waiting for workspace save…' : loading ? <><Spinner /> Updating records…</> : error ? 'Refresh records to retry' : refreshAvailable ? 'Updates available' : loaded ? 'Records up to date' : 'Waiting for records'}</span>
    {(error || refreshAvailable) && <button type="button" className="btn btn-secondary btn-sm" disabled={!online || loading || workspace.loading || workspace.saving || workspace.dirty || workspace.conflict} onClick={() => void load(true)}>{error?'Retry connection':'Refresh records'}</button>}
  </div>
}
