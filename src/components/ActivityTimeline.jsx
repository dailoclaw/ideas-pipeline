import { useMemo, useState } from 'react'
import { GROUPS } from '../data/groups'

const STATUS_LABELS = {
  idea: 'Idea',
  researching: 'Researching',
  ready: 'Ready',
  building: 'Building',
  done: 'Done',
  shelved: 'Shelved',
}

const FIELD_LABELS = {
  name: 'Title',
  pitch: 'Pitch',
  target: 'Audience',
  pain: 'Problem',
  mvp: 'MVP',
  win: 'Why it wins',
  notes: 'Notes',
  time: 'Build time',
  plat: 'Platform',
}

const DECISION_TYPES = new Set([
  'status_changed',
  'priority_changed',
  'score_adjusted',
  'group_changed',
  'sprint_scheduled',
])

const EVENT_META = {
  created:          { tone: 'violet', icon: 'plus' },
  status_changed:   { tone: 'green',  icon: 'check' },
  priority_changed: { tone: 'amber',  icon: 'star' },
  score_adjusted:   { tone: 'green',  icon: 'trend' },
  group_changed:    { tone: 'aqua',   icon: 'group' },
  sprint_scheduled: { tone: 'violet', icon: 'calendar' },
  notes_updated:    { tone: 'blue',   icon: 'note' },
  idea_updated:     { tone: 'blue',   icon: 'edit' },
}

const groupLabel = key => GROUPS.find(group => group.key === key)?.label || key || 'No group'
const statusLabel = status => STATUS_LABELS[status] || status || 'Unknown'
const signed = value => Number(value) > 0 ? `+${value}` : String(value || 0)
const dayKey = value => String(value || '').slice(0, 10)

function describeEvent(event) {
  const p = event.payload || {}
  switch (event.type) {
    case 'created':
      return {
        title: 'Idea captured',
        description: 'Added to the intake and ready for review.',
        details: [{ label: 'Starting status', value: 'Idea' }],
      }
    case 'status_changed': {
      const title = p.to === 'building' ? 'Started building' : `Moved to ${statusLabel(p.to)}`
      return {
        title,
        description: `${statusLabel(p.from)} changed to ${statusLabel(p.to)}.`,
        details: [
          { label: 'Previous', value: statusLabel(p.from) },
          { label: 'New status', value: statusLabel(p.to) },
        ],
      }
    }
    case 'priority_changed':
      return {
        title: p.to ? 'Marked as priority' : 'Removed from priority',
        description: p.to ? 'This idea now floats to the top of planning views.' : 'Standard ranking has been restored.',
        details: [{ label: 'Priority', value: p.to ? 'On' : 'Off' }],
      }
    case 'score_adjusted':
      return {
        title: `Score adjustment changed to ${signed(p.to)}`,
        description: 'The manual decision adjustment was updated.',
        details: [
          { label: 'Previous adjustment', value: signed(p.from) },
          { label: 'New adjustment', value: signed(p.to) },
        ],
      }
    case 'group_changed':
      return {
        title: p.to ? `Assigned to ${groupLabel(p.to)}` : 'Removed from group',
        description: p.to ? `Moved from ${groupLabel(p.from)} into ${groupLabel(p.to)}.` : `Removed from ${groupLabel(p.from)}.`,
        details: [
          { label: 'Previous group', value: groupLabel(p.from) },
          { label: 'New group', value: groupLabel(p.to) },
        ],
      }
    case 'sprint_scheduled':
      return {
        title: p.to ? `Scheduled for week ${p.to}` : 'Removed from sprint',
        description: p.to ? 'Delivery timing was added to the sprint plan.' : 'This idea returned to the unscheduled backlog.',
        details: [
          { label: 'Previous week', value: p.from ? `Week ${p.from}` : 'Unscheduled' },
          { label: 'New week', value: p.to ? `Week ${p.to}` : 'Unscheduled' },
        ],
      }
    case 'notes_updated':
      return {
        title: 'Decision notes updated',
        description: 'The supporting context for this idea was refined.',
        details: [{ label: 'Notes', value: p.toLength ? `${p.toLength} characters` : 'Cleared' }],
      }
    case 'idea_updated': {
      const changed = (p.changedFields || []).map(field => FIELD_LABELS[field] || field)
      return {
        title: 'Idea details updated',
        description: changed.length ? `${changed.join(', ')} ${changed.length === 1 ? 'was' : 'were'} changed.` : 'Core idea details were refined.',
        details: changed.map(value => ({ label: 'Changed field', value })),
      }
    }
    default:
      return { title: 'Idea activity', description: 'A change was recorded.', details: [] }
  }
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'Earlier'
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(date.toISOString()) === dayKey(today.toISOString())) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }
  if (dayKey(date.toISOString()) === dayKey(yesterday.toISOString())) return 'Yesterday'
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

