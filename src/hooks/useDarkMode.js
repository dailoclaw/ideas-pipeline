import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('ideas-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('ideas-theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark(d => !d)]
}
