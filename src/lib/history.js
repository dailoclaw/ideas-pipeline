export const DECISION_TYPES = new Set(['status_changed','priority_changed','score_adjusted','group_changed','sprint_scheduled'])
export const localDayKey = value => {
  const date = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export const eventDate = value => new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
export const isPastEvent = (event, now = Date.now()) => typeof event?.occurredAt === 'string' && Number.isFinite(eventDate(event.occurredAt).getTime()) && eventDate(event.occurredAt).getTime() <= now
export function mergeTimeline(ideaId, activity, history, now = Date.now()) {
  const rich = activity.filter(event => isPastEvent(event,now)), matched = new Set()
  const legacy = history.map((item,index) => ({id:`legacy-${ideaId}-${item.id ?? index}`,ideaId,type:'status_changed',
    payload:{from:index ? history[index-1].status : null,to:item.status},occurredAt:item.date,actor:'Legacy status record',dateOnly:true}))
    .filter(event => {
      if (!isPastEvent(event,now)) return false
      const index = rich.findIndex((row,index) => !matched.has(index) && row.type === 'status_changed' && row.payload?.to === event.payload.to && String(row.occurredAt).slice(0,10) === String(event.occurredAt).slice(0,10))
      if (index < 0) return true
      matched.add(index); return false
    })
  return [...rich,...legacy].sort((a,b)=>eventDate(b.occurredAt)-eventDate(a.occurredAt))
}
export function decisionPeriods(events, now = new Date()) {
  const today = new Date(now); today.setHours(0,0,0,0)
  const recentStart = new Date(today); recentStart.setDate(today.getDate()-29)
  const priorStart = new Date(recentStart); priorStart.setDate(recentStart.getDate()-30)
  const decisions = events.filter(event=>DECISION_TYPES.has(event.type) && isPastEvent(event,now.getTime()))
  return {recent:decisions.filter(e=>eventDate(e.occurredAt)>=recentStart),prior:decisions.filter(e=>eventDate(e.occurredAt)>=priorStart && eventDate(e.occurredAt)<recentStart)}
}
export function buildMomentum(events, now = new Date()) {
  const weeks = Array.from({length:6},(_,index)=>{
    const end = new Date(now); end.setDate(end.getDate()-(5-index)*7); end.setHours(23,59,59,999)
    const start = new Date(end); start.setDate(start.getDate()-6); start.setHours(0,0,0,0)
    return {start,end,label:end.toLocaleDateString(undefined,{day:'numeric',month:'short'}),count:0}
  })
  for(const event of events.filter(e=>DECISION_TYPES.has(e.type) && isPastEvent(e,now.getTime()))) {
    const week=weeks.find(w=>eventDate(event.occurredAt)>=w.start && eventDate(event.occurredAt)<=w.end)
    if(week)week.count++
  }
  return weeks
}
