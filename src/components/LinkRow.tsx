import { forwardRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { LinkItem, Rating } from '../types'
import { StarRating } from './StarRating'
import { LinkNotes } from './LinkNotes'
import { Icon, hostOf, timeAgo } from './ui'

interface Props {
  link: LinkItem
  path: string[]
  onRate: (r: Rating) => void
  onEdit: () => void
  onDelete: () => void
  /** Saving / error text for this row's requests. */
  status?: ReactNode
}

/**
 * A link as one compact row, for list mode. Same data and actions as LinkCard,
 * without the thumbnail.
 */
export const LinkRow = forwardRef<HTMLElement, Props>(function LinkRow({ link, path, onRate, onEdit, onDelete, status }, ref) {
  const added = new Date(link.createdAt)
  const [notesOpen, setNotesOpen] = useState(false)
  return (
    <motion.article
      ref={ref}
      layout
      className={`row ${link.rating === 5 ? 'row--featured' : ''}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
    >
      <div className="row__main">
        <a className="row__title" href={link.url} target="_blank" rel="noreferrer" title={link.url}>
          {link.title}
          <Icon name="arrow" size={13} />
        </a>
        <span className="row__meta">
          <span className="row__host">{hostOf(link.url)}</span>
          {link.notes && (
            <button
              type="button"
              className={`row__notes-toggle mono ${notesOpen ? 'is-open' : ''}`}
              aria-expanded={notesOpen}
              onClick={() => setNotesOpen((o) => !o)}
            >
              Notes
              <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {link.description && <span className="row__desc">{link.description}</span>}
        </span>
      </div>

      {/* Always rendered, even when empty, so the columns line up from row to row. */}
      <span className="row__path" title={path.length ? path.join(' / ') : undefined}>
        {path.length > 0 && (
          <>
            <Icon name="folder" size={13} />
            {path.join(' / ')}
          </>
        )}
      </span>

      <span className="row__rating">
        <StarRating value={link.rating} onChange={onRate} size={14} showLabel={false} />
      </span>

      <time className="row__time" dateTime={link.createdAt} title={`Added ${added.toLocaleString()}`}>
        {timeAgo(link.createdAt)}
      </time>

      <span className="row__tools">
        <button type="button" title="Edit link" aria-label={`Edit ${link.title}`} onClick={onEdit}>
          <Icon name="edit" size={15} />
        </button>
        <button type="button" title="Delete link" aria-label={`Delete ${link.title}`} onClick={onDelete}>
          <Icon name="trash" size={15} />
        </button>
      </span>

      <AnimatePresence initial={false}>
        {notesOpen && link.notes && (
          <motion.div
            className="row__notes"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            <LinkNotes html={link.notes} />
          </motion.div>
        )}
      </AnimatePresence>

      {status && <div className="row__status">{status}</div>}
    </motion.article>
  )
})
