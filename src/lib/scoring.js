const points = (table, key, fallback) => Object.hasOwn(table, key) ? table[key] : fallback
export function scoreDimensions(i) {
  const d = {
    effort: points({ '1w': 40, '1-2w': 28, '2-4w': 16 }, i.time, 16),
    platform: points({ hub: 25, html: 20, pay: 18 }, i.plat, 16),
    mvp: Math.min(20, (Array.isArray(i.mvp) ? i.mvp.filter(item => typeof item === 'string' && item.trim()).length : 0) * 2.5),
    novelty: Math.min(15, Math.floor((typeof i.win === 'string' ? i.win.length : 0) / 12)),
    pain: Math.min(5, Math.floor((typeof i.pain === 'string' ? i.pain.length : 0) / 80)),
  }
  d.base = Math.round(d.effort + d.platform + d.mvp + d.novelty + d.pain)
  d.adjustment = Number.isInteger(i.scoreAdjust) ? Math.max(-99, Math.min(99, i.scoreAdjust)) : 0
  d.floor = Math.max(0, 1 - d.base - d.adjustment)
  return d
}
export function scoreIdea(i) {
  const d = scoreDimensions(i)
  return d.base + d.adjustment + d.floor
}
// Transparent heuristic: effort is separate from the other 65 possible base points.
export function matrixQuadrant(idea) {
  if (!['1w', '1-2w', '2-4w'].includes(idea.time) || !['html', 'pay', 'hub'].includes(idea.plat)) return 'unknown'
  const d = scoreDimensions(idea)
  const highImpact = d.platform + d.mvp + d.novelty + d.pain >= 40
  return highImpact ? (idea.time === '2-4w' ? 'q2' : 'q1') : (idea.time === '2-4w' ? 'q4' : 'q3')
}

export function gradeFromScore(s) {
  if (s >= 80) return 'A'
  if (s >= 65) return 'B'
  if (s >= 50) return 'C'
  return 'D'
}

export function getBuildNext(ideas, getStatus) {
  const effortBonus = { '1w': 20, '1-2w': 8, '2-4w': 0 }
  const candidates = ideas
    .filter(i => { const s = getStatus(i); return s === 'idea' || s === 'ready' })
    .map(i => ({ idea: i, score: scoreIdea(i) + points(effortBonus, i.time, 0) + (i.isPriority ? 10000 : 0) }))
    .sort((a, b) => b.score - a.score || a.idea.id - b.idea.id)
  return candidates[0]?.idea || null
}

export function isStale(idea, getStatus) {
  if (!idea.addedAt) return false
  if (getStatus(idea) !== 'idea') return false
  return Math.floor((Date.now() - new Date(idea.addedAt).getTime()) / 86400000) >= 30
}

export function daysOld(idea) {
  if (!idea.addedAt) return 0
  return Math.floor((Date.now() - new Date(idea.addedAt).getTime()) / 86400000)
}

export function scopeIdeas(ideas, groupAssignments, groupFilter = '') {
  if (groupFilter === '__none__') return ideas.filter(idea => !groupAssignments[idea.id])
  return groupFilter ? ideas.filter(idea => groupAssignments[idea.id] === groupFilter) : ideas
}

export function sortIdeas(ideas, sort) {
  const priorityFirst = (a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0)
  if (sort === 'score') return [...ideas].sort((a, b) => priorityFirst(a, b) || scoreIdea(b) - scoreIdea(a) || a.id - b.id)
  if (sort === 'name')  return [...ideas].sort((a, b) => priorityFirst(a, b) || a.name.localeCompare(b.name) || a.id - b.id)
  if (sort === 'id')    return [...ideas].sort((a, b) => priorityFirst(a, b) || a.id - b.id)
  return ideas
}

export { STATUS_LABELS } from '../data/metadata.js'
