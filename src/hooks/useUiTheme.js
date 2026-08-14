import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ideas-ui-theme-v2'
const DEFAULT_THEME = 'glass'

const UI_THEMES = {
  calm: {
    key: 'calm',
    label: 'Calm Command',
    description: 'Quiet, spacious, operationally clear',
  },
  glass: {
    key: 'glass',
    label: 'Luminous Glass',
    description: 'Layered, optimistic, next-generation',
  },
}

export function useUiTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && UI_THEMES[saved] ? saved : DEFAULT_THEME
  })

  useEffect(() => {
    document.documentElement.dataset.uiTheme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return { theme, setTheme }
}
