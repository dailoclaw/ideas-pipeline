import { useEffect, useId, useState } from 'react'
import { scoreDimensions, scoreIdea, gradeFromScore, STATUS_LABELS } from '../lib/scoring'
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
const own = (table, key, fallback) => Object.hasOwn(table, key) ? table[key] : fallback
const TIME_LABELS = { '1w': '1 wk', '1-2w': '1–2 wks', '2-4w': '2–4 wks' }
export const TIME_ICONS = { '1w': 'bolt', '1-2w': 'clock', '2-4w': 'blocks' }
export const STATUS_ICONS = { idea: 'lightbulb', researching: 'search', ready: 'circleCheck', building: 'hammer', done: 'check', shelved: 'archive' }
const PLAT_LABELS = { html: 'HTML', pay: 'Pay', hub: 'Hub' }

/** The pipeline, in order. Position in this list is what the rail encodes. */
export const RAIL_STAGES = ['idea', 'researching', 'ready', 'building', 'done']

export function TimePill({ time }) {
  return (
    <span className={`icon-pill inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${own(TIME_STYLES, time, 'bg-gray-100 text-gray-600')}`}>
      <Icon name={own(TIME_ICONS, time, 'clock')} size={11} />
      {Object.hasOwn(TIME_LABELS, time) ? TIME_LABELS[time] : `Unknown time: ${time || 'missing'}`}
    </span>
  )
}

export function PlatPill({ plat }) {
  return (
    <span className={`inline-block text-[0.625rem] font-bold px-2 py-0.5 rounded-full ${own(PLAT_STYLES, plat, 'bg-gray-100 text-gray-600')}`}>
      {Object.hasOwn(PLAT_LABELS, plat) ? PLAT_LABELS[plat] : `Unknown platform: ${plat || 'missing'}`}
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
  return (
    <span className={`icon-pill inline-flex items-center gap-1 text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full ${own(styles, status, 'bg-gray-100 text-gray-600')}`}>
      <Icon name={own(STATUS_ICONS, status, 'circleCheck')} size={11} />
      {own(STATUS_LABELS, status, `Unknown status: ${status || 'missing'}`)}
    </span>
  )
}

/**
 * Status carried by position rather than by hue: a five-segment rail filled to
 * the current pipeline stage. Readable in greyscale and under colour blindness.
 * Rendered everywhere, drawn only by themes that ask for it.
 */
export function StatusRail({ status }) {
  const index = RAIL_STAGES.indexOf(status)
  const shelved = status === 'shelved'
  const label = shelved
    ? 'Shelved'
    : index < 0 ? `Unknown status: ${status || 'missing'}` : `Stage ${index + 1} of ${RAIL_STAGES.length}: ${STATUS_LABELS[status]}`

  return (
    <span className="au-rail" data-status={status} role="img" aria-label={label}>
      {RAIL_STAGES.map((stage, n) => (
        <i
          key={stage}
          className={shelved ? 'is-shelved' : n < index ? 'is-filled' : n === index ? 'is-current' : ''}
        />
      ))}
    </span>
  )
}

export function ScoreBadge({ idea }) {
  const [expanded, setExpanded] = useState(false)
  const tipId = useId()
  const [tipPosition, setTipPosition] = useState({})
  useEffect(() => {
    if (!expanded) return
    const close = event => { if (!(event.target instanceof Node && document.getElementById(tipId)?.contains(event.target))) setExpanded(false) }
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { document.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [expanded, tipId])
  const score = scoreIdea(idea)
  const grade = gradeFromScore(score)
  const d = scoreDimensions(idea)
  return (
    <span
      className="score-badge relative inline-block text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 cursor-default ml-1 align-middle"
      data-grade={grade}
    >
      <button type="button" className="score-explanation-trigger" aria-label={`Explain score ${score}`} aria-expanded={expanded} aria-controls={tipId} aria-describedby={expanded ? tipId : undefined} onClick={e => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const width = Math.min(260, innerWidth - 16); setTipPosition({ position: 'fixed', left: Math.max(8, Math.min(rect.left, innerWidth - width - 8)), top: Math.max(8, Math.min(rect.bottom + 6, innerHeight - 260)), width }); setExpanded(!expanded) }} onKeyDown={e => { if (e.key === 'Escape' && expanded) { e.preventDefault(); e.stopPropagation(); setExpanded(false) } }}>
      {/* Drawn only where the theme opts in; the flat pill below is the default. */}
      <span className="au-donut" style={{ '--dp': Math.min(100, score) }} aria-hidden="true">
        <i className="au-donut__ring" />
        <b>{score}</b>
      </span>
      <span className="score-badge__flat">S:{score}</span>
      </button>
      <span id={tipId} className="score-tip" style={tipPosition} hidden={!expanded}>
        <span className="flex justify-between gap-3"><span>Effort</span><span>{d.effort}</span></span>
        <span className="flex justify-between gap-3"><span>Platform</span><span>{d.platform}</span></span>
        <span className="flex justify-between gap-3"><span>MVP depth</span><span>{d.mvp}</span></span>
        <span className="flex justify-between gap-3"><span>Novelty</span><span>{d.novelty}</span></span>
        <span className="flex justify-between gap-3"><span>Pain</span><span>{d.pain}</span></span>
        <span className="flex justify-between gap-3"><span>Rounded base</span><span>{d.base}</span></span>
        <span className="flex justify-between gap-3"><span>Manual adjustment</span><span>{d.adjustment}</span></span>
        {d.floor > 0 && <span className="flex justify-between gap-3"><span>Minimum score correction</span><span>{d.floor}</span></span>}
        <span className="flex justify-between gap-3 border-t border-white/20 mt-1 pt-1 font-bold text-white"><span>Total</span><span>{score}</span></span>
      </span>
    </span>
  )
}
