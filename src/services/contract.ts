/**
 * What every link management backend implements, whether it's the mock in
 * link-mgmnt-services.ts or the real API in link-mgmnt-http.ts. The query hooks
 * depend on this interface only, never on which one is in use.
 */
import type {
  Category,
  CreateCategoryInput,
  CreateLinkInput,
  DataResponse,
  DeleteCategoryResult,
  ErrorBody,
  ErrorCode,
  FieldError,
  LinkItem,
  ListResponse,
  UpdateCategoryInput,
  UpdateLinkInput,
} from '../types'
import errorCatalog from '../../mock-data/errors.json'

export interface LinkManagementApi {
  listCategories(): Promise<ListResponse<Category>>
  getCategory(id: string): Promise<DataResponse<Category>>
  createCategory(input: CreateCategoryInput): Promise<DataResponse<Category>>
  updateCategory(id: string, input: UpdateCategoryInput): Promise<DataResponse<Category>>
  deleteCategory(id: string): Promise<DataResponse<DeleteCategoryResult>>

  listLinks(): Promise<ListResponse<LinkItem>>
  getLink(id: string): Promise<DataResponse<LinkItem>>
  createLink(input: CreateLinkInput): Promise<DataResponse<LinkItem>>
  updateLink(id: string, input: UpdateLinkInput): Promise<DataResponse<LinkItem>>
  deleteLink(id: string): Promise<void>
}

export interface ErrorDefinition {
  status: number
  message: string
  transient?: boolean
}

export const ERRORS = errorCatalog.errors as Record<ErrorCode, ErrorDefinition>

/** Thrown for every non-2xx response. `body` is exactly what the API sent (or would send). */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details?: FieldError[]
  readonly body: ErrorBody

  constructor(code: ErrorCode, details?: FieldError[], message?: string, status?: number) {
    const known = ERRORS[code] as ErrorDefinition | undefined
    const text = message ?? known?.message ?? 'Something went wrong. Try again.'
    super(text)
    this.name = 'ApiError'
    this.code = code
    this.status = status ?? known?.status ?? 500
    this.details = details
    this.body = { error: { code, message: text, ...(details ? { details } : {}) } }
  }
}

/** One line of user-facing text for any error a call can produce. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.details?.length ? error.details.map((d) => d.message).join(' ') : error.message
  }
  return 'Something went wrong. Try again.'
}
