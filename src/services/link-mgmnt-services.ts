/**
 * Link management service — an emulation of the future REST backend.
 *
 * Every method corresponds to one call definition in ./mock-data, which is the API
 * contract. The emulation:
 *   - seeds its data from the 200 responses in mock-data/{categories,links}/list.json
 *   - waits a random 3–6 s per call so loading states are visible
 *   - can fail at random with the transient errors in mock-data/errors.json
 *   - applies the validation and business rules written in each call definition
 *   - persists to localStorage so data survives a reload, like a real server would
 *
 * It's used when VITE_API_BASE_URL is not set (see link-mgmnt-client.ts). The real API
 * lives in link-mgmnt-http.ts; both implement LinkManagementApi from contract.ts.
 */
import type {
  Category,
  CreateCategoryInput,
  CreateLinkInput,
  DataResponse,
  DeleteCategoryResult,
  ErrorCode,
  FieldError,
  ImportLinksInput,
  ImportLinksResponse,
  LinkItem,
  ListResponse,
  Rating,
  UpdateCategoryInput,
  UpdateLinkInput,
} from '../types'
import { ApiError, ERRORS, type LinkManagementApi } from './contract'

import models from '../../mock-data/models.json'
import listCategoriesDef from '../../mock-data/categories/list.json'
import getCategoryDef from '../../mock-data/categories/get.json'
import createCategoryDef from '../../mock-data/categories/create.json'
import updateCategoryDef from '../../mock-data/categories/update.json'
import deleteCategoryDef from '../../mock-data/categories/delete.json'
import listLinksDef from '../../mock-data/links/list.json'
import getLinkDef from '../../mock-data/links/get.json'
import createLinkDef from '../../mock-data/links/create.json'
import updateLinkDef from '../../mock-data/links/update.json'
import deleteLinkDef from '../../mock-data/links/delete.json'
import linkThumbnailDef from '../../mock-data/links/thumbnail.json'
import importLinksDef from '../../mock-data/links/import.json'
import { parseBulkLinks, MAX_ENTRIES } from '../lib/bulk-links'

/* ---------- Contract plumbing ---------- */

interface CallDefinition {
  name: string
  method: string
  path: string
  errors: string[]
}

const LINK_FIELDS = models.Link.fields
const CATEGORY_FIELDS = models.Category.fields

/* ---------- Options ---------- */

export interface MockOptions {
  minDelayMs: number
  maxDelayMs: number
  /** 0–1: chance that any call fails with INTERNAL_ERROR or SERVICE_UNAVAILABLE. */
  errorRate: number
  /** Log each emulated request to the console. */
  log: boolean
}

const envNumber = (value: string | undefined, fallback: number) => {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback
}

const DEFAULT_OPTIONS: MockOptions = {
  minDelayMs: envNumber(import.meta.env.VITE_MOCK_MIN_DELAY_MS, 3000),
  maxDelayMs: envNumber(import.meta.env.VITE_MOCK_MAX_DELAY_MS, 6000),
  errorRate: envNumber(import.meta.env.VITE_MOCK_ERROR_RATE, 0.1),
  log: import.meta.env.DEV,
}

/* ---------- Mock database ---------- */

interface Db {
  categories: Category[]
  links: LinkItem[]
}

const DB_KEY = 'link-organizer:mock-db:v1'

function seedDb(): Db {
  return structuredClone({
    categories: listCategoriesDef.responses[0].body.data as Category[],
    links: listLinksDef.responses[0].body.data as LinkItem[],
  })
}

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* unreadable or unavailable — start from the seed */
  }
  return seedDb()
}

/* ---------- Validation (rules from each call definition's "rules") ---------- */

const isHttpUrl = (value: string) => {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const sameText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0

/** The id plus every descendant id of a category. */
function subtree(categories: Category[], rootId: string): Set<string> {
  const ids = new Set([rootId])
  for (let grew = true; grew; ) {
    grew = false
    for (const c of categories) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        grew = true
      }
    }
  }
  return ids
}

/* ---------- Service ---------- */

export class LinkManagementService implements LinkManagementApi {
  private options: MockOptions
  private db: Db

  constructor(options: Partial<MockOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.db = loadDb()
  }

