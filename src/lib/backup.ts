/**
 * Backup files (spec 008; mock-data/backup). The file format is defined by the API
 * (../link-organizer-api spec 004): the API's own Category and Link objects in an
 * envelope with a format name and version. Notes are HTML carried as JSON strings.
 */
import type { Category, ExportDocument, FieldError, ImportSkippedCategory } from '../types'

export const EXPORT_FORMAT = 'link-organizer-export'
export const EXPORT_VERSION = 1
export const MAX_IMPORT_CATEGORIES = 5000
export const MAX_IMPORT_LINKS = 20_000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)

export const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** `link-organizer-backup-YYYY-MM-DD.json`, dated (UTC) when the file was made. */
export const backupFileName = (doc: Pick<ExportDocument, 'exportedAt'>) => `link-organizer-backup-${doc.exportedAt.slice(0, 10)}.json`

/** Saves the document as a JSON file through the browser's download. */
export function downloadBackup(doc: ExportDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName(doc)
  document.body.append(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Why a value isn't an importable backup file, or null if it is. Applies the API's
 * whole-file checks, with the same fields and messages as the server's 400 response.
 */
export function backupProblem(value: unknown): FieldError | null {
  if (!isObject(value) || value.format !== EXPORT_FORMAT) return { field: 'format', message: "This isn't a Link Organizer export file." }
  if (value.version !== EXPORT_VERSION) {
    const newer = typeof value.version === 'number' && value.version > EXPORT_VERSION
    return {
      field: 'version',
      message: newer
        ? 'This file was made by a newer version of Link Organizer.'
        : `This file's version isn't supported. Expected version ${EXPORT_VERSION}.`,
    }
  }
  if (!Array.isArray(value.categories)) return { field: 'categories', message: 'The file has no list of categories.' }
  if (value.categories.length > MAX_IMPORT_CATEGORIES)
    return { field: 'categories', message: `Import at most ${MAX_IMPORT_CATEGORIES.toLocaleString('en-US')} categories at a time.` }
  if (!Array.isArray(value.links)) return { field: 'links', message: 'The file has no list of links.' }
  if (value.links.length > MAX_IMPORT_LINKS)
    return { field: 'links', message: `Import at most ${MAX_IMPORT_LINKS.toLocaleString('en-US')} links at a time.` }
  return null
}

export type BackupFileCheck = { ok: true; doc: ExportDocument } | { ok: false; message: string }

/** Parses and checks the text of a file the user picked, before anything is sent. */
export function readBackupText(text: string): BackupFileCheck {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, message: "This file isn't valid JSON, so it can't be a Link Organizer backup." }
  }
  const problem = backupProblem(value)
  return problem ? { ok: false, message: problem.message } : { ok: true, doc: value as ExportDocument }
}

/** Parents before children; siblings keep their order. Anything in a cycle goes last. */
export function parentsFirst<T extends Pick<Category, 'id' | 'parentId'>>(categories: T[]): T[] {
  const ordered: T[] = []
  const placed = new Set<string>()
  const ids = new Set(categories.map((c) => c.id))
  let pending = categories
  for (let progressed = true; pending.length && progressed; ) {
    progressed = false
    const waiting: T[] = []
    for (const c of pending) {
      if (c.parentId === null || !ids.has(c.parentId) || placed.has(c.parentId)) {
        ordered.push(c)
        placed.add(c.id)
        progressed = true
      } else waiting.push(c)
    }
    pending = waiting
  }
  return [...ordered, ...pending]
}

/** A valid ISO 8601 timestamp, normalized, otherwise `fallback`. */
export function isoOr(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return fallback
  const time = Date.parse(value)
  return Number.isNaN(time) ? fallback : new Date(time).toISOString()
}

/* ---------- Category import plan (the API's rules, for the mock backend) ---------- */

/** Case-insensitive, accent-sensitive — the comparison used for sibling names everywhere. */
const sameText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0

export interface CategoryImportPlan {
  /** In insert order: every parent comes before its children. */
  create: Category[]
  existing: number
  merged: number
  skipped: ImportSkippedCategory[]
  /** The saved id a category id from the file (or the data) stands for, or null if unknown. */
  resolve: (fileId: unknown) => string | null
}

/**
 * Works out which categories a backup file adds. An id that already exists is used as is;
 * otherwise a same-name sibling is reused; otherwise the category is created with the file's
 * id, name and timestamps. A missing or cyclic parent makes it top-level.
 */
export function planCategoryImport(entries: unknown[], existing: Category[], maxName: number, now = new Date().toISOString()): CategoryImportPlan {
  type Entry = Category & { index: number }
  const skipped: ImportSkippedCategory[] = []
  const valid: Entry[] = []
  const seen = new Set<string>()

  entries.forEach((raw, i) => {
    const index = i + 1
    const name = isObject(raw) && typeof raw.name === 'string' ? raw.name.trim() : ''
    const skip = (message: string) => skipped.push({ index, name, code: 'VALIDATION_FAILED', message })

    if (!isObject(raw)) return skip("This entry isn't a category.")
    if (!isUuid(raw.id)) return skip('The category has no valid id.')
    const id = raw.id.toLowerCase()
    if (seen.has(id)) return skip('Repeats an earlier category in the file.')
    if (!name) return skip('The category has no name.')
    if (name.length > maxName) return skip(`Keep the name under ${maxName} characters.`)
    seen.add(id)
    const createdAt = isoOr(raw.createdAt, now)
    valid.push({ index, id, name, parentId: isUuid(raw.parentId) ? raw.parentId.toLowerCase() : null, createdAt, updatedAt: isoOr(raw.updatedAt, createdAt) })
  })

  const known: Category[] = [...existing]
  const savedIds = new Set(existing.map((c) => c.id))
  const fileIds = new Set(valid.map((c) => c.id))
  const mapping = new Map<string, string>()
  const create: Category[] = []
  let existingCount = 0
  let merged = 0

  const place = ({ index: _index, ...entry }: Entry, parentId: string | null) => {
    if (savedIds.has(entry.id)) {
      existingCount++
      mapping.set(entry.id, entry.id)
      return
    }
    const twin = known.find((c) => c.parentId === parentId && sameText(c.name, entry.name))
    if (twin) {
      merged++
      mapping.set(entry.id, twin.id)
      return
    }
    const category: Category = { ...entry, parentId }
    create.push(category)
    known.push(category)
    mapping.set(entry.id, entry.id)
  }

  // Parents first. A parent outside the file resolves against the saved data (or top-level).
  let pending = valid
  for (let progressed = true; pending.length && progressed; ) {
    progressed = false
    const waiting: Entry[] = []
    for (const entry of pending) {
      const parent = entry.parentId
      if (parent === null || !fileIds.has(parent)) {
        place(entry, parent !== null && savedIds.has(parent) ? parent : null)
        progressed = true
      } else if (mapping.has(parent)) {
        place(entry, mapping.get(parent)!)
        progressed = true
      } else waiting.push(entry)
    }
    pending = waiting
  }
  // Whatever is left is part of a cycle: break it by making those categories top-level.
  for (const entry of pending) place(entry, null)

  const resolve = (fileId: unknown): string | null => {
    if (!isUuid(fileId)) return null
    const id = fileId.toLowerCase()
    return mapping.get(id) ?? (savedIds.has(id) ? id : null)
  }
  return { create, existing: existingCount, merged, skipped, resolve }
}
