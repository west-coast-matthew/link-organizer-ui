import { useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import type { Rating } from '../types'

interface Props {
  value: Rating
  /** Omit to render read-only. */
  onChange?: (rating: Rating) => void
  size?: number
  showLabel?: boolean
}

const STARS = [1, 2, 3, 4, 5] as const

function StarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8l2.75 5.82 6.35.8-4.67 4.38 1.2 6.29L12 17.03l-5.63 3.06 1.2-6.29L2.9 9.42l6.35-.8z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * 1–5 star rating. 0 = unrated.
 * Click a star to set it, click the current star again to clear.
 * Keyboard: ←/→ (or ↓/↑) step the value, 0–5 jump directly, Backspace clears.
 */
export function StarRating({ value, onChange, size = 18, showLabel = true }: Props) {
  const [hover, setHover] = useState<Rating>(0)
  const interactive = !!onChange
  const shown = hover || value

  const set = (r: Rating) => onChange?.(r)

  const onKeyDown = (e: KeyboardEvent) => {
    if (!interactive) return
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }
    if (e.key in step) {
      e.preventDefault()
      set(Math.max(0, Math.min(5, value + step[e.key])) as Rating)
    } else if (/^[0-5]$/.test(e.key)) {
      e.preventDefault()
      set(Number(e.key) as Rating)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      set(0)
    }
  }

  return (
    <div className={`stars ${interactive ? 'stars--interactive' : ''}`}>
      <div
        className="stars__row"
        role={interactive ? 'slider' : 'img'}
        aria-label={interactive ? 'Rating' : value ? `Rated ${value} of 5` : 'Not rated'}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? 5 : undefined}
        aria-valuenow={interactive ? value : undefined}
        aria-valuetext={interactive ? (value ? `${value} of 5 stars` : 'Not rated') : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(0)}
      >
        {STARS.map((n, i) => {
          const filled = n <= shown
          const preview = hover > 0 && n <= hover && n > value
          return (
            <motion.span
              key={n}
              className={`star ${filled ? 'star--on' : ''} ${preview ? 'star--preview' : ''}`}
              onMouseEnter={() => interactive && setHover(n)}
              onClick={(e) => {
                if (!interactive) return
                e.stopPropagation()
                set(n === value ? 0 : n)
                setHover(0)
              }}
              whileHover={interactive ? { scale: 1.22, rotate: -8 } : undefined}
              whileTap={interactive ? { scale: 0.8 } : undefined}
              animate={n <= value ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 14, delay: n <= value ? i * 0.035 : 0 }}
            >
              <StarIcon size={size} />
            </motion.span>
          )
        })}
      </div>
      {showLabel && (
        <span className="stars__label mono">{value ? `${value}/5` : 'Unrated'}</span>
      )}
    </div>
  )
}