  /** Adjust delay or error rate at runtime, e.g. `mockApi.configure({ errorRate: 1 })` in the console. */
  configure(options: Partial<MockOptions>) {
    this.options = { ...this.options, ...options }
    return { ...this.options }
  }

  /** Throw away all changes and go back to the seed data in mock-data. */
  reset() {
    this.db = seedDb()
    this.persist()
  }

  /* ----- Categories ----- */

  listCategories(): Promise<ListResponse<Category>> {
    return this.request(listCategoriesDef, {}, () => ({
      data: this.db.categories,
      meta: { total: this.db.categories.length },
    }))
  }

  getCategory(id: string): Promise<DataResponse<Category>> {
    return this.request(getCategoryDef, { id }, () => ({ data: this.findCategory(id) }))
  }

  createCategory(input: CreateCategoryInput): Promise<DataResponse<Category>> {
    return this.request(createCategoryDef, {}, () => {
      const name = this.validateCategory(input, null, true)
      const now = new Date().toISOString()
      const category: Category = {
        id: crypto.randomUUID(),
        name: name!,
        parentId: input.parentId ?? null,
        createdAt: now,
        updatedAt: now,
      }
      this.db.categories.push(category)
      return { data: category }
    })
  }

  updateCategory(id: string, input: UpdateCategoryInput): Promise<DataResponse<Category>> {
    return this.request(updateCategoryDef, { id }, () => {
      const current = this.findCategory(id)
      const name = this.validateCategory(input, current, false)
      const updated: Category = {
        ...current,
        ...(name !== undefined && { name }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        updatedAt: new Date().toISOString(),
      }
      this.db.categories = this.db.categories.map((c) => (c.id === id ? updated : c))
      return { data: updated }
    })
  }

  deleteCategory(id: string): Promise<DataResponse<DeleteCategoryResult>> {
    return this.request(deleteCategoryDef, { id }, () => {
      const target = this.findCategory(id)
      const doomed = subtree(this.db.categories, id)
      const movedLinkIds: string[] = []
      const now = new Date().toISOString()
      this.db.categories = this.db.categories.filter((c) => !doomed.has(c.id))
      this.db.links = this.db.links.map((l) => {
        if (!l.categoryId || !doomed.has(l.categoryId)) return l
        movedLinkIds.push(l.id)
        return { ...l, categoryId: target.parentId, updatedAt: now }
      })
      return {
        data: { id, deletedCategoryIds: [...doomed], movedLinkIds, movedTo: target.parentId },
      }
    })
  }

  /* ----- Links ----- */

  listLinks(): Promise<ListResponse<LinkItem>> {
    return this.request(listLinksDef, {}, () => {
      const data = [...this.db.links].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { data, meta: { total: data.length } }
    })
  }

  getLink(id: string): Promise<DataResponse<LinkItem>> {
    return this.request(getLinkDef, { id }, () => ({ data: this.findLink(id) }))
  }

  createLink(input: CreateLinkInput): Promise<DataResponse<LinkItem>> {
    return this.request(createLinkDef, {}, () => {
      const clean = this.validateLink(input, null)
      const now = new Date().toISOString()
      const link: LinkItem = {
        id: crypto.randomUUID(),
        title: clean.title!,
        url: clean.url!,
        description: clean.description ?? null,
        categoryId: clean.categoryId ?? null,
        rating: clean.rating ?? 0,
        createdAt: now,
        updatedAt: now,
      }
      this.db.links.unshift(link)
      return { data: link }
    })
  }

  updateLink(id: string, input: UpdateLinkInput): Promise<DataResponse<LinkItem>> {
    return this.request(updateLinkDef, { id }, () => {
      const current = this.findLink(id)
      const clean = this.validateLink(input, current)
      const updated: LinkItem = { ...current, ...clean, updatedAt: new Date().toISOString() }
      this.db.links = this.db.links.map((l) => (l.id === id ? updated : l))
      return { data: updated }
    })
  }

  deleteLink(id: string): Promise<void> {
    return this.request(deleteLinkDef, { id }, () => {
      this.findLink(id)
      this.db.links = this.db.links.filter((l) => l.id !== id)
    })
  }

  importLinks(input: ImportLinksInput): Promise<ImportLinksResponse> {
    return this.request(importLinksDef, {}, () => {
      const details: FieldError[] = []
      const entries = typeof input.text === 'string' ? parseBulkLinks(input.text) : []
      if (!entries.length) details.push({ field: 'text', message: 'Paste at least one link to import.' })
      else if (entries.length > MAX_ENTRIES)
        details.push({ field: 'text', message: `One import can take at most ${MAX_ENTRIES} links. Split it into smaller batches.` })
      if (input.categoryId === undefined) details.push({ field: 'categoryId', message: 'Pick a category for the imported links.' })
      else if (input.categoryId !== null && !this.db.categories.some((c) => c.id === input.categoryId))
        details.push({ field: 'categoryId', message: 'That category no longer exists. Pick another.' })
      if (details.length) throw new ApiError('VALIDATION_FAILED', details)

      const created: LinkItem[] = []
      const skipped: ImportLinksResponse['data']['skipped'] = []
      for (const e of entries) {
        try {
          const clean = this.validateLink({ title: e.title, url: e.url, description: e.description, categoryId: input.categoryId }, null)
          const now = new Date(Date.now() + created.length).toISOString()
          const link: LinkItem = {
            id: crypto.randomUUID(),
            title: clean.title!,
            url: clean.url!,
            description: clean.description ?? null,
            categoryId: clean.categoryId ?? null,
            rating: 0,
            createdAt: now,
            updatedAt: now,
          }
          this.db.links.unshift(link)
          created.push(link)
        } catch (error) {
          if (!(error instanceof ApiError)) throw error
          skipped.push({
            entry: e.entry,
            line: e.line,
            title: e.title,
            url: e.url,
            code: error.code === 'DUPLICATE_URL' ? 'DUPLICATE_URL' : 'VALIDATION_FAILED',
            message: error.details?.map((d) => d.message).join(' ') || error.message,
          })
        }
      }
      return { data: { created, skipped }, meta: { total: entries.length, created: created.length, skipped: skipped.length } }
    })
  }

  /** The mock doesn't generate thumbnails: every link answers "none yet". */
  getLinkThumbnail(id: string): Promise<Blob | null> {
    return this.request(linkThumbnailDef, { id }, () => {
      this.findLink(id)
      return null
    })
  }

  /* ----- Internals ----- */

  /**
   * The single place a "request" happens: delay, maybe fail, run the handler,
   * persist, log. A real implementation replaces this with fetch.
   */
  private async request<T>(def: CallDefinition, params: Record<string, string>, handler: () => T): Promise<T> {
    const path = def.path.replace(/:(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? `:${key}`))
    const { minDelayMs, maxDelayMs, errorRate } = this.options
    const delay = minDelayMs + Math.random() * Math.max(0, maxDelayMs - minDelayMs)
    const started = performance.now()

    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
      if (Math.random() < errorRate) {
        const transient = def.errors.filter((code) => ERRORS[code as ErrorCode]?.transient) as ErrorCode[]
        throw new ApiError(transient[Math.floor(Math.random() * transient.length)] ?? 'INTERNAL_ERROR')
      }
      const result = handler()
      this.persist()
      const status = result === undefined ? 204 : result === null ? 404 : def.method === 'POST' ? 201 : 200
      this.log(def.method, path, def.name, status, started)
      // Hand back a copy, as a network response would be: callers can't mutate the mock DB.
      return result == null ? result : structuredClone(result)
    } catch (error) {
      if (error instanceof ApiError) this.log(def.method, path, def.name, error.status, started, error.body)
      throw error
    }
  }

