export const GROUPS = [
  { key: 'pay',       icon: 'coins',       label: 'pay_modeller',             desc: 'Remuneration & pay analysis' },
  { key: 'awards',    icon: 'award',       label: 'Awards Hub & Intelligence', desc: 'Award interpretation & rates' },
  { key: 'registers', icon: 'clipboard',   label: 'HR Registers',              desc: 'Compliance registers & logs' },
  { key: 'intel',     icon: 'folderChart', label: 'HR Intelligence',           desc: 'Dashboards & analytics' },
  { key: 'workforce', icon: 'network',     label: 'Workforce Planning',         desc: 'Org design & succession' },
  { key: 'lifecycle', icon: 'calendar',    label: 'HR Lifecycle',              desc: 'End-to-end employee journey' },
  { key: 'infra',     icon: 'wrench',      label: 'Infrastructure & Utility',   desc: 'Shared patterns & tools' },
]

export const GROUP_MAP = Object.fromEntries(GROUPS.map(g => [g.key, g]))
