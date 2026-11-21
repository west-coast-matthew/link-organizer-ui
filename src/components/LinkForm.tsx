import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Category, LinkDraft, LinkItem, Rating } from '../types'
import { StarRating } from './StarRating'
import { Eyebrow, Icon } from './ui'
import { Button, Field, SelectField, TextArea, TextField, type SelectOption } from './form'

interface Props {
  categories: Category[]
  /** Existing link when editing; undefined when adding. */
  initial?: LinkItem
  defaultCategoryId: string | null
  onSave: (draft: LinkDraft) => void
  onClose: () => void
  /** Render in place (artboard) instead of as a modal dialog. */
  inline?: boolean
  /** True while a save request is in flight. */
  saving?: boolean
  /** Message returned by the server when a save fails. */
  serverError?: string
  /** Called with the current values on every change (the artboard uses it to preview the request body). */
  onDraftChange?: (draft: LinkDraft) => void
}

export function normaliseUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`
  try {
    const u = new URL(withScheme)
    return u.hostname.includes('.') || u.hostname === 'localhost' ? u.toString() : null
  } catch {
    return null
  }
}

/** Categories flattened depth-first, for an indented <select>. */
export function categoryOptions(categories: Category[], parentId: string | null = null, depth = 0): SelectOption[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .flatMap((c) => [{ value: c.id, label: c.name, depth }, ...categoryOptions(categories, c.id, depth + 1)])
}

export function LinkForm({
  categories,
  initial,
  defaultCategoryId,
  onSave,
  onClose,
  inline,
  saving,
  serverError,
  onDraftChange,
}: Props) {
  const [url, setUrl] = useState(initial?.url ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(initial ? initial.categoryId : defaultCategoryId)
  const [rating, setRating] = useState<Rating>(initial?.rating ?? 0)
  const [errors, setErrors] = useState<{ url?: string; title?: string }>({})

  const draft = useMemo<LinkDraft>(
    () => ({
      url: normaliseUrl(url) ?? url.trim(),
      title: title.trim(),
      description: description.trim() || null,
      categoryId,
      rating,
    }),
    [url, title, description, categoryId, rating],
  )

  useEffect(() => {
    onDraftChange?.(draft)
  }, [draft, onDraftChange])

  useEffect(() => {
    if (inline) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inline, onClose])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const cleanUrl = normaliseUrl(url)
    const next = {
      url: cleanUrl ? undefined : 'Enter a web address, like example.com/article',
      title: title.trim() ? undefined : 'Add a title so you can find this link later',
    }
    setErrors(next)
    if (!cleanUrl || next.title) return
    onSave({ ...draft, url: cleanUrl })
  }

  const form = (
    <motion.form
      className={`modal ${inline ? 'modal--inline' : ''}`}
      onSubmit={submit}
      role={inline ? undefined : 'dialog'}
      aria-modal={inline ? undefined : true}
      aria-labelledby="link-form-title"
      aria-busy={saving || undefined}
      initial={inline ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      noValidate
    >
      <header className="modal__head">
        <div>
          <Eyebrow>{initial ? 'Edit' : 'New'}</Eyebrow>
          <h2 id="link-form-title">{initial ? 'Edit link' : 'Add a link'}</h2>
        </div>
        {!inline && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        )}
      </header>

      <AnimatePresence>
        {serverError && (
          <motion.div
            className="banner banner--error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="banner__inner">{serverError}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <fieldset className="modal__fields" disabled={saving}>
        <TextField
          label="Link"
          autoFocus={!inline}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          error={errors.url}
        />
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is this?"
          error={errors.title}
        />
        <TextArea
          label="Description"
          optional
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes, why it's worth keeping…"
        />
        <div className="field-row">
          <SelectField
            label="Category"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value || null)}
            options={[{ value: '', label: 'Unsorted' }, ...categoryOptions(categories)]}
          />
          <Field label="Rating">
            {() => (
              <div className="field__control">
                <StarRating value={rating} onChange={setRating} size={20} />
              </div>
            )}
          </Field>
        </div>
      </fieldset>

      <footer className="modal__foot">
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving} icon={<Icon name="check" size={14} />}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Save link'}
        </Button>
      </footer>
    </motion.form>
  )

  if (inline) return form

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {form}
    </motion.div>
  )
}
