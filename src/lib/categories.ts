import type { Category } from '../types'

/** The id plus every descendant id of a category. */
export function subtreeIds(categories: Category[], rootId: string): Set<string> {
  const ids = new Set([rootId])
  let grew = true
  while (grew) {
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

/** ["Food links", "Italian"] style path for a category. */
export function categoryPath(categories: Category[], id: string | null): string[] {
  const path: string[] = []
  let current = categories.find((c) => c.id === id)
  while (current) {
    path.unshift(current.name)
    const parentId: string | null = current.parentId
    current = categories.find((c) => c.id === parentId)
  }
  return path
}