  private log(method: string, path: string, name: string, status: number, started: number, body?: unknown) {
    if (!this.options.log) return
    const secs = ((performance.now() - started) / 1000).toFixed(1)
    const line = `[mock api] ${method} ${path} → ${status} (${secs}s) ${name}`
    if (status >= 400) console.warn(line, body)
    else console.info(line)
  }

  private persist() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.db))
    } catch {
      /* storage unavailable — data lasts for this session only */
    }
  }

  private findCategory(id: string): Category {
    const found = this.db.categories.find((c) => c.id === id)
    if (!found) throw new ApiError('NOT_FOUND')
    return found
  }

  private findLink(id: string): LinkItem {
    const found = this.db.links.find((l) => l.id === id)
    if (!found) throw new ApiError('NOT_FOUND')
    return found
  }

  /** Validates a category body; returns the trimmed name if one was sent. */
  private validateCategory(input: UpdateCategoryInput, current: Category | null, isCreate: boolean): string | undefined {
    const details: FieldError[] = []
    const name = input.name?.trim()
    const parentId = input.parentId !== undefined ? input.parentId : (current?.parentId ?? null)

    if (isCreate || input.name !== undefined) {
      if (!name) details.push({ field: 'name', message: 'Give the category a name.' })
      else if (name.length > CATEGORY_FIELDS.name.maxLength)
        details.push({ field: 'name', message: `Keep the name under ${CATEGORY_FIELDS.name.maxLength} characters.` })
    }
    if (parentId !== null && !this.db.categories.some((c) => c.id === parentId)) {
      details.push({ field: 'parentId', message: 'The parent category no longer exists.' })
    }
    if (current && parentId !== null && subtree(this.db.categories, current.id).has(parentId)) {
      details.push({ field: 'parentId', message: "A category can't be moved inside itself." })
    }
    if (details.length) throw new ApiError('VALIDATION_FAILED', details)

    const finalName = name ?? current!.name
    const clash = this.db.categories.find(
      (c) => c.id !== current?.id && c.parentId === parentId && sameText(c.name, finalName),
    )
    if (clash) {
      const parent = this.db.categories.find((c) => c.id === parentId)
      throw new ApiError('DUPLICATE_CATEGORY', [
        { field: 'name', message: `"${clash.name}" is already in ${parent ? parent.name : 'your top-level categories'}.` },
      ])
    }
    return name
  }

  /** Validates a link body; returns only the fields that were sent, cleaned. */
  private validateLink(input: UpdateLinkInput, current: LinkItem | null): Partial<LinkItem> {
    const details: FieldError[] = []
    const clean: Partial<LinkItem> = {}
    const isCreate = current === null

    if (isCreate || input.title !== undefined) {
      const title = input.title?.trim() ?? ''
      if (!title) details.push({ field: 'title', message: 'Add a title so you can find this link later.' })
      else if (title.length > LINK_FIELDS.title.maxLength)
        details.push({ field: 'title', message: `Keep the title under ${LINK_FIELDS.title.maxLength} characters.` })
      clean.title = title
    }
    if (isCreate || input.url !== undefined) {
      const url = input.url?.trim() ?? ''
      if (!isHttpUrl(url)) details.push({ field: 'url', message: 'Enter a web address that starts with http:// or https://.' })
      else if (url.length > LINK_FIELDS.url.maxLength) details.push({ field: 'url', message: 'That web address is too long.' })
      clean.url = url
    }
    if (input.description !== undefined) {
      const description = input.description?.trim() || null
      if (description && description.length > LINK_FIELDS.description.maxLength)
        details.push({ field: 'description', message: `Keep the description under ${LINK_FIELDS.description.maxLength} characters.` })
      clean.description = description
    }
    if (input.categoryId !== undefined) {
      if (input.categoryId !== null && !this.db.categories.some((c) => c.id === input.categoryId))
        details.push({ field: 'categoryId', message: 'That category no longer exists. Pick another.' })
      clean.categoryId = input.categoryId
    }
    if (input.rating !== undefined) {
      const { minimum, maximum } = LINK_FIELDS.rating
      if (!Number.isInteger(input.rating) || input.rating < minimum || input.rating > maximum)
        details.push({ field: 'rating', message: `Rating must be a whole number from ${minimum} to ${maximum}.` })
      clean.rating = input.rating as Rating
    }
    if (details.length) throw new ApiError('VALIDATION_FAILED', details)

    if (clean.url) {
      const clash = this.db.links.find((l) => l.id !== current?.id && l.url === clean.url)
      if (clash) throw new ApiError('DUPLICATE_URL', [{ field: 'url', message: `Already saved as "${clash.title}".` }])
    }
    return clean
  }
}
