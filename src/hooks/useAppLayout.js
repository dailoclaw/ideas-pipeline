import { safeStorage, scopedKey } from '../lib/storage.js'
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

export function useAppLayout(account) {
  const [appLayout, setAppLayout] = useState(() => {
    const saved = safeStorage.readChoice(scopedKey(STORAGE_KEY, account), Object.keys(APP_LAYOUTS), safeStorage.readChoice(STORAGE_KEY, Object.keys(APP_LAYOUTS), 'original'))
    return Object.hasOwn(APP_LAYOUTS, saved) ? saved : 'original'
  })

  useEffect(() => {
    document.documentElement.dataset.appLayout = appLayout
    safeStorage.write(scopedKey(STORAGE_KEY, account), appLayout)
  }, [appLayout, account])

  return { appLayout, setAppLayout }
}
