import DOMPurify from 'dompurify'

/**
 * Rich text notes (spec 007). Notes are an HTML fragment from the NotesEditor. This is the
 * same allowlist the API applies (../link-organizer-api/src/lib/notes.ts): the mock backend
 * uses it to store notes the way the server does, and every place that renders notes runs
 * it again, so HTML is never inserted unsanitized.
 */
export const NOTES_MAX_LENGTH = 20_000

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'hr']

/** Empty paragraphs the editor leaves at the end (e.g. after pressing Enter). */
const TRAILING_EMPTY = /(?:\s*<p>\s*(?:<br\s*\/?>)?\s*<\/p>)+$/

const purify = DOMPurify()
purify.addHook('afterSanitizeAttributes', (node) => {
  // Every link opens in a new tab without giving the page a handle on the app.
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const sanitize = (html: string) =>
  purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  }) as string

/** Sanitized notes, or null when nothing worth keeping is left (no text and no links). */
export function sanitizeNotes(html: string | null | undefined): string | null {
  if (!html) return null
  const clean = sanitize(html).trim().replace(TRAILING_EMPTY, '')
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  const hasText = (doc.body.textContent ?? '').replace(/ /g, '').trim() !== ''
  return hasText || doc.body.querySelector('a[href]') ? clean : null
}
