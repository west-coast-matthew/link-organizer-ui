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
export interface DeleteCategoryResult {
  id: string
  deletedCategoryIds: string[]
  movedLinkIds: string[]
  movedTo: string | null
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
