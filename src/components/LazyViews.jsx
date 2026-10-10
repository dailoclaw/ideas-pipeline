import { Component, lazy, Suspense, useRef } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'

function LoadFailure({ onClose }) {
  const ref = useRef(null)
  useDialogFocus(ref, onClose || (() => {}), !!onClose)
  return <section ref={ref} tabIndex={onClose ? -1 : undefined} role={onClose ? 'dialog' : undefined} aria-modal={onClose ? true : undefined} aria-label="View unavailable" className="p-4 bg-white dark:bg-slate-800">
    <p role="alert">Unable to open this view. Check your connection and reload when ready.</p>
    {onClose ? <button type="button" onClick={onClose}>Close</button> : <button type="button" onClick={() => window.location.reload()}>Reload</button>}
  </section>
}
class ViewBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <LoadFailure onClose={this.props.onClose} /> : this.props.children }
}
function deferred(loader) {
  const View = lazy(loader)
  return function DeferredView(props) {
    return <ViewBoundary onClose={props.onClose}><Suspense fallback={<p className="p-4" role="status">Loading view…</p>}><View {...props} /></Suspense></ViewBoundary>
  }
}
export const LayoutPage = deferred(() => import('../pages/LayoutPage'))
export const StrategyPage = deferred(() => import('../pages/StrategyPage'))
export const SprintPage = deferred(() => import('../pages/SprintPage'))
export const GroupsPage = deferred(() => import('../pages/GroupsPage'))
export const SummaryPage = deferred(() => import('../pages/SummaryPage'))
export const SettingsDrawer = deferred(() => import('./SettingsDrawer'))
export const IdeaModal = deferred(() => import('./IdeaModal'))
export const AddIdeaModal = deferred(() => import('./AddIdeaModal'))
export const TriageModal = deferred(() => import('./TriageModal'))
export const ObsidianConsole = deferred(() => import('./ObsidianConsole'))
