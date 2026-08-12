export const GROUPS = [
  { key: 'pay',       icon: '💰', label: 'pay_modeller',              desc: 'Remuneration & pay analysis' },
  { key: 'awards',    icon: '🏆', label: 'Awards Hub & Intelligence',  desc: 'Award interpretation & rates' },
  { key: 'registers', icon: '📋', label: 'HR Registers',               desc: 'Compliance registers & logs' },
  { key: 'intel',     icon: '📁', label: 'HR Intelligence',            desc: 'Dashboards & analytics' },
  { key: 'workforce', icon: '🗻', label: 'Workforce Planning',          desc: 'Org design & succession' },
  { key: 'lifecycle', icon: '📅', label: 'HR Lifecycle',               desc: 'End-to-end employee journey' },
  { key: 'infra',     icon: '🔧', label: 'Infrastructure & Utility',    desc: 'Shared patterns & tools' },
]

export const GROUP_MAP = Object.fromEntries(GROUPS.map(g => [g.key, g]))
