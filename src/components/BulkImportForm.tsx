import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Category, ImportLinksInput, ImportLinksResponse } from '../types'
import { checkBulkLinks, MAX_ENTRY_LINES } from '../lib/bulk-links'
import { categoryPath } from '../lib/categories'
import { categoryOptions } from './LinkForm'
import { LoadingStatePanel } from './LoadingStatePanel'
import { Eyebrow, Icon } from './ui'
import { Button, SelectField, TextArea } from './form'

interface Props {
  categories: Category[]
  /** URLs already saved, so entries that will be skipped as duplicates can be flagged while typing. */
  savedUrls: ReadonlySet<string>
  defaultCategoryId: string | null
  onImport: (input: ImportLinksInput) => void
  onClose: () => void
  /** Clears a finished import so the form can be used again. */
  onReset: () => void
  /** True while the import request is in flight. */
  importing?: boolean
  /** Message returned by the server when the whole import is rejected. */
  serverError?: string
  /** The server's answer once the import has finished. */
  result?: ImportLinksResponse
}

const EXAMPLE = `link 1
http://www.somewhere.com

some other link
http://www.foo.com
this is a really great site....`

/** How many problems to list before collapsing the rest into "and N more". */
const SHOWN_ISSUES = 8

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

export function BulkImportForm({
  categories,
  savedUrls,
  defaultCategoryId,
  onImport,
  onClose,
  onReset,
  importing,
  serverError,
  result,
}: Props) {
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId)
  // Checking a long paste on every keystroke can lag; let React check the latest text when it's idle.
  const deferredText = useDeferredValue(text)
  const check = useMemo(() => checkBulkLinks(deferredText, savedUrls), [deferredText, savedUrls])
  const checking = deferredText !== text
  const canImport = !importing && !checking && check.errors === 0 && check.ready > 0

  const categoryName = categoryId ? categoryPath(categories, categoryId).join(' / ') : 'Unsorted'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !importing && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [importing, onClose])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (canImport) onImport({ text, categoryId })
  }

  const importMore = () => {
    setText('')
    onReset()
  }

  const errors = check.issues.filter((i) => i.severity === 'error')
  const warnings = check.issues.filter((i) => i.severity === 'warning')
  const listed = [...errors, ...warnings]

  const body = result ? (
    <>
      <header className="modal__head">
        <div>
          <Eyebrow>Bulk import</Eyebrow>
          <h2 id="bulk-form-title">Import finished</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>

      <div className="bulk__summary" role="status">
        <span className="bulk__total">
          <strong>{result.meta.created.toLocaleString()}</strong> {result.meta.created === 1 ? 'link' : 'links'} imported
        </span>
        <span className="bulk__where">
          <Icon name="folder" size={14} /> {categoryName}
        </span>
        {result.meta.skipped > 0 && <span className="bulk__chip bulk__chip--warn">{plural(result.meta.skipped, 'skipped', 'skipped')}</span>}
      </div>

      {result.data.skipped.length > 0 && (
        <ul className="bulk__issues" aria-label="Skipped entries">
          {result.data.skipped.map((s) => (
            <li key={s.entry} className="bulk__issue is-warning">
              <span className="bulk__line mono">Line {s.line}</span>
              <span>
                <strong>{s.title || s.url || `Entry ${s.entry}`}</strong> {s.message}
              </span>
            </li>
          ))}
        </ul>
      )}

      <footer className="modal__foot">
        <Button onClick={importMore}>Import more</Button>
        <Button variant="primary" onClick={onClose} icon={<Icon name="check" size={14} />}>
          Done
        </Button>
      </footer>
    </>
  ) : (
    <>
      <header className="modal__head">
        <div>
          <Eyebrow>Bulk import</Eyebrow>
          <h2 id="bulk-form-title">Import links</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" disabled={importing}>
          <Icon name="close" />
        </button>
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

      <fieldset className="modal__fields" disabled={importing}>
        <SelectField
          label="Category for every link"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
          options={[{ value: '', label: 'Unsorted' }, ...categoryOptions(categories)]}
        />
        <TextArea
          label="Links"
          className="bulk__field"
          autoFocus
          rows={12}
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          hint={`Title on the first line, link on the second, then up to ${MAX_ENTRY_LINES - 2} lines of description. Leave a blank line between links.`}
        />
      </fieldset>

      <div className="bulk__summary" aria-live="polite">
        <span className="bulk__total">
          <strong>{check.entries.length.toLocaleString()}</strong> {check.entries.length === 1 ? 'link' : 'links'} entered
        </span>
        {check.entries.length > 0 && (
          <>
            <span className="bulk__chip bulk__chip--ok">{plural(check.ready, 'ready', 'ready')}</span>
            {check.errors > 0 && <span className="bulk__chip bulk__chip--error">{plural(check.errors, 'needs fixing', 'need fixing')}</span>}
            {check.duplicates > 0 && <span className="bulk__chip bulk__chip--warn">{plural(check.duplicates, 'will be skipped', 'will be skipped')}</span>}
          </>
        )}
      </div>

      {importing ? (
        <LoadingStatePanel
          size="compact"
          title={`Importing ${plural(check.ready, 'link')}…`}
          message="Thumbnails are generated in the background afterwards."
        />
      ) : (
        listed.length > 0 && (
          <ul className="bulk__issues" aria-label="Problems">
            {listed.slice(0, SHOWN_ISSUES).map((issue, i) => (
              <li key={`${issue.entry}-${i}`} className={`bulk__issue is-${issue.severity}`}>
                <span className="bulk__line mono">{issue.line ? `Line ${issue.line}` : 'All'}</span>
                <span>{issue.message}</span>
              </li>
            ))}
            {listed.length > SHOWN_ISSUES && <li className="bulk__more">and {plural(listed.length - SHOWN_ISSUES, 'more problem')}</li>}
          </ul>
        )
      )}

      <footer className="modal__foot">
        <Button onClick={onClose} disabled={importing}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={importing} disabled={!canImport} icon={<Icon name="import" size={14} />}>
          {importing ? 'Importing…' : check.ready > 0 ? `Import ${plural(check.ready, 'link')}` : 'Import links'}
        </Button>
      </footer>
    </>
  )

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && !importing && onClose()}
    >
      <motion.form
        className="modal modal--wide"
        onSubmit={submit}
        role="dialog"
        aria-modal
        aria-labelledby="bulk-form-title"
        aria-busy={importing || undefined}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        noValidate
      >
        {body}
      </motion.form>
    </motion.div>
  )
}
