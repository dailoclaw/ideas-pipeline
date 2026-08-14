import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { gradeFromScore, isStale, scoreIdea } from '../lib/scoring'
import { GROUPS } from '../data/groups'
import LayoutPage from '../pages/LayoutPage'
import StrategyPage from '../pages/StrategyPage'
import SprintPage from '../pages/SprintPage'
import GroupsPage from '../pages/GroupsPage'
import SummaryPage from '../pages/SummaryPage'
import Icon from './Icon'

const NAV_ITEMS = [
  { id: 'command', label: 'Command', icon: 'activity' },
  { id: 'rank', label: 'Rank', icon: 'award' },
  { id: 'activity', label: 'Activity', icon: 'list' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'ideas', label: 'Ideas', icon: 'lightbulb' },
  { id: 'spaces', label: 'Spaces', icon: 'groups' },
  { id: 'pulse', label: 'Pulse', icon: 'chart' },
]

const MOBILE_NAV = NAV_ITEMS.slice(0, 4)

const STATUS_LABELS = {
  idea: 'Idea',
  researching: 'Discovery',
  ready: 'Ready',
  building: 'Building',
  done: 'Done',
  shelved: 'Shelved',
}

const EVENT_LABELS = {
  created: 'Idea added',
  status_changed: 'Status change',
  priority_changed: 'Priority change',
  score_adjusted: 'Score updated',
  group_changed: 'Workspace change',
  sprint_scheduled: 'Plan updated',
  notes_updated: 'Notes updated',
  idea_updated: 'Idea updated',
}

const DECISION_EVENTS = new Set(['status_changed', 'priority_changed', 'score_adjusted', 'group_changed', 'sprint_scheduled'])

function ObsidianMark() {
  return (
    <svg className="obsidian-mark" viewBox="0 0 40 40" aria-hidden="true">
      <path d="m20 3 15 8.5v17L20 37 5 28.5v-17L20 3Z" />
      <path d="M20 3v34M5 11.5 35 28.5M35 11.5 5 28.5M5 20h30M12.5 7.2v25.6M27.5 7.2v25.6" />
      <circle cx="20" cy="20" r="4" />
    </svg>
  )
}

const scopedIdeas = (ideas, getGroup, groupFilter) => groupFilter === '__none__'
  ? ideas.filter(idea => !getGroup(idea.id))
  : groupFilter
    ? ideas.filter(idea => getGroup(idea.id) === groupFilter)
    : ideas

function nextStatus(status) {
  if (status === 'idea') return 'researching'
  if (status === 'researching') return 'ready'
  if (status === 'ready') return 'building'
  return status
}

