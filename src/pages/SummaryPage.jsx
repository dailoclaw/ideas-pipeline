import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea, gradeFromScore, isStale, STATUS_LABELS } from '../lib/scoring'
import { GROUPS, GROUP_MAP } from '../data/groups'
import Icon from '../components/Icon'

const STATUS_META = [
  { key: 'building', label: 'Building', color: '#55c786', icon: 'hammer' },
  { key: 'ready', label: 'Ready', color: '#5ed7c7', icon: 'circleCheck' },
  { key: 'researching', label: 'Discovery', color: '#5d8fe4', icon: 'search' },
  { key: 'idea', label: 'Ideas', color: '#8f7cff', icon: 'lightbulb' },
  { key: 'done', label: 'Done', color: '#a69cff', icon: 'check' },
  { key: 'shelved', label: 'Shelved', color: '#d7a64a', icon: 'archive' },
]

const weekLabel = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

function buildMomentum(events) {
  const now = new Date()
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const end = new Date(now)
    end.setDate(end.getDate() - ((5 - index) * 7))
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end, label: weekLabel(end), count: 0 }
  })

  events.forEach(event => {
    const occurred = new Date(event.occurredAt)
    const week = weeks.find(item => occurred >= item.start && occurred <= item.end)
    if (week) week.count += 1
  })
  return weeks
}

