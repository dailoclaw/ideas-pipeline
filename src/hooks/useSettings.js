import { useState, useEffect } from 'react'

const FONT_SIZES = {
  default: 16,
  large:   19,
  xl:      22,
}

export function useSettings() {
  const [fontSize, setFontSizeKey] = useState(
    () => localStorage.getItem('ideas-font-size') || 'default'
  )

  useEffect(() => {
    // Remove any lingering zoom
    document.documentElement.style.zoom = ''
    const px = FONT_SIZES[fontSize] || 16
    document.documentElement.style.fontSize = `${px}px`
    localStorage.setItem('ideas-font-size', fontSize)
  }, [fontSize])

  return { fontSize, setFontSizeKey }
}
