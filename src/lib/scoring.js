export function scoreIdea(i) {
  const effortPts = { '1w': 40, '1-2w': 28, '2-4w': 16 }[i.time] || 16
  const platPts   = { hub: 25, html: 20, pay: 18 }[i.plat] || 16
  const mvpPts    = Math.min(20, (i.mvp || []).length * 2.5)
  const noveltyPts = Math.min(15, Math.floor((i.win || '').length / 12))
  const painPts   = Math.min(5, Math.floor((i.pain || '').length / 80))
  return Math.round(effortPts + platPts + mvpPts + noveltyPts + painPts)
}

export function scoreDimensions(i) {
  return {
    effort:   { '1w': 40, '1-2w': 28, '2-4w': 16 }[i.time] || 16,
    platform: { hub: 25, html: 20, pay: 18 }[i.plat] || 16,
    mvp:      Math.min(20, (i.mvp || []).length * 2.5),
    novelty:  Math.min(15, Math.floor((i.win || '').length / 12)),
    pain:     Math.min(5, Math.floor((i.pain || '').length / 80)),
  }
}

export function gradeFromScore(s) {
  if (s >= 80) return 'A'
  if (s >= 65) return 'B'
  if (s >= 50) return 'C'
  return 'D'
}

export function getBuildNext(ideas, getStatus) {
  const effortBonus = { '1w': 20, '1-2w': 8, '2-4w': 0 }
  return ideas
    .filter(i => { const s = getStatus(i); return s === 'idea' || s === 'ready' })
    .map(i => ({ idea: i, score: scoreIdea(i) + (effortBonus[i.time] || 0) }))
    .sort((a, b) => b.score - a.score)[0]?.idea || null
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

export function sortIdeas(ideas, sort, getStatus) {
  if (sort === 'score') return [...ideas].sort((a, b) => scoreIdea(b) - scoreIdea(a))
  if (sort === 'name')  return [...ideas].sort((a, b) => a.name.localeCompare(b.name))
  if (sort === 'id')    return [...ideas].sort((a, b) => a.id - b.id)
  return ideas
}

export const TIME_LABELS = { '1w': '⚡ 1 week', '1-2w': '⏱ 1–2 wks', '2-4w': '🏗 2–4 wks' }
export const TIME_COLORS = { '1w': '#059669', '1-2w': '#2563eb', '2-4w': '#d97706' }
export const STATUS_LABELS = { idea: '💡 Idea', ready: '✅ Ready', building: '🔨 Building', done: '✅ Done', shelved: '🗄 Shelved' }
export const PLAT_LABELS = { html: 'HTML', hub: 'Hub', pay: 'Pay' }