function CommandPage({ groupFilter, onOpenIdea, onNavigate }) {
  const { ideas, getStatus, getGroup, setStatus, activityLog } = useStore()
  const scoped = scopedIdeas(ideas, getGroup, groupFilter)
  const ranked = useMemo(() => [...scoped]
    .filter(idea => !['done', 'shelved'].includes(getStatus(idea)))
    .sort((a, b) => Number(b.isPriority) - Number(a.isPriority) || scoreIdea(b) - scoreIdea(a)), [scoped, getStatus])
  const counts = scoped.reduce((all, idea) => ({ ...all, [getStatus(idea)]: (all[getStatus(idea)] || 0) + 1 }), {})
  const activeCount = (counts.building || 0) + (counts.ready || 0) + (counts.researching || 0)
  const average = scoped.length ? Math.round(scoped.reduce((sum, idea) => sum + scoreIdea(idea), 0) / scoped.length) : 0
  const completion = scoped.length ? Math.round(((counts.done || 0) / scoped.length) * 100) : 0
  const decisionIdea = ranked.find(idea => isStale(idea, getStatus)) || ranked.find(idea => ['ready', 'idea'].includes(getStatus(idea))) || ranked[0]
  const recentDecisions = Object.values(activityLog).flat().filter(event => DECISION_EVENTS.has(event.type) && Date.now() - new Date(event.occurredAt).getTime() < 30 * 86400000).length
  const attention = ranked.filter(idea => isStale(idea, getStatus)).length + (counts.ready || 0)

  const advance = async idea => {
    const status = getStatus(idea)
    const next = nextStatus(status)
    if (next !== status) await setStatus(idea.id, next)
  }

  return (
    <div className="obsidian-page obsidian-command">
      <header className="obsidian-page-heading">
        <div><span>Portfolio at a glance</span><h1>Command</h1><p>Decide what moves next with confidence.</p></div>
        <button onClick={() => onNavigate('pulse')}><Icon name="chart" size={17} /> Open full pulse</button>
      </header>

      <section className="obsidian-health-panel">
        <div className="obsidian-ring" style={{ '--progress': `${completion * 3.6}deg` }}><span><strong>{completion}%</strong><small>complete</small></span></div>
        <div className="obsidian-health-copy">
          <span>Portfolio health</span>
          <h2>{activeCount ? `${activeCount} ideas are moving forward` : 'The portfolio is ready for focus'}</h2>
          <p>{recentDecisions ? `${recentDecisions} material decision${recentDecisions === 1 ? '' : 's'} recorded in the last 30 days.` : 'No decisions have been logged in the last 30 days. Review the ranked queue to restore momentum.'}</p>
        </div>
        <div className="obsidian-health-metrics">
          <div><strong>{scoped.length}</strong><span>Total ideas</span></div>
          <div><strong>{average}</strong><span>Avg. score</span></div>
          <div><strong>{counts.ready || 0}</strong><span>Ready now</span></div>
        </div>
      </section>

      {decisionIdea && (
        <section className="obsidian-decision-card">
          <div className="obsidian-decision-signal"><Icon name="alert" size={24} /></div>
          <div>
            <span>Needs decision</span>
            <h2>#{decisionIdea.id} {decisionIdea.name}</h2>
            <p>{decisionIdea.pitch || 'Review the evidence and confirm the next portfolio step.'}</p>
            <div><b>High impact</b><i /> <b>{STATUS_LABELS[getStatus(decisionIdea)]}</b>{attention > 0 && <><i /><b>{attention} signals</b></>}</div>
          </div>
          <button onClick={() => onOpenIdea(decisionIdea.id)} aria-label={`Review ${decisionIdea.name}`}><Icon name="chevronRight" size={20} /></button>
        </section>
      )}

      <section className="obsidian-stage-panel">
        <div className="obsidian-section-heading"><div><span>Progress to strategy</span><h2>Portfolio movement</h2></div><small>{activeCount} active</small></div>
        <div className="obsidian-stages">
          {[
            ['Discover', (counts.idea || 0) + (counts.researching || 0)],
            ['Evaluate', counts.ready || 0],
            ['Decide', counts.building || 0],
            ['Deliver', counts.done || 0],
          ].map(([label, value], index) => <div key={label} className={value ? 'is-active' : ''}><i>{index + 1}</i><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="obsidian-ranked-panel">
        <div className="obsidian-section-heading"><div><span>Ranked actions</span><h2>Move the strongest work</h2></div><button onClick={() => onNavigate('rank')}>See all</button></div>
        <div className="obsidian-action-list">
          {ranked.slice(0, 5).map((idea, index) => {
            const score = scoreIdea(idea)
            const status = getStatus(idea)
            return (
              <div key={idea.id}>
                <button className="obsidian-action-main" onClick={() => onOpenIdea(idea.id)}>
                  <span className="obsidian-rank-number">{index + 1}</span>
                  <span className={`obsidian-grade grade-${gradeFromScore(score).toLowerCase()}`}>{gradeFromScore(score)}</span>
                  <span className="obsidian-action-copy"><strong>#{idea.id} {idea.name}</strong><small>{STATUS_LABELS[status]} · {idea.time}</small></span>
                  <span className="obsidian-action-score">{score}</span>
                  <Icon name="chevronRight" size={16} />
                </button>
                {['idea', 'researching', 'ready'].includes(status) && <button className="obsidian-advance" onClick={() => advance(idea)}>Advance</button>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function describeActivity(event) {
  const payload = event.payload || {}
  if (event.type === 'status_changed') return `Moved from ${STATUS_LABELS[payload.from] || payload.from || 'Idea'} to ${STATUS_LABELS[payload.to] || payload.to || 'Unknown'}`
  if (event.type === 'score_adjusted') return `Score adjustment changed to ${Number(payload.to) > 0 ? '+' : ''}${payload.to || 0}`
  if (event.type === 'priority_changed') return payload.to ? 'Marked as portfolio priority' : 'Removed from portfolio priorities'
  if (event.type === 'group_changed') return payload.to ? 'Assigned to a new workspace' : 'Removed from its workspace'
  if (event.type === 'sprint_scheduled') return payload.to ? `Scheduled for week ${payload.to}` : 'Returned to the unscheduled backlog'
  if (event.type === 'created') return 'Captured and added to the intake'
  return 'Supporting information was updated'
}

function activityDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Earlier'
  const sameDay = new Date().toDateString() === date.toDateString()
  return sameDay ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function ActivityPage({ groupFilter, onOpenIdea }) {
  const { ideas, getGroup, getStatus, activityLog } = useStore()
  const [filter, setFilter] = useState('all')
  const scoped = scopedIdeas(ideas, getGroup, groupFilter)
  const allowedIds = new Set(scoped.map(idea => idea.id))
  const ideasById = new Map(ideas.map(idea => [idea.id, idea]))
  const events = Object.values(activityLog).flat()
    .filter(event => allowedIds.has(event.ideaId))
    .filter(event => filter === 'all' || (filter === 'decisions' ? DECISION_EVENTS.has(event.type) : event.type === 'status_changed'))
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
  const fallback = scoped.slice().sort((a, b) => scoreIdea(b) - scoreIdea(a)).slice(0, 6).map((idea, index) => ({
    id: `snapshot-${idea.id}`,
    ideaId: idea.id,
    type: index === 0 ? 'priority_changed' : 'idea_updated',
    payload: { to: index === 0 },
    occurredAt: idea.addedAt || new Date(Date.now() - index * 86400000).toISOString(),
    actor: 'IdeaFlow',
  }))
  const visible = events.length ? events : fallback
  const nextDecision = scoped.filter(idea => ['idea', 'ready'].includes(getStatus(idea))).sort((a, b) => scoreIdea(b) - scoreIdea(a))[0]

  return (
    <div className="obsidian-page obsidian-activity-page">
      <header className="obsidian-page-heading">
        <div><span>Decision record</span><h1>Activity</h1><p>Decisions, status changes and next steps.</p></div>
      </header>
      <div className="obsidian-filter-row" role="group" aria-label="Filter portfolio activity">
        {[['all', 'All activity'], ['decisions', 'Decisions'], ['status', 'Status']].map(([key, label]) => <button key={key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>{label}</button>)}
      </div>
      <ol className="obsidian-event-list">
        {visible.map((event, index) => {
          const idea = ideasById.get(event.ideaId)
          const decision = DECISION_EVENTS.has(event.type)
          return (
            <li key={event.id} className={decision ? 'is-decision' : ''}>
              <time>{activityDate(event.occurredAt)}</time>
              <span className="obsidian-event-icon"><Icon name={event.type === 'status_changed' ? 'circleCheck' : decision ? 'target' : 'edit'} size={17} /></span>
              <button onClick={() => idea && onOpenIdea(idea.id)}>
                <span>{EVENT_LABELS[event.type] || 'Activity'}</span>
                <strong>{idea ? `#${idea.id} ${idea.name}` : 'Portfolio update'}</strong>
                <small>{describeActivity(event)}</small>
                <i>by {event.actor || 'You'}{index === 0 ? ' · latest' : ''}</i>
              </button>
              <Icon name="chevronRight" size={16} />
            </li>
          )
        })}
      </ol>
      {nextDecision && <button className="obsidian-next-decision" onClick={() => onOpenIdea(nextDecision.id)}><span><Icon name="alert" size={20} /></span><span><small>Your next decision</small><strong>Review #{nextDecision.id} {nextDecision.name}</strong></span><b>Review</b></button>}
    </div>
  )
}

export default function ObsidianConsole({
  active,
  setActive,
  groupFilter,
  setGroupFilter,
  onOpenIdea,
  onAdd,
  onSettings,
  onTriage,
  onOriginal,
  triageCount,
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const activeMeta = NAV_ITEMS.find(item => item.id === active) || NAV_ITEMS[0]

  const navigate = id => {
    setActive(id)
    setMoreOpen(false)
  }

  const content = {
    command: <CommandPage groupFilter={groupFilter} onOpenIdea={onOpenIdea} onNavigate={navigate} />,
    rank: <StrategyPage groupFilter={groupFilter} onOpenIdea={onOpenIdea} />,
    activity: <ActivityPage groupFilter={groupFilter} onOpenIdea={onOpenIdea} />,
    plan: <SprintPage groupFilter={groupFilter} />,
    ideas: <LayoutPage groupFilter={groupFilter} onOpenIdea={onOpenIdea} />,
    spaces: <GroupsPage onOpenIdea={onOpenIdea} />,
    pulse: <SummaryPage groupFilter={groupFilter} onOpenIdea={onOpenIdea} />,
  }[active]

  return (
    <div className="obsidian-shell">
      <aside className="obsidian-sidebar">
        <div className="obsidian-brand"><ObsidianMark /><span><strong>IdeaFlow</strong><small>Obsidian Console</small></span></div>
        <nav aria-label="Obsidian Console navigation">
          {NAV_ITEMS.map(item => <button key={item.id} className={active === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={active === item.id ? 'page' : undefined}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === 'activity' && <i />}</button>)}
        </nav>
        <label className="obsidian-scope"><span>Workspace</span><select value={groupFilter} onChange={event => setGroupFilter(event.target.value)} aria-label="Filter console by workspace"><option value="">All ideas</option><option value="__none__">No group yet</option>{GROUPS.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}</select></label>
        <div className="obsidian-sidebar-actions">
          <button onClick={onAdd}><Icon name="plus" size={17} /> New idea</button>
          <button onClick={onTriage}><Icon name="target" size={17} /> Triage <span>{triageCount}</span></button>
          <button onClick={onSettings}><Icon name="settings" size={17} /> Settings</button>
          <button onClick={onOriginal}><Icon name="layout" size={17} /> Original layout</button>
        </div>
      </aside>

      <header className="obsidian-mobile-header">
        <div><ObsidianMark /><span><small>IdeaFlow</small><strong>{activeMeta.label}</strong></span></div>
        <button onClick={onAdd} aria-label="New idea"><Icon name="plus" size={20} /></button>
        <button onClick={() => setMoreOpen(true)} aria-label="Open console menu"><Icon name="more" size={22} /></button>
      </header>

      <main className="obsidian-main">{content}</main>

      <nav className="obsidian-bottom-nav" aria-label="Obsidian mobile navigation">
        {MOBILE_NAV.map(item => <button key={item.id} className={active === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={active === item.id ? 'page' : undefined}><Icon name={item.icon} size={18} /><span>{item.label}</span></button>)}
        <button className={['ideas', 'spaces', 'pulse'].includes(active) ? 'is-active' : ''} onClick={() => setMoreOpen(true)}><Icon name="more" size={19} /><span>More</span></button>
      </nav>

      {moreOpen && <div className="obsidian-menu-overlay" onClick={event => { if (event.target === event.currentTarget) setMoreOpen(false) }}>
        <div className="obsidian-menu" role="dialog" aria-modal="true" aria-label="Obsidian Console menu">
          <div className="obsidian-menu-handle" />
          <header><div><strong>Console menu</strong><span>{groupFilter ? GROUPS.find(group => group.key === groupFilter)?.label || 'Filtered workspace' : 'All workspaces'}</span></div><button onClick={() => setMoreOpen(false)} aria-label="Close console menu"><Icon name="close" size={19} /></button></header>
          <label><span>Workspace</span><select value={groupFilter} onChange={event => setGroupFilter(event.target.value)}><option value="">All ideas</option><option value="__none__">No group yet</option>{GROUPS.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}</select></label>
          <div className="obsidian-menu-grid">{NAV_ITEMS.slice(4).map(item => <button key={item.id} className={active === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}</div>
          <div className="obsidian-menu-list">
            <button onClick={() => { setMoreOpen(false); onTriage() }}><Icon name="target" size={19} /><span><strong>Triage ideas</strong><small>{triageCount} awaiting review</small></span><Icon name="chevronRight" size={16} /></button>
            <button onClick={() => { setMoreOpen(false); onSettings() }}><Icon name="settings" size={19} /><span><strong>Appearance and text</strong><small>Adjust display preferences</small></span><Icon name="chevronRight" size={16} /></button>
            <button onClick={() => { setMoreOpen(false); onOriginal() }}><Icon name="layout" size={19} /><span><strong>Switch to original layout</strong><small>Return to the existing IdeaFlow shell</small></span><Icon name="chevronRight" size={16} /></button>
          </div>
        </div>
      </div>}
    </div>
  )
}
