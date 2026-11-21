/**
 * Parser and checks for bulk link text, the format POST /api/links/import accepts
 * (mock-data/links/import.json). Entries are separated by one or more blank lines:
 *
 *   line 1      title
 *   line 2      link (http:// or https://)
 *   lines 3–4   optional description
 *
 *   link 1
 *   http://www.somewhere.com
 *
 *   some other link
 *   http://www.foo.com
 *   this is a really great site....
 *
 * The server parses the same way; these checks run while the user types so problems
 * show up before anything is sent.
 */
import models from '../../mock-data/models.json'

export interface BulkEntry {
  /** 1-based position of the entry in the text. */
  entry: number
  /** 1-based line the entry starts on. */
  line: number
  /** Number of non-blank lines in the entry. */
  lines: number
  title: string
  url: string
  description: string | null
}

export function parseBulkLinks(text: string): BulkEntry[] {
  const entries: BulkEntry[] = []
  let block: string[] = []
  let start = 0

  const flush = () => {
    if (!block.length) return
    const [title = '', url = '', ...rest] = block
    const description = rest.join('\n').trim()
    entries.push({ entry: entries.length + 1, line: start, lines: block.length, title, url, description: description || null })
    block = []
  }

  text.split(/\r\n|\r|\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return flush()
    if (!block.length) start = i + 1
    block.push(line)
  })
  flush()
  return entries
}

/** An entry can be at most this many consecutive lines: title, link and two lines of description. */
export const MAX_ENTRY_LINES = 4
/** The server rejects a whole import with more entries than this. */
export const MAX_ENTRIES = 1000

export interface BulkIssue {
  entry: number
  line: number
  /** `error` blocks the import; `warning` means the server will skip that entry. */
  severity: 'error' | 'warning'
  message: string
}

export interface BulkCheck {
  entries: BulkEntry[]
  issues: BulkIssue[]
  /** Entries with no problems: what will be created. */
  ready: number
  errors: number
  /** Entries the server will skip as already saved. */
  duplicates: number
}

const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const LIMITS = models.Link.fields

/** Parses the text and checks every entry. `savedUrls` are links that already exist. */
export function checkBulkLinks(text: string, savedUrls: ReadonlySet<string>): BulkCheck {
  const entries = parseBulkLinks(text)
  const issues: BulkIssue[] = []
  const seen = new Map<string, number>()
  let errors = 0
  let duplicates = 0

  for (const e of entries) {
    const problems: string[] = []
    const at = { entry: e.entry, line: e.line }

    if (e.lines > MAX_ENTRY_LINES) {
      problems.push(
        `${e.lines} lines in a row. An entry is at most ${MAX_ENTRY_LINES} lines (title, link and up to two lines of description), so a blank line is probably missing.`,
      )
    } else if (e.lines === 1) {
      problems.push('Missing the link. Put it on the line after the title.')
    } else if (!isHttpUrl(e.url)) {
      problems.push(
        isHttpUrl(e.title)
          ? 'The link is on the first line. Put the title first, then the link.'
          : `"${e.url}" isn't a web address. The second line must start with http:// or https://.`,
      )
    }
    if (e.title.length > LIMITS.title.maxLength) problems.push(`The title is longer than ${LIMITS.title.maxLength} characters.`)
    if (e.url.length > LIMITS.url.maxLength) problems.push('The link is too long.')
    if (e.description && e.description.length > LIMITS.description.maxLength)
      problems.push(`The description is longer than ${LIMITS.description.maxLength} characters.`)

    if (problems.length) {
      errors++
      for (const message of problems) issues.push({ ...at, severity: 'error', message })
      continue
    }

    const earlier = seen.get(e.url)
    if (earlier !== undefined) {
      duplicates++
      issues.push({ ...at, severity: 'warning', message: `Same link as entry ${earlier}; it will be skipped.` })
    } else if (savedUrls.has(e.url)) {
      duplicates++
      issues.push({ ...at, severity: 'warning', message: 'Already saved; it will be skipped.' })
    }
    seen.set(e.url, seen.get(e.url) ?? e.entry)
  }

  const ready = entries.length - errors - duplicates

  if (entries.length > MAX_ENTRIES) {
    issues.unshift({
      entry: 0,
      line: 0,
      severity: 'error',
      message: `${entries.length} entries is more than the ${MAX_ENTRIES} one import can take. Split it into smaller batches.`,
    })
    errors++
  }

  return { entries, issues, ready, errors, duplicates }
}