function MomentumChart({ weeks }) {
  const max = Math.max(1, ...weeks.map(week => week.count))
  const points = weeks.map((week, index) => {
    const x = 12 + (index * 55.2)
    const y = 82 - ((week.count / max) * 58)
    return { x, y, ...week }
  })
  const path = points.map(point => `${point.x},${point.y}`).join(' ')

  return (
    <div className="pulse-chart" aria-label="Six-week decision activity chart">
      <svg viewBox="0 0 300 104" role="img" aria-label={weeks.map(week => `${week.label}: ${week.count}`).join(', ')}>
        <defs>
          <linearGradient id="pulseArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ui-accent)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--ui-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${points[0].x} 88 L ${path.replaceAll(',', ' ')} L ${points.at(-1).x} 88 Z`} fill="url(#pulseArea)" />
        <polyline points={path} fill="none" stroke="var(--ui-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(point => <circle key={point.label} cx={point.x} cy={point.y} r="4" fill="var(--ui-surface)" stroke="var(--ui-accent)" strokeWidth="2.5" />)}
      </svg>
      <div className="pulse-chart__labels">{weeks.map(week => <span key={week.label}>{week.label}</span>)}</div>
    </div>
  )
}

function ScoreRing({ value, label = 'Complete' }) {
  return (
    <div className="pulse-score-ring" style={{ '--pulse-value': `${Math.max(0, Math.min(100, value)) * 3.6}deg` }}>
      <div><strong>{value}%</strong><span>{label}</span></div>
    </div>
  )
}

function IdeaRow({ idea, status, groupKey, onOpen }) {
  const score = scoreIdea(idea)
  const group = GROUP_MAP[groupKey]
  return (
    <button className="pulse-idea-row" onClick={() => onOpen(idea.id)}>
      <span className="pulse-idea-row__score">{score}<small>{gradeFromScore(score)}</small></span>
      <span className="pulse-idea-row__copy">
        <strong>#{idea.id} {idea.name}</strong>
        <small>{group?.label || 'No workspace'} · {STATUS_LABELS[status] || status}</small>
      </span>
      <Icon name="chevronRight" size={16} />
    </button>
  )
}

export default function SummaryPage({ onOpenIdea, groupFilter = '' }) {
  const { ideas, getStatus, getGroup, activityLog } = useStore()
  const [view, setView] = useState('pulse')
  const [drillStatus, setDrillStatus] = useState('')
  const [search, setSearch] = useState('')

  const scopedIdeas = useMemo(() => {
    if (groupFilter === '__none__') return ideas.filter(idea => !getGroup(idea.id))
    if (groupFilter) return ideas.filter(idea => getGroup(idea.id) === groupFilter)
    return ideas
  }, [ideas, groupFilter, getGroup])

  const statusCounts = useMemo(() => STATUS_META.reduce((counts, status) => ({
    ...counts,
    [status.key]: scopedIdeas.filter(idea => getStatus(idea) === status.key).length,
  }), {}), [scopedIdeas, getStatus])

  const events = useMemo(() => scopedIdeas
    .flatMap(idea => activityLog[idea.id] || [])
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)), [scopedIdeas, activityLog])

  const now = Date.now()
  const recentEvents = events.filter(event => now - new Date(event.occurredAt).getTime() <= 30 * 86400000)
  const priorEvents = events.filter(event => {
    const age = now - new Date(event.occurredAt).getTime()
    return age > 30 * 86400000 && age <= 60 * 86400000
  })
  const movementDelta = recentEvents.length - priorEvents.length
  const completionRate = scopedIdeas.length ? Math.round((statusCounts.done / scopedIdeas.length) * 100) : 0
  const activeCount = statusCounts.building + statusCounts.ready + statusCounts.researching
  const averageScore = scopedIdeas.length ? Math.round(scopedIdeas.reduce((sum, idea) => sum + scoreIdea(idea), 0) / scopedIdeas.length) : 0
  const weeks = useMemo(() => buildMomentum(events), [events])

  const attentionIdeas = useMemo(() => [...scopedIdeas]
    .filter(idea => ['building', 'ready', 'researching'].includes(getStatus(idea)))
    .sort((a, b) => Number(b.isPriority) - Number(a.isPriority) || scoreIdea(b) - scoreIdea(a))
    .slice(0, 4), [scopedIdeas, getStatus])

  const ungroupedCount = scopedIdeas.filter(idea => !getGroup(idea.id)).length
  const staleCount = scopedIdeas.filter(idea => isStale(idea, getStatus)).length
  const attentionCount = new Set(scopedIdeas
    .filter(idea => !getGroup(idea.id) || isStale(idea, getStatus))
    .map(idea => idea.id)).size
  const priorityCount = scopedIdeas.filter(idea => idea.isPriority).length

  const workspaceMetrics = useMemo(() => GROUPS.map(group => {
    const groupIdeas = ideas.filter(idea => getGroup(idea.id) === group.key)
    const done = groupIdeas.filter(idea => getStatus(idea) === 'done').length
    const active = groupIdeas.filter(idea => ['building', 'ready', 'researching'].includes(getStatus(idea))).length
    const topIdea = [...groupIdeas].sort((a, b) => scoreIdea(b) - scoreIdea(a))[0]
    return {
      ...group,
      total: groupIdeas.length,
      done,
      active,
      completion: groupIdeas.length ? Math.round((done / groupIdeas.length) * 100) : 0,
      average: groupIdeas.length ? Math.round(groupIdeas.reduce((sum, idea) => sum + scoreIdea(idea), 0) / groupIdeas.length) : 0,
      topIdea,
    }
  }).sort((a, b) => b.active - a.active || b.total - a.total), [ideas, getGroup, getStatus])

  const listIdeas = useMemo(() => scopedIdeas
    .filter(idea => {
      const query = search.trim().toLowerCase()
      return !query || idea.name.toLowerCase().includes(query) || idea.pitch.toLowerCase().includes(query) || String(idea.id).includes(query)
    })
    .sort((a, b) => scoreIdea(b) - scoreIdea(a)), [scopedIdeas, search])

  const drillIdeas = drillStatus
    ? scopedIdeas.filter(idea => getStatus(idea) === drillStatus).sort((a, b) => scoreIdea(b) - scoreIdea(a))
    : []
  const drillMeta = STATUS_META.find(status => status.key === drillStatus)

  const exportMd = () => {
    const date = new Date().toISOString().slice(0, 10)
    const sections = STATUS_META.map(({ key, label }) => {
      const rows = scopedIdeas.filter(idea => getStatus(idea) === key)
      if (!rows.length) return ''
      return `## ${label}\n\n${rows.map(idea => `### #${idea.id} ${idea.name}\n**Status:** ${label} | **Score:** ${scoreIdea(idea)} | **Build:** ${idea.time}\n\n${idea.pitch}\n`).join('\n')}`
    }).filter(Boolean).join('\n')
    const markdown = `# IdeaFlow Portfolio Pulse\n_Exported: ${date}_\n\n${sections}`
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
    link.download = `ideaflow-portfolio-${date}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="portfolio-pulse">
      <header className="portfolio-pulse__header">
        <div>
          <span>Portfolio intelligence</span>
          <h1>Portfolio Pulse</h1>
          <p>{groupFilter ? 'Focused workspace health and momentum' : 'Health, momentum and focus across every workspace'}</p>
        </div>
        <button className="pulse-icon-button" onClick={exportMd} aria-label="Export portfolio as Markdown"><Icon name="download" size={18} /></button>
      </header>

      <div className="pulse-view-switcher" role="tablist" aria-label="Portfolio views">
        <button role="tab" aria-selected={view === 'pulse'} className={view === 'pulse' ? 'is-active' : ''} onClick={() => { setView('pulse'); setDrillStatus('') }}><Icon name="activity" size={16} /> Pulse</button>
        <button role="tab" aria-selected={view === 'compare'} className={view === 'compare' ? 'is-active' : ''} onClick={() => { setView('compare'); setDrillStatus('') }}><Icon name="groups" size={16} /> Workspaces</button>
        <button role="tab" aria-selected={view === 'ideas'} className={view === 'ideas' ? 'is-active' : ''} onClick={() => { setView('ideas'); setDrillStatus('') }}><Icon name="list" size={16} /> Ideas</button>
      </div>

      {view === 'pulse' && !drillStatus && (
        <div className="portfolio-pulse__content">
          <section className="pulse-hero">
            <div className="pulse-hero__copy">
              <span className="pulse-kicker"><i /> Live portfolio</span>
              <h2>{activeCount ? `${activeCount} ideas are moving forward` : 'The portfolio is ready for its next move'}</h2>
              <p>{recentEvents.length
                ? `${recentEvents.length} meaningful change${recentEvents.length === 1 ? '' : 's'} logged in the last 30 days${movementDelta ? ` · ${Math.abs(movementDelta)} ${movementDelta > 0 ? 'more' : 'fewer'} than the prior period` : ''}.`
                : 'No decisions have been logged in the last 30 days. Review the ready queue to restart momentum.'}</p>
              <div className="pulse-hero__metrics">
                <div><strong>{scopedIdeas.length}</strong><span>Total ideas</span></div>
                <div><strong>{averageScore}</strong><span>Avg. score</span></div>
                <div><strong>{statusCounts.ready}</strong><span>Ready now</span></div>
              </div>
            </div>
            <ScoreRing value={completionRate} />
          </section>

          <section className="pulse-section">
            <div className="pulse-section__heading"><div><span>Portfolio mix</span><h2>Where the work sits</h2></div><small>Tap to drill in</small></div>
            <div className="pulse-status-grid">
              {STATUS_META.map(status => {
                const count = statusCounts[status.key] || 0
                const width = scopedIdeas.length ? Math.max(5, Math.round((count / scopedIdeas.length) * 100)) : 0
                return (
                  <button key={status.key} onClick={() => setDrillStatus(status.key)} style={{ '--status-color': status.color }}>
                    <span className="pulse-status-icon"><Icon name={status.icon} size={16} /></span>
                    <span className="pulse-status-copy"><strong>{status.label}</strong><i><b style={{ width: `${width}%` }} /></i></span>
                    <span className="pulse-status-count">{count}</span>
                    <Icon name="chevronRight" size={15} />
                  </button>
                )
              })}
            </div>
          </section>

          <section className="pulse-grid-two">
            <div className="pulse-panel pulse-momentum">
              <div className="pulse-section__heading"><div><span>Six-week signal</span><h2>Decision momentum</h2></div><strong>{weeks.reduce((sum, week) => sum + week.count, 0)}</strong></div>
              <MomentumChart weeks={weeks} />
            </div>
            <div className="pulse-panel pulse-signals">
              <div className="pulse-section__heading"><div><span>Attention</span><h2>Signals to resolve</h2></div></div>
              <button onClick={() => setDrillStatus('ready')}><Icon name="circleCheck" size={17} /><span><strong>{statusCounts.ready} ready to build</strong><small>Decision-ready opportunities</small></span><Icon name="chevronRight" size={15} /></button>
              <button onClick={() => setView('ideas')}><Icon name="star" size={17} /><span><strong>{priorityCount} marked priority</strong><small>Protected focus items</small></span><Icon name="chevronRight" size={15} /></button>
              <button onClick={() => setView('ideas')}><Icon name="alert" size={17} /><span><strong>{attentionCount} need attention</strong><small>{staleCount} stale · {ungroupedCount} ungrouped</small></span><Icon name="chevronRight" size={15} /></button>
            </div>
          </section>

          <section className="pulse-section pulse-focus">
            <div className="pulse-section__heading"><div><span>Current focus</span><h2>Highest-value active work</h2></div><button onClick={() => setView('ideas')}>See all</button></div>
            <div className="pulse-focus-list">
              {attentionIdeas.length ? attentionIdeas.map(idea => <IdeaRow key={idea.id} idea={idea} status={getStatus(idea)} groupKey={getGroup(idea.id)} onOpen={onOpenIdea} />) : <div className="pulse-empty"><Icon name="sparkles" size={24} /><strong>No active work yet</strong><span>Move an idea into Discovery, Ready or Building to establish focus.</span></div>}
            </div>
          </section>
        </div>
      )}

      {view === 'pulse' && drillStatus && (
        <div className="portfolio-pulse__content pulse-drill">
          <button className="pulse-back" onClick={() => setDrillStatus('')}><Icon name="chevronLeft" size={17} /> Back to pulse</button>
          <section className="pulse-drill__hero" style={{ '--status-color': drillMeta?.color }}>
            <span className="pulse-status-icon"><Icon name={drillMeta?.icon || 'chart'} size={20} /></span>
            <div><span>Status drill-down</span><h2>{drillMeta?.label}</h2><p>{drillIdeas.length} of {scopedIdeas.length} ideas · {scopedIdeas.length ? Math.round((drillIdeas.length / scopedIdeas.length) * 100) : 0}% of portfolio</p></div>
          </section>
          <div className="pulse-list-panel">
            {drillIdeas.length ? drillIdeas.map(idea => <IdeaRow key={idea.id} idea={idea} status={getStatus(idea)} groupKey={getGroup(idea.id)} onOpen={onOpenIdea} />) : <div className="pulse-empty"><Icon name="circleCheck" size={24} /><strong>No ideas here</strong><span>This status is clear.</span></div>}
          </div>
        </div>
      )}

      {view === 'compare' && (
        <div className="portfolio-pulse__content">
          <section className="pulse-compare-intro"><span>Workspace comparison</span><h2>Where momentum lives</h2><p>Compare delivery health, active load and average strategic score across the portfolio.</p></section>
          <div className="workspace-pulse-grid">
            {workspaceMetrics.map((workspace, index) => (
              <article className="workspace-pulse-card" key={workspace.key} style={{ '--workspace-index': index }}>
                <div className="workspace-pulse-card__head"><span><Icon name={workspace.icon} size={19} /></span><div><strong>{workspace.label}</strong><small>{workspace.desc}</small></div></div>
                <div className="workspace-pulse-card__metrics"><div><strong>{workspace.completion}%</strong><span>Complete</span></div><div><strong>{workspace.active}</strong><span>Active</span></div><div><strong>{workspace.average}</strong><span>Avg. score</span></div></div>
                <div className="workspace-pulse-card__bar"><i style={{ width: `${workspace.completion}%` }} /></div>
                {workspace.topIdea ? <button onClick={() => onOpenIdea(workspace.topIdea.id)}><span>Top opportunity</span><strong>#{workspace.topIdea.id} {workspace.topIdea.name}</strong><Icon name="chevronRight" size={15} /></button> : <div className="workspace-pulse-card__empty">No ideas assigned</div>}
              </article>
            ))}
          </div>
        </div>
      )}

      {view === 'ideas' && (
        <div className="portfolio-pulse__content pulse-all-ideas">
          <label className="pulse-search"><Icon name="search" size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search every idea" aria-label="Search every idea" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><Icon name="close" size={15} /></button>}</label>
          <div className="pulse-list-heading"><span>{listIdeas.length} ideas</span><strong>Ranked by strategic score</strong></div>
          <div className="pulse-list-panel">
            {listIdeas.length ? listIdeas.map(idea => <IdeaRow key={idea.id} idea={idea} status={getStatus(idea)} groupKey={getGroup(idea.id)} onOpen={onOpenIdea} />) : <div className="pulse-empty"><Icon name="search" size={24} /><strong>No matching ideas</strong><span>Try a different name, ID or phrase.</span></div>}
          </div>
        </div>
      )}
    </div>
  )
}
