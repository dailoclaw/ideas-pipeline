import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogFocus(ref, onClose, active = true) {
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!active || !ref.current) return undefined

    const dialog = ref.current
    const previousFocus = document.activeElement
    const focusLabel = previousFocus?.getAttribute?.('aria-label')
    const isolated = []
    for (let node = dialog; node?.parentElement; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || !(sibling instanceof HTMLElement)) continue
        isolated.push([sibling, sibling.inert])
        sibling.inert = true
      }
      if (node.parentElement === document.body) break
    }
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const containFocus = event => {
      if (!dialog.contains(event.target)) dialog.focus({ preventScroll: true })
    }
    document.addEventListener('focusin', containFocus)
    const getFocusable = () => [...dialog.querySelectorAll(FOCUSABLE)]
      .filter(element => element.getClientRects().length && element.getAttribute('aria-hidden') !== 'true')

    const frame = requestAnimationFrame(() => dialog.focus({ preventScroll: true }))

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', containFocus)
      isolated.reverse().forEach(([element, inert]) => { element.inert = inert })
      document.body.style.overflow = oldOverflow
      const returnFocus = previousFocus instanceof HTMLElement && previousFocus.isConnected
        ? previousFocus
        : focusLabel && [...document.querySelectorAll('[aria-label]')].find(el => el.getAttribute('aria-label') === focusLabel && !el.closest('[inert]'))
      returnFocus?.focus({ preventScroll: true })
    }
  }, [active, ref])
}
