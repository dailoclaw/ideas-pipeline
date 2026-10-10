import { safeStorage, scopedKey } from '../lib/storage.js'
import { useState, useEffect } from 'react'

export function useDarkMode(account) {
  const [dark, setDark] = useState(() => {
    const saved = safeStorage.readChoice(scopedKey('ideas-theme', account), ['dark','light'], safeStorage.readChoice('ideas-theme', ['dark','light'], null))
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    safeStorage.write(scopedKey('ideas-theme', account), dark ? 'dark' : 'light')
  }, [dark, account])

  return [dark, () => setDark(d => !d)]
}
