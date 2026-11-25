import { forwardRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import type { LinkItem, Rating } from '../types'
import { StarRating } from './StarRating'
import { LinkThumbnail } from './LinkThumbnail'
import { LinkNotes } from './LinkNotes'
import { Icon, hostOf, timeAgo } from './ui'

interface Props {
  link: LinkItem
  path: string[]
  onRate: (r: Rating) => void
  onEdit: () => void
  onDelete: () => void
  /** Saving / error text for this card's requests. */
  status?: ReactNode
}

export const LinkCard = forwardRef<HTMLElement, Props>(function LinkCard({ link, path, onRate, onEdit, onDelete, status }, ref) {
  const featured = link.rating === 5
  const added = new Date(link.createdAt)
  return (
    <motion.article
      ref={ref}
      layout
      className={`card ${featured ? 'card--featured' : ''}`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <LinkThumbnail link={link} />

      <div className="card__body">
        <header className="card__head">
          <h3 className="card__title">{link.title}</h3>
          {featured && (
            <motion.span className="chip" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <Icon name="spark" size={12} /> Top pick
            </motion.span>
          )}
          <span className="card__tools">
            <button type="button" title="Edit link" onClick={onEdit}>
              <Icon name="edit" size={15} />
            </button>
            <button type="button" title="Delete link" onClick={onDelete}>
              <Icon name="trash" size={15} />
            </button>
          </span>
        </header>
        {link.description && <p className="card__desc">{link.description}</p>}
        <LinkNotes html={link.notes} className="card__notes" />

        <div className="card__rating">
          <StarRating value={link.rating} onChange={onRate} />
        </div>
        {status && <div className="card__status">{status}</div>}
      </div>

      <div className="card__divider" />

      <div className="card__body card__body--tight">
        <a className={`btn ${featured ? 'btn--primary' : 'btn--ghost'} btn--block mono`} href={link.url} target="_blank" rel="noreferrer">
          Open link <Icon name="arrow" size={14} />
        </a>
        {path.length > 0 && (
          <div className="card__path">
            <Icon name="folder" size={14} />
            {path.join(' / ')}
          </div>
        )}
      </div>

      <footer className="card__foot">
        <span title={link.url}>
          <Icon name="globe" size={14} /> {hostOf(link.url)}
        </span>
        <time dateTime={link.createdAt} title={`Added ${added.toLocaleString()}`}>
          <Icon name="clock" size={14} /> {timeAgo(link.createdAt)}
        </time>
      </footer>
    </motion.article>
  )
})
