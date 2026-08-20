import { GROUP_MAP } from '../data/groups.js'
import { scoreDimensions, scoreIdea } from './scoring.js'

const STATUS_LABELS = {
  idea: 'Idea',
  researching: 'Researching',
  ready: 'Ready',
  building: 'Building',
  done: 'Done',
  shelved: 'Shelved',
}

const TIME_LABELS = {
  '1w': '1 week',
  '1-2w': '1–2 weeks',
  '2-4w': '2–4 weeks',
}

const PLATFORM_LABELS = {
  html: 'HTML tool',
  hub: 'Awards Hub',
  pay: 'Pay Modeller',
}

export function formatExportDate(value) {
  if (!value) return ''

  // Preserve database date-only values without introducing a timezone shift.
  const dateOnly = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

const COLUMNS = [
  ['Idea ID', ({ idea }) => idea.id],
  ['Name', ({ idea }) => idea.name],
  ['Current status', ({ idea, getStatus }) => STATUS_LABELS[getStatus(idea)] || getStatus(idea)],
  ['Build time', ({ idea }) => TIME_LABELS[idea.time] || idea.time],
  ['Platform', ({ idea }) => PLATFORM_LABELS[idea.plat] || idea.plat],
  ['Workspace', ({ idea, getGroup }) => GROUP_MAP[getGroup(idea.id)]?.label || 'No workspace'],
  ['Workspace key', ({ idea, getGroup }) => getGroup(idea.id)],
  ['Pitch', ({ idea }) => idea.pitch],
  ["Who it's for", ({ idea }) => idea.target],
  ['Problem', ({ idea }) => idea.pain],
  ['MVP', ({ idea }) => (idea.mvp || []).map((item, index) => `${index + 1}. ${item}`).join('\n')],
  ['Why it wins', ({ idea }) => idea.win],
  ['Notes', ({ idea }) => idea.notes],
  ['Score', ({ idea }) => scoreIdea(idea)],
  ['Score adjustment', ({ idea }) => idea.scoreAdjust || 0],
  ['Effort score', ({ idea }) => scoreDimensions(idea).effort],
  ['Platform score', ({ idea }) => scoreDimensions(idea).platform],
  ['MVP score', ({ idea }) => scoreDimensions(idea).mvp],
  ['Novelty score', ({ idea }) => scoreDimensions(idea).novelty],
  ['Pain score', ({ idea }) => scoreDimensions(idea).pain],
  ['Priority', ({ idea }) => idea.isPriority ? 'Yes' : 'No'],
  ['Sprint duration (weeks)', ({ idea, getSprintWeeks }) => getSprintWeeks(idea.id, idea)],
  ['Scheduled sprint week', ({ idea, getSprintAssignment }) => getSprintAssignment(idea.id) || ''],
  ['Added date', ({ idea }) => formatExportDate(idea.addedAt)],
  ['Created at', ({ idea }) => formatExportDate(idea.createdAt)],
  ['Updated at', ({ idea }) => formatExportDate(idea.updatedAt)],
  ['Source', ({ idea }) => idea.isNew ? 'User-created' : 'Seed'],
  ['Version 2', ({ idea }) => idea.isV2 ? 'Yes' : 'No'],
  ['Original idea ID', ({ idea }) => idea.originalId],
  ['Status history', ({ idea, statusHistory }) => (statusHistory[idea.id] || [])
    .map(item => `${formatExportDate(item.date)} | ${STATUS_LABELS[item.status] || item.status || ''}`)
    .join('\n')],
  ['Activity history', ({ idea, activityLog }) => (activityLog[idea.id] || [])
    .map(event => {
      const payload = event.payload && Object.keys(event.payload).length ? ` | ${JSON.stringify(event.payload)}` : ''
      return `${formatExportDate(event.occurredAt)} | ${event.type || ''} | ${event.actor || ''}${payload}`
    })
    .join('\n')],
]

// Spreadsheet apps can interpret cells beginning with these characters as
// formulas. Prefix user-authored strings so opening an export cannot execute one.
const protectFormula = value => /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value

export function escapeCsvCell(value) {
  if (value == null) return '""'
  const stringValue = typeof value === 'string' ? protectFormula(value) : String(value)
  return `"${stringValue.replace(/\r\n|\r/g, '\n').replace(/"/g, '""')}"`
}

export function createIdeasCsv({
  ideas,
  getStatus,
  getGroup,
  getSprintWeeks,
  getSprintAssignment,
  statusHistory = {},
  activityLog = {},
}) {
  const helpers = { getStatus, getGroup, getSprintWeeks, getSprintAssignment, statusHistory, activityLog }
  const rows = [
    COLUMNS.map(([heading]) => escapeCsvCell(heading)).join(','),
    ...[...ideas]
      .sort((a, b) => a.id - b.id)
      .map(idea => COLUMNS.map(([, getValue]) => escapeCsvCell(getValue({ idea, ...helpers }))).join(',')),
  ]
  return rows.join('\r\n')
}

const dateStamp = date => formatExportDate(date).replaceAll('/', '-')

export function downloadIdeasCsv(exportData, date = new Date()) {
  const csv = createIdeasCsv(exportData)
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ideaflow-ideas-${dateStamp(date)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
