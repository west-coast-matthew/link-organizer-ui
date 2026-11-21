import { useCallback, useMemo, useState, type Ref } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { categoryPath, subtreeIds } from './lib/categories'
import type { Category, LinkDraft, LinkItem, Rating } from './types'
import { describeError } from './services/link-mgmnt-services'
import {
  useCategories,
  useCreateCategory,
  useCreateLink,
  useDeleteCategory,
  useDeleteLink,
  useLinks,
  useUpdateCategory,
  useUpdateLink,
} from './services/link-mgmnt-queries'
import { Sidebar, type Selection } from './components/Sidebar'
import { LinkCard } from './components/LinkCard'
import { LinkForm } from './components/LinkForm'
import { StatusText } from './components/StatusText'
import { Annotated, Eyebrow, Icon, Toggle } from './components/ui'

type Sort = 'newest' | 'rating'
type Editor = { mode: 'add' } | { mode: 'edit'; link: LinkItem } | null

/** A card wired to its own update/delete requests, so each card shows its own status. */
function ConnectedLinkCard({
  link,
  path,
  onEdit,
  ref,
}: {
  link: LinkItem
  path: string[]
  onEdit: () => void
  ref?: Ref<HTMLElement>
}) {
  const update = useUpdateLink()
  const remove = useDeleteLink()
  // While a rating save is in flight, show the requested value; it reverts if the save fails.
  const pendingRating = update.isPending ? update.variables.input.rating : undefined
  const shown = pendingRating === undefined ? link : { ...link, rating: pendingRating }

  const status = update.isPending ? (
    <StatusText>Saving rating…</StatusText>
  ) : remove.isPending ? (
    <StatusText>Deleting…</StatusText>
  ) : update.isError ? (
    <StatusText tone="error" onDismiss={update.reset}>
      Couldn't save the rating. {describeError(update.error)}
    </StatusText>
  ) : remove.isError ? (
    <StatusText tone="error" onDismiss={remove.reset}>
      Couldn't delete this link. {describeError(remove.error)}
    </StatusText>
  ) : null

  return (
    <LinkCard
      ref={ref}
      link={shown}
      path={path}
      status={status}
      onRate={(rating: Rating) => update.mutate({ id: link.id, input: { rating } })}
      onEdit={onEdit}
      onDelete={() => !remove.isPending && confirm(`Delete "${link.title}"?`) && remove.mutate(link.id)}
    />
  )
}

