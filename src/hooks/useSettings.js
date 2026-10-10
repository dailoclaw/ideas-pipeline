import { safeStorage, scopedKey } from '../lib/storage.js'
import { useState, useEffect } from 'react'

const FONT_SIZES = {
  default: 16,
  large:   19,
  xl:      22,
}

export function useSettings(account) {
  const [fontSize, setFontSizeKey] = useState(
    () => safeStorage.readChoice(scopedKey('ideas-font-size', account), Object.keys(FONT_SIZES), safeStorage.readChoice('ideas-font-size', Object.keys(FONT_SIZES), 'default'))
  )

  useEffect(() => {
    // Remove any lingering zoom
    document.documentElement.style.zoom = ''
    const px = FONT_SIZES[fontSize] || 16
    document.documentElement.style.fontSize = `${px}px`
    safeStorage.write(scopedKey('ideas-font-size', account), fontSize)
  }, [fontSize, account])

  return { fontSize, setFontSizeKey }
}
