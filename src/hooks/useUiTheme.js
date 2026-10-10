import { safeStorage, scopedKey } from '../lib/storage.js'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ideas-ui-theme-v3'
const LEGACY_KEY = 'ideas-ui-theme-v2'
const LAYOUT_KEY = 'ideas-app-layout-v1'
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
  obsidian: {
    key: 'obsidian',
    label: 'Obsidian',
    short: 'Obsidian',
    description: 'Technical console — Blueprint by day, Obsidian at night',
    swatches: ['#090b0e', '#5ad9e8', '#245fca'],
  },
}

export const UI_THEME_ORDER = ['glass', 'calm', 'aurora', 'obsidian']

export const nextUiTheme = theme => {
  const index = UI_THEME_ORDER.indexOf(theme)
  return UI_THEME_ORDER[(index + 1) % UI_THEME_ORDER.length]
}

/**
 * The Console layout used to carry its own palette, so anyone using it had no
 * theme preference to migrate — only a layout choice that implied one. Move
 * those users onto the Obsidian theme rather than dropping them into Glass.
 */
function readInitialTheme(account) {
  const saved = safeStorage.readChoice(scopedKey(STORAGE_KEY, account), UI_THEME_ORDER, safeStorage.readChoice(STORAGE_KEY, UI_THEME_ORDER, null))
  if (UI_THEME_ORDER.includes(saved)) return saved

  if (safeStorage.readChoice(scopedKey(LAYOUT_KEY, account), ['original', 'obsidian'], safeStorage.read(LAYOUT_KEY)) === 'obsidian') return 'obsidian'

  const legacy = safeStorage.read(LEGACY_KEY)
  return UI_THEME_ORDER.includes(legacy) ? legacy : DEFAULT_THEME
}

export function useUiTheme(account) {
  const [theme, setTheme] = useState(() => readInitialTheme(account))

  useEffect(() => {
    document.documentElement.dataset.uiTheme = theme
    safeStorage.write(scopedKey(STORAGE_KEY, account), theme)
  }, [theme, account])

  return { theme, setTheme }
}
