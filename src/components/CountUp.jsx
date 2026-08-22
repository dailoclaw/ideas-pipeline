import { useEffect, useRef, useState } from 'react'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Animates a whole number toward its new value. Only the theme that asks for
 * kinetic figures gets the animation; every other theme renders the value
 * immediately, so nothing about the existing systems changes.
 */
export default function CountUp({ value, duration = 900, className }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    const animate = document.documentElement.dataset.uiTheme === 'aurora' && !reduced()
    if (!animate || from.current === value) {
      from.current = value
      setShown(value)
      return
    }

    const start = performance.now()
    const origin = from.current
    const delta = value - origin
    let frame = 0

    const tick = now => {
      const k = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      setShown(Math.round(origin + delta * eased))
      if (k < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span className={className}>{shown}</span>
}
