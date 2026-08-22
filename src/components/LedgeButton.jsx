import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

/**
 * A primary action that becomes its own progress indicator: the label
 * cross-fades to a running state, a ledge fills along the bottom edge, then a
 * checkmark draws itself. The button never changes size, so nothing reflows.
 *
 * Themes without the treatment simply render the idle label — the run and done
 * layers are stacked in the same grid cell and hidden by CSS.
 */
export default function LedgeButton({
  onAct,
  icon,
  children,
  runLabel = 'Saving…',
  doneLabel = 'Done',
  className = '',
  ...rest
}) {
  const [state, setState] = useState('idle')
  const timer = useRef(null)
  const alive = useRef(true)

  useEffect(() => () => { alive.current = false; clearTimeout(timer.current) }, [])

  const click = async event => {
    if (state !== 'idle') return
    setState('run')
    try {
      await onAct?.(event)
    } catch {
      if (alive.current) setState('idle')
      return
    }
    if (!alive.current) return
    setState('done')
    timer.current = setTimeout(() => { if (alive.current) setState('idle') }, 1400)
  }

  return (
    <button
      {...rest}
      onClick={click}
      data-ledge={state}
      className={`au-ledge ${className}`}
      aria-live="polite"
    >
      <span className="au-ledge__face" data-face="idle">
        {icon && <Icon name={icon} size={16} />}{children}
      </span>
      <span className="au-ledge__face" data-face="run" aria-hidden={state !== 'run'}>
        {runLabel}
      </span>
      <span className="au-ledge__face" data-face="done" aria-hidden={state !== 'done'}>
        <svg className="au-ledge__check" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="m5 12.6 4.4 4.4L19 6.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {doneLabel}
      </span>
      <span className="au-ledge__fill" aria-hidden="true" />
    </button>
  )
}
