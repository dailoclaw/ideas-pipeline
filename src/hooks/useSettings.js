import { useState, useEffect } from 'react'

const FONT_SIZES = {
  default: 15,
  large:   17,
  xl:      19,
}

export function useSettings() {
  const [fontSize, setFontSizeKey] = useState(
    () => localStorage.getItem('ideas-font-size') || 'default'
  )

  useEffect(() => {
    const px = FONT_SIZES[fontSize] || 15
    document.documentElement.style.fontSize = `${px}px`
    localStorage.setItem('ideas-font-size', fontSize)
  }, [fontSize])

  return { fontSize, setFontSizeKey, FONT_SIZES }
}
