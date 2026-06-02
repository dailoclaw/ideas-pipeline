import { useState, useEffect } from 'react'

const ZOOM_LEVELS = {
  default: 1,
  large:   1.15,
  xl:      1.30,
}

export function useSettings() {
  const [fontSize, setFontSizeKey] = useState(
    () => localStorage.getItem('ideas-font-size') || 'default'
  )

  useEffect(() => {
    const zoom = ZOOM_LEVELS[fontSize] || 1
    // zoom on <html> scales everything uniformly — px values, rem, padding, borders
    document.documentElement.style.zoom = zoom
    localStorage.setItem('ideas-font-size', fontSize)
  }, [fontSize])

  return { fontSize, setFontSizeKey }
}
