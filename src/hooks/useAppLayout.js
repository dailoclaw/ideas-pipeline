import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ideas-app-layout-v1'

const APP_LAYOUTS = {
  original: {
    key: 'original',
    label: 'Tabbed',
    description: 'Top header with a bottom tab bar',
  },
  // Stored value stays 'obsidian' so existing preferences keep working; the
  // palette that name used to imply is now the separate Obsidian theme.
  obsidian: {
    key: 'obsidian',
    label: 'Console',
    description: 'Sidebar navigation with a dense workspace',
  },
}

export function useAppLayout() {
  const [appLayout, setAppLayout] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && APP_LAYOUTS[saved] ? saved : 'original'
  })

  useEffect(() => {
    document.documentElement.dataset.appLayout = appLayout
    localStorage.setItem(STORAGE_KEY, appLayout)
  }, [appLayout])

  return { appLayout, setAppLayout }
}
