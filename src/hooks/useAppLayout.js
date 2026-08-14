import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ideas-app-layout-v1'

const APP_LAYOUTS = {
  original: {
    key: 'original',
    label: 'Original',
    description: 'The current IdeaFlow workspace',
  },
  obsidian: {
    key: 'obsidian',
    label: 'Obsidian Console',
    description: 'A focused, dark operational console',
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
