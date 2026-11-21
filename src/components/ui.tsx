import type { ReactNode } from 'react'
import { motion } from 'motion/react'

/** The "/ WHAT /" eyebrow label from the reference. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="eyebrow mono">
      <span>/</span> {children} <span>/</span>
    </div>
  )
}

/** Dashed annotation frame with orange corner nodes. */
export function Annotated({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`annotated ${className}`}>
      <i className="annotated__dot annotated__dot--tl" />
      <i className="annotated__dot annotated__dot--tr" />
      <i className="annotated__dot annotated__dot--bl" />
      <i className="annotated__dot annotated__dot--br" />
      {children}
    </div>
  )
}

/** Two-state switch styled after the Monthly / Yearly toggle. */
export function Toggle<T extends string>({
  left,
  right,
  value,
  onChange,
}: {
  left: { value: T; label: string }
  right: { value: T; label: string }
  value: T
  onChange: (v: T) => void
}) {
  const isRight = value === right.value
  return (
    <div className="toggle">
      <button type="button" className={`toggle__label ${!isRight ? 'is-active' : ''}`} onClick={() => onChange(left.value)}>
        {left.label}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={isRight}
        aria-label={`Sort: ${isRight ? right.label : left.label}`}
        className="toggle__track"
        onClick={() => onChange(isRight ? left.value : right.value)}
        style={{ justifyContent: isRight ? 'flex-end' : 'flex-start' }}
      >
        <motion.span layout className="toggle__knob" transition={{ type: 'spring', stiffness: 700, damping: 32 }} />
      </button>
      <button type="button" className={`toggle__label ${isRight ? 'is-active' : ''}`} onClick={() => onChange(right.value)}>
        {right.label}
      </button>
    </div>
  )
}

const paths = {
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  chevron: 'M9 6l6 6-6 6',
  arrow: 'M7 17L17 7M8 7h9v9',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  close: 'M6 6l12 12M18 6L6 18',
  spark: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4',
  check: 'M5 12l5 5 9-10',
  alert: 'M12 3.5l9 16H3l9-16zM12 10v4.5M12 17.25v.01',
}

export function Icon({ name, size = 16 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const units: [number, string][] = [
    [60, 'm'],
    [24, 'h'],
    [7, 'd'],
    [4.35, 'w'],
    [12, 'mo'],
    [Infinity, 'y'],
  ]
  let n = s / 60
  for (const [size, label] of units) {
    if (n < size) return `${Math.floor(n)}${label} ago`
    n /= size
  }
  return ''
}
