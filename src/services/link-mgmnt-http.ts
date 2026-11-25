/**
 * Link management over the real REST API (../link-organizer-api/docs/API.md).
 *
 * Used instead of the mock when VITE_API_BASE_URL is set; see link-mgmnt-client.ts.
 * Responses are returned in the same shapes the mock returns, so nothing above the
 * service layer can tell the two apart.
 *
 * One difference is bridged here: the API sends and accepts `rating: null` for
 * "not rated", while the UI uses 0.
 */
import type {
  Category,
  CreateCategoryInput,
  CreateLinkInput,
  DataResponse,
  DeleteCategoryResult,
  ErrorBody,
  ErrorCode,
  ImportLinksInput,
  ImportLinksResponse,
  LinkItem,
  ListResponse,
  Rating,
  UpdateCategoryInput,
  UpdateLinkInput,
} from '../types'
import { ApiError, type LinkManagementApi } from './contract'

/** A link as the API sends it: `rating` is null when unrated. */
type WireLink = Omit<LinkItem, 'rating'> & { rating: Rating | null }

const fromWire = (link: WireLink): LinkItem => ({ ...link, notes: link.notes ?? null, rating: link.rating ?? 0 })

/** Rating 0 means "not rated" in the UI; the API spells that null. */
const toWire = <T extends UpdateLinkInput>(input: T) =>
  input.rating === undefined ? input : { ...input, rating: input.rating === 0 ? null : input.rating }

export class HttpLinkManagementService implements LinkManagementApi {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  /* ----- Categories ----- */

  listCategories() {
    return this.request<ListResponse<Category>>('GET', '/api/categories')
  }

  getCategory(id: string) {
    return this.request<DataResponse<Category>>('GET', `/api/categories/${encodeURIComponent(id)}`)
  }

  createCategory(input: CreateCategoryInput) {
    return this.request<DataResponse<Category>>('POST', '/api/categories', input)
  }

  updateCategory(id: string, input: UpdateCategoryInput) {
    return this.request<DataResponse<Category>>('PATCH', `/api/categories/${encodeURIComponent(id)}`, input)
  }

  deleteCategory(id: string) {
    return this.request<DataResponse<DeleteCategoryResult>>('DELETE', `/api/categories/${encodeURIComponent(id)}`)
  }

  /* ----- Links ----- */

  async listLinks(): Promise<ListResponse<LinkItem>> {
    const res = await this.request<ListResponse<WireLink>>('GET', '/api/links')
    return { ...res, data: res.data.map(fromWire) }
  }

  async getLink(id: string): Promise<DataResponse<LinkItem>> {
    const res = await this.request<DataResponse<WireLink>>('GET', `/api/links/${encodeURIComponent(id)}`)
    return { data: fromWire(res.data) }
  }

  async createLink(input: CreateLinkInput): Promise<DataResponse<LinkItem>> {
    const res = await this.request<DataResponse<WireLink>>('POST', '/api/links', toWire(input))
    return { data: fromWire(res.data) }
  }

  async updateLink(id: string, input: UpdateLinkInput): Promise<DataResponse<LinkItem>> {
    const res = await this.request<DataResponse<WireLink>>('PATCH', `/api/links/${encodeURIComponent(id)}`, toWire(input))
    return { data: fromWire(res.data) }
  }

  async deleteLink(id: string): Promise<void> {
    await this.request<void>('DELETE', `/api/links/${encodeURIComponent(id)}`)
  }

  async importLinks(input: ImportLinksInput): Promise<ImportLinksResponse> {
    type WireImport = Omit<ImportLinksResponse, 'data'> & { data: { created: WireLink[]; skipped: ImportLinksResponse['data']['skipped'] } }
    const res = await this.request<WireImport>('POST', '/api/links/import', input)
    return { ...res, data: { ...res.data, created: res.data.created.map(fromWire) } }
  }

  async getLinkThumbnail(id: string): Promise<Blob | null> {
    const url = `${this.baseUrl}/api/links/${encodeURIComponent(id)}/thumbnail`
    let res: Response
    try {
      res = await fetch(url, { cache: 'no-store' })
    } catch {
      throw this.unreachable()
    }
    // 404 means "not generated yet" (or generation failed); the caller decides whether to keep checking.
    if (res.status === 404) return null
    if (!res.ok) throw await this.errorFrom(res)
    return res.blob()
  }

  /* ----- Internals ----- */

  private unreachable() {
    // Network failure: server down, wrong address, or blocked by CORS.
    return new ApiError('SERVICE_UNAVAILABLE', undefined, `Can't reach the server at ${this.baseUrl}. Check that the API is running.`, 0)
  }

  private async errorFrom(res: Response) {
    const payload: unknown = await res.json().catch(() => undefined)
    const error = (payload as Partial<ErrorBody> | undefined)?.error
    if (error?.code) return new ApiError(error.code as ErrorCode, error.details, error.message, res.status)
    return new ApiError(res.status >= 500 ? 'INTERNAL_ERROR' : 'NOT_FOUND', undefined, undefined, res.status)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        // The API sends ETags, so a cached GET would be revalidated and answered with
        // 304 Not Modified and no body. React Query is the app's cache; skip the HTTP one.
        cache: 'no-store',
        headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw this.unreachable()
    }

    if (res.status === 204) return undefined as T
    if (!res.ok) throw await this.errorFrom(res)

    const payload: unknown = await res.json().catch(() => undefined)
    if (payload === undefined) {
      throw new ApiError('INTERNAL_ERROR', undefined, 'The server sent a response the app could not read.', res.status)
    }
    return payload as T
  }
}
