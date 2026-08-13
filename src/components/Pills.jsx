import { scoreDimensions, scoreIdea } from '../lib/scoring'
import Icon from './Icon'

const TIME_STYLES = {
  '1w':   'bg-green-100 text-green-700 border border-green-300',
  '1-2w': 'bg-blue-100 text-blue-700 border border-blue-300',
  '2-4w': 'bg-amber-100 text-amber-700 border border-amber-300',
}
const PLAT_STYLES = {
  html: 'bg-violet-100 text-violet-700 border border-violet-300',
  pay:  'bg-pink-100 text-pink-700 border border-pink-300',
  hub:  'bg-cyan-100 text-cyan-700 border border-cyan-300',
}
const TIME_LABELS = { '1w': '1 wk', '1-2w': '1–2 wks', '2-4w': '2–4 wks' }
export const TIME_ICONS = { '1w': 'bolt', '1-2w': 'clock', '2-4w': 'blocks' }
export const STATUS_ICONS = { idea: 'lightbulb', researching: 'search', ready: 'circleCheck', building: 'hammer', done: 'check', shelved: 'archive' }
const PLAT_LABELS = { html: 'HTML', pay: 'Pay', hub: 'Hub' }

export function TimePill({ time }) {
  return (
    <span className={`icon-pill inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${TIME_STYLES[time] || ''}`}>
      <Icon name={TIME_ICONS[time] || 'clock'} size={11} />
      {TIME_LABELS[time] || time}
    </span>
  )
}

export function PlatPill({ plat }) {
  return (
    <span className={`inline-block text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${PLAT_STYLES[plat] || 'bg-gray-100 text-gray-600'}`}>
      {PLAT_LABELS[plat] || plat}
    </span>
  )
}

export function StatusBadge({ status }) {
  const styles = {
    idea:     'bg-gray-100 text-gray-500',
    researching: 'bg-cyan-100 text-cyan-700',
    ready:    'bg-green-100 text-green-700',
    building: 'bg-blue-100 text-blue-700',
    done:     'bg-violet-100 text-violet-700',
    shelved:  'bg-amber-100 text-amber-700',
  }
  const labels = {
    idea: 'Idea', researching: 'Researching', ready: 'Ready', building: 'Building', done: 'Done', shelved: 'Shelved'
  }
  return (
    <span className={`icon-pill inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full ${styles[status] || ''}`}>
      <Icon name={STATUS_ICONS[status] || 'circleCheck'} size={11} />
      {labels[status] || status}
    </span>
  )
}

export function ScoreBadge({ idea }) {
  const score = scoreIdea(idea)
  const d = scoreDimensions(idea)
  return (
    <span className="score-badge relative inline-block text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 cursor-default ml-1 align-middle">
      S:{score}
      <span className="score-tip">
        <div className="flex justify-between gap-3"><span>Effort</span><span>{d.effort}</span></div>
        <div className="flex justify-between gap-3"><span>Platform</span><span>{d.platform}</span></div>
        <div className="flex justify-between gap-3"><span>MVP depth</span><span>{d.mvp}</span></div>
        <div className="flex justify-between gap-3"><span>Novelty</span><span>{d.novelty}</span></div>
        <div className="flex justify-between gap-3"><span>Pain</span><span>{d.pain}</span></div>
        <div className="flex justify-between gap-3 border-t border-white/20 mt-1 pt-1 font-bold text-white"><span>Total</span><span>{score}</span></div>
      </span>
    </span>
  )
}
