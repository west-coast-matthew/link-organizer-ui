/*
 * Resource types. These mirror mock-data/models.json — the API contract — so change
 * that file first and keep these in step.
 */

/** 0 means "not rated"; 1–5 are stars. */
export type Rating = 0 | 1 | 2 | 3 | 4 | 5

export interface Category {
  id: string
  name: string
  /** null for a top-level category; otherwise the id of its parent (a subcategory). */
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface LinkItem {
  id: string
  title: string
  url: string
  description: string | null
  /** Rich text notes as a sanitized HTML fragment (e.g. related sub-links under a parent link); null = none. */
  notes: string | null
  /** Category or subcategory the link lives in; null = unsorted. */
  categoryId: string | null
  rating: Rating
  /** ISO timestamp of when the link was added. */
  createdAt: string
  updatedAt: string
}

/* ---------- Request bodies ---------- */

export interface CreateLinkInput {
  title: string
  url: string
  description?: string | null
  /** HTML fragment from the rich text editor; the server sanitizes it. */
  notes?: string | null
  categoryId?: string | null
  rating?: Rating
}
export type UpdateLinkInput = Partial<CreateLinkInput>

export interface CreateCategoryInput {
  name: string
  parentId?: string | null
}
export type UpdateCategoryInput = Partial<CreateCategoryInput>

/** What the link form produces. */
export type LinkDraft = Required<CreateLinkInput>

/* ---------- Response envelopes (mock-data/README.md) ---------- */

export interface DataResponse<T> {
  data: T
}
export interface ListResponse<T> {
  data: T[]
  meta: { total: number }
}
export interface ImportLinksInput {
  /** Bulk link text: entries of title, link and optional description, separated by blank lines. */
  text: string
  /** Category for every imported link; null imports them as unsorted. */
  categoryId: string | null
}
export interface SkippedImportEntry {
  entry: number
  line: number
  title: string
  url: string
  code: 'VALIDATION_FAILED' | 'DUPLICATE_URL'
  message: string
}
export interface ImportLinksResponse {
  data: { created: LinkItem[]; skipped: SkippedImportEntry[] }
  meta: { total: number; created: number; skipped: number }
}
export interface DeleteCategoryResult {
  id: string
  deletedCategoryIds: string[]
  movedLinkIds: string[]
  movedTo: string | null
}

/* ---------- Backup: export and import (spec 008; mock-data/backup) ---------- */

/** A link as it appears in a backup file: the API's spelling, where "not rated" is null. */
export type ExportedLink = Omit<LinkItem, 'rating'> & { rating: Exclude<Rating, 0> | null }

/** A backup file: every category (parents first) and every link (oldest first). */
export interface ExportDocument {
  format: 'link-organizer-export'
  version: 1
  /** ISO timestamp of when the file was made. */
  exportedAt: string
  counts: { categories: number; links: number }
  categories: Category[]
  links: ExportedLink[]
}

export interface ImportSkippedCategory {
  /** 1-based position in the file's `categories` array. */
  index: number
  name: string
  code: ErrorCode
  message: string
}
export interface ImportSkippedLink {
  /** 1-based position in the file's `links` array. */
  index: number
  title: string
  url: string
  code: ErrorCode
  message: string
}
export interface ImportBackupResponse {
  data: {
    categories: {
      created: number
      /** Same id already saved; used as is. */
      existing: number
      /** Same name already under the same parent; merged into that category. */
      merged: number
      skipped: ImportSkippedCategory[]
    }
    links: { created: number; skipped: ImportSkippedLink[] }
  }
  /** Number of entries in the file. */
  meta: { categories: number; links: number }
}

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'DUPLICATE_URL'
  | 'DUPLICATE_CATEGORY'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'

export interface FieldError {
  field: string
  message: string
}
export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: FieldError[] }
}
