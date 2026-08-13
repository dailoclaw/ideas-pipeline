const PATHS = {
  layout: <><rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="7" rx="2"/><rect x="14" y="15" width="7" height="5" rx="2"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M18 6l3-3M17 3h4v4"/></>,
  bolt: <path d="M13 2 4.5 13h6l-1 9L19.5 9h-6L13 2Z"/>,
  groups: <><rect x="3" y="4" width="8" height="7" rx="2"/><rect x="13" y="4" width="8" height="7" rx="2"/><rect x="3" y="13" width="8" height="7" rx="2"/><rect x="13" y="13" width="8" height="7" rx="2"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  activity: <><path d="M3 12h4l2.3-6 4.2 12 2.2-6H21"/></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-2.91 1.21V21h-4v-.08a1.7 1.7 0 0 0-2.92-1.18l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.08 14H3v-4h.08a1.7 1.7 0 0 0 1.18-2.92l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 2.92 1.18l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  check: <path d="m5 12 4 4L19 7"/>,
  circleCheck: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/></>,
  lightbulb: <><path d="M9 18h6M10 22h4"/><path d="M8.2 14.5A7 7 0 1 1 15.8 14.5c-.9.7-.8 1.5-.8 2.5H9c0-1 .1-1.8-.8-2.5Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  hammer: <><path d="m14 5 5 5M11 8l5-5 5 5-5 5M3 21l9-9"/></>,
  archive: <><path d="M4 7v13h16V7M3 3h18v4H3zM9 11h6"/></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9L12 3Z"/>,
  starFilled: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9L12 3Z" fill="currentColor"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  blocks: <><path d="m12 2 4 2.3v4.5L12 11 8 8.8V4.3L12 2ZM6 13l4 2.3v4.5L6 22l-4-2.2v-4.5L6 13ZM18 13l4 2.3v4.5L18 22l-4-2.2v-4.5L18 13Z"/></>,
  alert: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.5v.1"/></>,
  sparkles: <><path d="m12 3 1.1 3.2L16 7.5l-2.9 1.3L12 12l-1.1-3.2L8 7.5l2.9-1.3L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 12l.8 2.2L22 15l-2.2.8L19 18l-.8-2.2L16 15l2.2-.8L19 12Z"/></>,
  skipForward: <><path d="m5 5 9 7-9 7V5ZM18 5v14"/></>,
  edit: <><path d="m4 20 4.2-1 10.7-10.7-3.2-3.2L5 15.8 4 20Z"/><path d="m13.8 7 3.2 3.2"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
  chevronDown: <path d="m7 10 5 5 5-5"/>,
  chevronRight: <path d="m9 6 6 6-6 6"/>,
  chevronLeft: <path d="m15 6-6 6 6 6"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>,
  coins: <><ellipse cx="9" cy="6" rx="5" ry="2.5"/><path d="M4 6v4c0 1.4 2.2 2.5 5 2.5S14 11.4 14 10V6M4 10v4c0 1.4 2.2 2.5 5 2.5 1 0 2-.2 2.8-.5"/><path d="M14 11.5c3.3 0 6 1.1 6 2.5s-2.7 2.5-6 2.5-6-1.1-6-2.5M8 14v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/></>,
  award: <><circle cx="12" cy="8" r="5"/><path d="m9 12-2 9 5-3 5 3-2-9"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/></>,
  folderChart: <><path d="M3 7h7l2-3h9v16H3V7Z"/><path d="M8 17v-3M12 17v-6M16 17v-4"/></>,
  network: <><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M7.2 16.7 12 11.5l4.8 5.2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  wrench: <path d="M14 6.5a5 5 0 0 0-6.7 6.2L3 17l4 4 4.3-4.3a5 5 0 0 0 6.2-6.7l-3 3-3.5-3.5 3-3Z"/>,
  building: <><path d="M4 21V7l8-4v18M12 9h8v12M7 9h2M7 13h2M7 17h2M15 13h2M15 17h2M2 21h20"/></>,
  loader: <><path d="M21 12a9 9 0 0 1-9 9"/><path d="M3 12a9 9 0 0 1 9-9"/></>,
}

export default function Icon({ name, size = 18, className = '', label }) {
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
    >
      {label && <title>{label}</title>}
      {PATHS[name] || PATHS.lightbulb}
    </svg>
  )
}
