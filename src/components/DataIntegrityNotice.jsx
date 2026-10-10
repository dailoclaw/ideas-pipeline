import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../lib/store'
export default function DataIntegrityNotice() {
  const { datasetComplete, activityHistoryComplete, outboxCount, outboxError, outboxStorageError, outboxSyncing, load, syncActivity, exportPendingActivity } = useStore(useShallow(state => ({
    datasetComplete: state.datasetComplete,
    activityHistoryComplete: state.activityHistoryComplete,
    outboxCount: state.outboxCount,
    outboxError: state.outboxError,
    outboxStorageError: state.outboxStorageError,
    outboxSyncing: state.outboxSyncing,
    load: state.load,
    syncActivity: state.syncActivity,
    exportPendingActivity: state.exportPendingActivity,
  })))
  const exportPending = () => {
    const url=URL.createObjectURL(new Blob([exportPendingActivity()],{type:'application/json'}))
    const link=document.createElement('a');link.href=url;link.download='ideaflow-pending-activity.json';link.click()
    setTimeout(()=>URL.revokeObjectURL(url),0)
  }
  if(datasetComplete && activityHistoryComplete && !outboxCount && !outboxError && !outboxStorageError)return null
  return <div className="save-feedback save-feedback--warning" role="status">
    <p>{!datasetComplete ? 'Dataset refresh is incomplete. Export is unavailable until a complete refresh succeeds. ' : ''}
      {!activityHistoryComplete ? 'Remote activity history is unavailable or incomplete. ' : ''}
      {outboxCount ? `${outboxCount} activity events await synchronization. Pending history is removed on sign out. ` : ''}
      {outboxStorageError ? 'Browser storage cannot retain pending history across refresh. Export it now. ' : ''}
      {outboxError}</p>
    <div>{(!datasetComplete || !activityHistoryComplete) && <button onClick={()=>{void load({background:true})}}>Refresh complete dataset</button>}<button disabled={outboxSyncing} onClick={()=>{void syncActivity()}}>Retry activity sync</button>
      {outboxCount>0 && <button onClick={exportPending}>Export pending history</button>}</div>
  </div>
}
