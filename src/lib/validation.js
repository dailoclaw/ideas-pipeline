export const TIMES = ['1w', '1-2w', '2-4w']
export const PLATFORMS = ['html', 'pay', 'hub']
export const STATUSES = ['idea', 'researching', 'ready', 'building', 'done', 'shelved']
export const GROUP_KEYS = ['pay', 'awards', 'registers', 'intel', 'workforce', 'lifecycle', 'infra']
export const TEXT_LIMITS = { name: 200, pitch: 10000, target: 10000, pain: 10000, win: 10000, notes: 100000 }
export function validateText(value, field, trim = true) {
  if (typeof value !== 'string') throw new Error(`${field} must be text.`)
  const text = trim ? value.trim() : value
  if (text.length > TEXT_LIMITS[field]) throw new Error(`${field} exceeds ${TEXT_LIMITS[field]} characters.`)
  return text
}
export function validateChoice(value, choices, label) {
  if (!choices.includes(value)) throw new Error(`Choose a valid ${label}.`)
  return value
}
export function validateIdeaFields(fields, partial = false) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Invalid idea fields.')
  const allowed = [...Object.keys(TEXT_LIMITS), 'time', 'plat', 'mvp']
  if (Object.keys(fields).some(key => !allowed.includes(key))) throw new Error('Unsupported idea field.')
  const result = {}
  for (const [field, value] of Object.entries(fields)) {
    if (field in TEXT_LIMITS) {
      result[field] = validateText(value, field, field !== 'notes')
      if (['name', 'pitch'].includes(field) && !result[field]) throw new Error(`${field} is required.`)
    } else if (field === 'time') result.time = validateChoice(value, TIMES, 'build time')
    else if (field === 'plat') result.plat = validateChoice(value, PLATFORMS, 'platform')
    else {
      if (!Array.isArray(value) || value.length > 100 || value.some(item => typeof item !== 'string' || item.length > 2000)) throw new Error('MVP must contain at most 100 text steps, each up to 2000 characters.')
      result.mvp = value.map(item => item.trim()).filter(Boolean)
    }
  }
  if (!partial) {
    for (const key of ['name', 'pitch']) if (!result[key]) throw new Error(`${key} is required.`)
    result.time ??= '1-2w'; result.plat ??= 'html'
  }
  return result
}
export function validSprintWeek(week) { return Number.isInteger(week) && week >= 1 && week <= 8 }
