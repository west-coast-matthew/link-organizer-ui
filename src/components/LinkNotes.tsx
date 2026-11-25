import { useMemo } from 'react'
import { sanitizeNotes } from '../lib/notes'

/**
 * A link's rich text notes (spec 007). The HTML is sanitized here, at render time, even
 * though the server already sanitized it, so nothing unsanitized is ever inserted.
 */
export function LinkNotes({ html, className = '' }: { html: string | null; className?: string }) {
  const clean = useMemo(() => sanitizeNotes(html), [html])
  if (!clean) return null
  return <div className={`notes ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />
}
