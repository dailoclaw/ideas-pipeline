import { useEffect } from 'react'

const TARGETS = '.idea-card, .strategy-row, .pulse-idea-row, .pulse-status-grid > button, .au-spot'

/**
 * Pointer-tracked highlight. One delegated listener writes --mx / --my onto
 * whichever surface the pointer is over; CSS decides whether to draw anything.
 * Only mounted for the theme that uses it, and throttled to one frame.
 */
export function useSpotlight(enabled) {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let frame = 0
    let pending = null
    let last = null

    const paint = () => {
      frame = 0
      if (!pending) return
      const { el, x, y } = pending
      el.style.setProperty('--mx', `${x}px`)
      el.style.setProperty('--my', `${y}px`)
    }

    const onMove = event => {
      const el = event.target.closest?.(TARGETS)
      if (el !== last) {
        if (last) { last.style.removeProperty('--mx'); last.style.removeProperty('--my') }
        last = el
      }
      if (!el) { pending = null; return }
      const rect = el.getBoundingClientRect()
      pending = { el, x: event.clientX - rect.left, y: event.clientY - rect.top }
      if (!frame) frame = requestAnimationFrame(paint)
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
      if (last) { last.style.removeProperty('--mx'); last.style.removeProperty('--my') }
    }
  }, [enabled])
}
