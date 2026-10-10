export const STATUS_LABELS = { idea: 'Idea', researching: 'Researching', ready: 'Ready', building: 'Building', done: 'Done', shelved: 'Shelved' }
export const STATUSES = Object.keys(STATUS_LABELS)
export const STATUS_OPTIONS = STATUSES.map(value => ({ value, label: STATUS_LABELS[value] }))
