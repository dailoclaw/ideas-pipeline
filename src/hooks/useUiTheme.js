import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ideas-ui-theme-v2'
const DEFAULT_THEME = 'glass'

export const UI_THEMES = {
  calm: {
    key: 'calm',
    label: 'Calm Command',
    short: 'Calm',
    description: 'Quiet, spacious, operationally clear',
    swatches: ['#153a37', '#4e9189', '#c49a44'],
  },
  glass: {
    key: 'glass',
    label: 'Luminous Glass',
    short: 'Glass',
    description: 'Layered, optimistic, next-generation',
    swatches: ['#11162b', '#8b7cff', '#64e7d1'],
  },
  aurora: {
    key: 'aurora',
    label: 'Aurora Mist',
    short: 'Aurora',
    description: 'Chromatic light, rings and gradient hairlines',
    swatches: ['#3D7BF7', '#29C8B0', '#F1F6FB'],
  },
}

export const UI_THEME_ORDER = ['glass', 'calm', 'aurora']

export const nextUiTheme = theme => {
  const index = UI_THEME_ORDER.indexOf(theme)
  return UI_THEME_ORDER[(index + 1) % UI_THEME_ORDER.length]
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
