import { useState } from 'react'
import { useStore } from '../lib/store'

export default function SaveFeedback({ onRetry }) {
  const feedback = useStore(state => state.saveFeedback)
  const pending = useStore(state => Object.keys(state.pendingSaves).length > 0)
  const [retrying, setRetrying] = useState(false)
  if (!feedback) return null
  async function retry() {
    if (retrying || pending) return
    setRetrying(true)
    try {
      await (onRetry ? onRetry(feedback) : feedback.retry())
      if (useStore.getState().saveFeedback === feedback) useStore.getState().clearSaveFeedback()
    } catch { /* The mutation publishes its recoverable error to the store. */ }
    finally { setRetrying(false) }
  }
  return <div className={`save-feedback save-feedback--${feedback.level}`} role={feedback.level === 'error' ? 'alert' : 'status'}>
    <p>{feedback.message}</p>
    <div><button type="button" disabled={retrying || pending} onClick={retry}>{feedback.level === 'warning' ? 'Refresh dataset' : 'Retry save'}</button>
    <button type="button" onClick={() => useStore.getState().clearSaveFeedback()}>Dismiss</button></div>
  </div>
}
