/**
 * TanStack Query hooks over the link management service. UI code talks to the
 * backend only through these; none of it calls the service directly.
 *
 * Mutations write the server's response straight into the query cache instead of
 * refetching, so a save costs one (slow) round trip, not two.
 */
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Category,
  CreateCategoryInput,
  CreateLinkInput,
  ImportLinksInput,
  LinkItem,
  UpdateCategoryInput,
  UpdateLinkInput,
} from '../types'
import { apiMode, linkMgmtService as api } from './link-mgmnt-client'

export const queryKeys = {
  categories: ['categories'] as const,
  category: (id: string) => ['categories', id] as const,
  links: ['links'] as const,
  link: (id: string) => ['links', id] as const,
  thumbnail: (id: string) => ['links', id, 'thumbnail'] as const,
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // No silent retries: with 3–6 s per call, retries would hide the error state
        // for up to 18 s. Errors surface at once and the UI offers "Try again".
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
      mutations: { retry: false },
    },
  })
}

/* ---------- Queries ---------- */

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.categories, queryFn: async () => (await api.listCategories()).data })

export const useCategory = (id: string) =>
  useQuery({ queryKey: queryKeys.category(id), queryFn: async () => (await api.getCategory(id)).data })

export const useLinks = () => useQuery({ queryKey: queryKeys.links, queryFn: async () => (await api.listLinks()).data })

export const useLink = (id: string) =>
  useQuery({ queryKey: queryKeys.link(id), queryFn: async () => (await api.getLink(id)).data })

/* ---------- Thumbnails ---------- */

/** How often to check again for a thumbnail that hasn't been generated yet. */
export const THUMBNAIL_POLL_MS = 30_000
/**
 * Stop checking once a link is this old. The server only generates a thumbnail right after
 * a create, and a failed generation stays a 404 forever, so polling older links is wasted.
 */
const THUMBNAIL_WAIT_MS = 10 * 60_000

/**
 * True while a link is new enough that its thumbnail may still be on its way. Never true
 * with the mock API, which doesn't generate thumbnails.
 */
export const isAwaitingThumbnail = (link: Pick<LinkItem, 'createdAt'>) =>
  apiMode === 'http' && Date.now() - Date.parse(link.createdAt) < THUMBNAIL_WAIT_MS

/**
 * The link's thumbnail image, or null if it has none. While the link is new and has no
 * thumbnail yet, checks again every 30 seconds until one appears.
 */
export const useLinkThumbnail = (link: Pick<LinkItem, 'id' | 'createdAt'>) =>
  useQuery({
    queryKey: queryKeys.thumbnail(link.id),
    queryFn: () => api.getLinkThumbnail(link.id),
    // A thumbnail never changes once generated.
    staleTime: Infinity,
    refetchInterval: (query) => (query.state.data || !isAwaitingThumbnail(link) ? false : THUMBNAIL_POLL_MS),
  })

/* ---------- Cache helpers ---------- */

const upsert = <T extends { id: string }>(list: T[] | undefined, item: T, prepend = false) => {
  if (!list) return list
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : prepend ? [item, ...list] : [...list, item]
}

/* ---------- Link mutations ---------- */

export function useCreateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateLinkInput) => (await api.createLink(input)).data,
    onSuccess: (link) => {
      qc.setQueryData<LinkItem[]>(queryKeys.links, (list) => upsert(list, link, true))
      qc.setQueryData(queryKeys.link(link.id), link)
    },
  })
}

export function useUpdateLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateLinkInput }) => (await api.updateLink(id, input)).data,
    onSuccess: (link) => {
      qc.setQueryData<LinkItem[]>(queryKeys.links, (list) => upsert(list, link))
      qc.setQueryData(queryKeys.link(link.id), link)
    },
  })
}

export function useDeleteLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteLink(id),
    onSuccess: (_, id) => {
      qc.setQueryData<LinkItem[]>(queryKeys.links, (list) => list?.filter((l) => l.id !== id))
      // Also drops the link's thumbnail, whose key starts with the link's.
      qc.removeQueries({ queryKey: queryKeys.link(id) })
    },
  })
}

/** Bulk import. Created links go straight into the list cache; the result says what was skipped. */
export function useImportLinks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ImportLinksInput) => api.importLinks(input),
    onSuccess: ({ data }) => {
      if (!data.created.length) return
      // Newest first, matching the list endpoint.
      const added = [...data.created].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const ids = new Set(added.map((l) => l.id))
      qc.setQueryData<LinkItem[]>(queryKeys.links, (list) => (list ? [...added, ...list.filter((l) => !ids.has(l.id))] : list))
    },
  })
}

/* ---------- Category mutations ---------- */

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => (await api.createCategory(input)).data,
    onSuccess: (category) => qc.setQueryData<Category[]>(queryKeys.categories, (list) => upsert(list, category)),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCategoryInput }) => (await api.updateCategory(id, input)).data,
    onSuccess: (category) => {
      qc.setQueryData<Category[]>(queryKeys.categories, (list) => upsert(list, category))
      qc.setQueryData(queryKeys.category(category.id), category)
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.deleteCategory(id)).data,
    onSuccess: (result) => {
      const deleted = new Set(result.deletedCategoryIds)
      const moved = new Set(result.movedLinkIds)
      qc.setQueryData<Category[]>(queryKeys.categories, (list) => list?.filter((c) => !deleted.has(c.id)))
      qc.setQueryData<LinkItem[]>(queryKeys.links, (list) =>
        list?.map((l) => (moved.has(l.id) ? { ...l, categoryId: result.movedTo } : l)),
      )
      for (const id of deleted) qc.removeQueries({ queryKey: queryKeys.category(id) })
    },
  })
}