export default function App() {
  const categoriesQuery = useCategories()
  const linksQuery = useLinks()
  const categories = useMemo<Category[]>(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const links = useMemo<LinkItem[]>(() => linksQuery.data ?? [], [linksQuery.data])

  const createLink = useCreateLink()
  const editLink = useUpdateLink()
  const createCategory = useCreateCategory()
  const renameCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [selection, setSelection] = useState<Selection>({ kind: 'all' })
  const [sort, setSort] = useState<Sort>('newest')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor>(null)

  const openEditor = (next: Exclude<Editor, null>) => {
    createLink.reset()
    editLink.reset()
    setEditor(next)
  }
  const closeEditor = useCallback(() => setEditor(null), [])

  const saveLink = (draft: LinkDraft) => {
    if (editor?.mode === 'edit') editLink.mutate({ id: editor.link.id, input: draft }, { onSuccess: closeEditor })
    else createLink.mutate(draft, { onSuccess: closeEditor })
  }
  const linkSave = editor?.mode === 'edit' ? editLink : createLink

  const selectedCategory = selection.kind === 'category' ? categories.find((c) => c.id === selection.id) : undefined

  const visible = useMemo(() => {
    let list = links
    if (selection.kind === 'unsorted') list = list.filter((l) => !l.categoryId)
    if (selection.kind === 'category') {
      const ids = subtreeIds(categories, selection.id)
      list = list.filter((l) => l.categoryId && ids.has(l.categoryId))
    }
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((l) => [l.title, l.url, l.description ?? ''].some((s) => s.toLowerCase().includes(q)))
    }
    return [...list].sort((a, b) =>
      sort === 'rating' && b.rating !== a.rating ? b.rating - a.rating : b.createdAt.localeCompare(a.createdAt),
    )
  }, [links, categories, selection, query, sort])

  const heading =
    selection.kind === 'all' ? 'All links' : selection.kind === 'unsorted' ? 'Unsorted' : (selectedCategory?.name ?? '')
  const parentPath = selectedCategory ? categoryPath(categories, selectedCategory.parentId) : []
  const rated = visible.filter((l) => l.rating > 0)
  const avg = rated.length ? rated.reduce((s, l) => s + l.rating, 0) / rated.length : 0

  /* ----- Sidebar status: loading, then whichever category request is active or failed ----- */
  const categoryMutations = [
    { m: createCategory, pending: `Adding “${createCategory.variables?.name ?? ''}”…`, failed: "Couldn't add the category." },
    { m: renameCategory, pending: 'Renaming…', failed: "Couldn't rename the category." },
    { m: deleteCategory, pending: 'Deleting category…', failed: "Couldn't delete the category." },
  ]
  const activeCategoryMutation = categoryMutations.find(({ m }) => m.isPending) ?? categoryMutations.find(({ m }) => m.isError)
  const sidebarStatus = categoriesQuery.isPending ? (
    <StatusText>Loading categories…</StatusText>
  ) : categoriesQuery.isError ? (
    <StatusText tone="error" onRetry={() => categoriesQuery.refetch()}>
      Couldn't load categories. {describeError(categoriesQuery.error)}
    </StatusText>
  ) : activeCategoryMutation?.m.isPending ? (
    <StatusText>{activeCategoryMutation.pending}</StatusText>
  ) : activeCategoryMutation ? (
    <StatusText tone="error" onDismiss={activeCategoryMutation.m.reset}>
      {activeCategoryMutation.failed} {describeError(activeCategoryMutation.m.error)}
    </StatusText>
  ) : null

  return (
    <div className="app">
      <Sidebar
        categories={categories}
        links={links}
        selection={selection}
        onSelect={setSelection}
        onCreate={(name, parentId) => createCategory.mutate({ name, parentId })}
        onRename={(id, name) => renameCategory.mutate({ id, input: { name } })}
        onDelete={(id) => {
          if (selection.kind === 'category' && subtreeIds(categories, id).has(selection.id)) setSelection({ kind: 'all' })
          deleteCategory.mutate(id)
        }}
        status={sidebarStatus}
      />

      <main className="main">
        <section className="hero">
          <div>
            <Eyebrow>{parentPath.length ? parentPath.join(' / ') : selection.kind === 'category' ? 'Category' : 'Library'}</Eyebrow>
            <AnimatePresence mode="wait">
              <motion.h1
                key={heading}
                initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.28 }}
              >
                {heading}
              </motion.h1>
            </AnimatePresence>
            {linksQuery.isSuccess && (
              <p className="hero__meta">
                <span className="hero__count">{visible.length}</span> link{visible.length === 1 ? '' : 's'}
                {avg > 0 && <> · avg rating {avg.toFixed(1)}</>}
              </p>
            )}
          </div>
          <button type="button" className="btn btn--primary btn--lg mono" onClick={() => openEditor({ mode: 'add' })}>
            <Icon name="plus" size={16} /> Add link
          </button>
        </section>

        <div className="toolbar">
          <Annotated>
            <Toggle
              left={{ value: 'newest', label: 'Newest' }}
              right={{ value: 'rating', label: 'Top rated' }}
              value={sort}
              onChange={setSort}
            />
          </Annotated>
          <label className="search">
            <Icon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search links…" aria-label="Search links" />
          </label>
        </div>

        <div className="status-bar">
          {linksQuery.isPending && <StatusText>Loading links…</StatusText>}
          {linksQuery.isError && (
            <StatusText tone="error" onRetry={() => linksQuery.refetch()}>
              Couldn't load links. {describeError(linksQuery.error)}
            </StatusText>
          )}
          {linksQuery.isRefetching && <StatusText>Refreshing links…</StatusText>}
        </div>

        <motion.div layout className="grid">
          <AnimatePresence mode="popLayout">
            {visible.map((link) => (
              <ConnectedLinkCard
                key={link.id}
                link={link}
                path={selection.kind === 'category' && link.categoryId === selection.id ? [] : categoryPath(categories, link.categoryId)}
                onEdit={() => openEditor({ mode: 'edit', link })}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {linksQuery.isSuccess && visible.length === 0 && (
            <motion.div className="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Eyebrow>Empty</Eyebrow>
              <p>{query ? 'No links match your search.' : 'Nothing saved here yet.'}</p>
              {!query && (
                <button type="button" className="btn btn--ghost mono" onClick={() => openEditor({ mode: 'add' })}>
                  Add the first link <Icon name="arrow" size={14} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {editor && (
          <LinkForm
            key="editor"
            categories={categories}
            initial={editor.mode === 'edit' ? editor.link : undefined}
            defaultCategoryId={selection.kind === 'category' ? selection.id : null}
            onClose={closeEditor}
            onSave={saveLink}
            saving={linkSave.isPending}
            serverError={linkSave.isError ? describeError(linkSave.error) : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
