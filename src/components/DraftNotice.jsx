import { useStore } from '../lib/store'
export default function DraftNotice({ onOpen }) {
  const { draftValues, draftStorageError, ideas } = useStore()
  const ids = Object.entries(draftValues).filter(([,fields]) => Object.values(fields).some(d => d.dirty)).map(([id]) => Number(id))
  if (!ids.length) return null
  return <div className="save-feedback save-feedback--warning draft-notice" role="status">
    <p>{ids.length} unsaved {ids.length === 1 ? 'idea draft' : 'idea drafts'}.
      {draftStorageError && ' Browser storage is unavailable; keep this page open to preserve drafts.'}</p>
    <div>{ids.map(id => <button key={id} type="button" disabled={!ideas.some(i => i.id === id)} onClick={() => onOpen(id)}>Review draft #{id}</button>)}</div>
  </div>
}