function TimelineIcon({ name }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 7" />,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9L12 3Z" />,
    trend: <><path d="m4 16 5-5 4 4 7-8" /><path d="M15 7h5v5" /></>,
    group: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M3 20c.5-4 2.2-6 5-6s4.5 2 5 6M14 14c3.8-.5 6 1.3 6.5 4.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    note: <><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v5h5M8 13h8M8 17h6" /></>,
    edit: <><path d="m4 20 4.2-1 10.7-10.7-3.2-3.2L5 15.8 4 20Z" /><path d="m13.8 7 3.2 3.2" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] || paths.note}</svg>
}

export default function ActivityTimeline({ idea, activity = [], statusHistory = [] }) {
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const events = useMemo(() => {
    const richEvents = activity.map(event => ({ ...event, meta: EVENT_META[event.type] || EVENT_META.idea_updated }))
    const legacyEvents = statusHistory
      .filter(item => !richEvents.some(event => event.type === 'status_changed' && event.payload?.to === item.status && dayKey(event.occurredAt) === dayKey(item.date)))
      .map((item, index) => ({
        id: `legacy-status-${item.status}-${item.date}-${index}`,
        ideaId: idea.id,
        type: 'status_changed',
        payload: { from: index > 0 ? statusHistory[index - 1]?.status : 'idea', to: item.status },
        occurredAt: `${item.date}T12:00:00`,
        actor: 'IdeaFlow',
        meta: EVENT_META.status_changed,
      }))

    const hasCreated = richEvents.some(event => event.type === 'created')
    const capturedEvent = !hasCreated && idea.addedAt ? [{
      id: `captured-${idea.id}`,
      ideaId: idea.id,
      type: 'created',
      payload: { name: idea.name },
      occurredAt: `${idea.addedAt}T09:00:00`,
      actor: 'IdeaFlow',
      meta: EVENT_META.created,
    }] : []

    return [...richEvents, ...legacyEvents, ...capturedEvent]
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
  }, [activity, idea.addedAt, idea.id, idea.name, statusHistory])

  const visibleEvents = filter === 'decisions'
    ? events.filter(event => DECISION_TYPES.has(event.type))
    : events

  return (
    <section className="activity-timeline" aria-label="Activity and decision timeline">
      <div className="activity-timeline__summary">
        <div>
          <span>Trace every change</span>
          <strong>{events.length} recorded {events.length === 1 ? 'event' : 'events'}</strong>
        </div>
        <span className="activity-timeline__live"><i /> Live record</span>
      </div>

      <div className="activity-timeline__filters" role="group" aria-label="Filter timeline">
        <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All activity</button>
        <button className={filter === 'decisions' ? 'is-active' : ''} onClick={() => setFilter('decisions')}>Decisions only</button>
      </div>

      {visibleEvents.length === 0 ? (
        <div className="activity-timeline__empty">
          <TimelineIcon name="note" />
          <strong>No decisions recorded yet</strong>
          <span>Changes to status, score, priority, group, and sprint timing will appear here.</span>
        </div>
      ) : (
        <ol className="activity-timeline__list">
          {visibleEvents.map(event => {
            const content = describeEvent(event)
            const isDecision = DECISION_TYPES.has(event.type)
            const expanded = expandedId === event.id
            const hasDetails = content.details.length > 0
            return (
              <li key={event.id} className={`activity-event activity-event--${event.meta.tone} ${expanded ? 'is-expanded' : ''}`}>
                <span className="activity-event__rail" aria-hidden="true" />
                <span className="activity-event__icon"><TimelineIcon name={event.meta.icon} /></span>
                <button
                  type="button"
                  className="activity-event__main"
                  onClick={() => hasDetails && setExpandedId(expanded ? null : event.id)}
                  aria-expanded={hasDetails ? expanded : undefined}
                >
                  <span className="activity-event__heading">
                    <strong>{content.title}</strong>
                    <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
                  </span>
                  <span className="activity-event__description">{content.description}</span>
                  <span className="activity-event__meta">
                    {isDecision && <b>Decision</b>}
                    <span>by {event.actor || 'You'}</span>
                    {hasDetails && <i>{expanded ? 'Hide detail' : 'Explain change'} <span aria-hidden="true">›</span></i>}
                  </span>
                </button>
                {expanded && (
                  <div className="activity-event__detail">
                    <span>Why it changed</span>
                    {content.details.map((detail, index) => (
                      <div key={`${detail.label}-${index}`}>
                        <small>{detail.label}</small>
                        <strong>{detail.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
