import { useLayoutEffect } from 'react'

/**
 * Positions a single moving "pill" behind the active button of a segmented
 * control by measuring it and writing --pill-x / --pill-w onto the container.
 * The pill itself is a pseudo-element owned by CSS, so themes that do not want
 * the treatment simply ignore the variables.
 */
export function useMorphPill(ref, activeKey, selector = '.is-active') {
  useLayoutEffect(() => {
    const host = ref.current
    if (!host) return

    const measure = () => {
      const active = host.querySelector(selector)
      if (!active) return
      host.style.setProperty('--pill-x', `${active.offsetLeft}px`)
      host.style.setProperty('--pill-w', `${active.offsetWidth}px`)
      host.style.setProperty('--pill-h', `${active.offsetHeight}px`)
      host.style.setProperty('--pill-y', `${active.offsetTop}px`)
    }

    // The pill must appear in place, not grow into it — CSS only animates once
    // the container is marked ready, which happens a frame after first measure.
    if (!host.dataset.pillReady) host.dataset.pillReady = '0'
    measure()
    const raf = requestAnimationFrame(() => {
      measure()
      host.dataset.pillReady = '1'
    })

    const observer = new ResizeObserver(measure)
    observer.observe(host)
    window.addEventListener('resize', measure)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, activeKey, selector])
}
