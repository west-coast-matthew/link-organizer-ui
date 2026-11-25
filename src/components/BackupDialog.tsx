import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ImportBackupResponse } from '../types'
import { backupFileName, downloadBackup, readBackupText, type BackupFileCheck } from '../lib/backup'
import { describeError } from '../services/contract'
import { useExportData, useImportData } from '../services/link-mgmnt-queries'
import { LoadingStatePanel } from './LoadingStatePanel'
import { StatusText } from './StatusText'
import { Eyebrow, Icon } from './ui'
import { Button } from './form'

/** How many skipped entries to list before collapsing the rest into "and N more". */
const SHOWN_SKIPPED = 8

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const formatDate = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

type PickedFile = { name: string; check: BackupFileCheck }

/**
 * Backup & restore (spec 008). Export downloads every category and link as one JSON
 * file; restore reads such a file, checks it in the browser, and merges it into the data.
 */
export function BackupDialog({ onClose }: { onClose: () => void }) {
  const exportData = useExportData()
  const importData = useImportData()
  const [file, setFile] = useState<PickedFile | null>(null)
  const [reading, setReading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const busy = exportData.isPending || importData.isPending

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const download = () => exportData.mutate(undefined, { onSuccess: downloadBackup })

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    // Clear the input so picking the same file again still fires a change.
    e.target.value = ''
    if (!picked) return
    importData.reset()
    setReading(true)
    try {
      setFile({ name: picked.name, check: readBackupText(await picked.text()) })
    } catch {
      setFile({ name: picked.name, check: { ok: false, message: "This file couldn't be read." } })
    } finally {
      setReading(false)
    }
  }

  const restore = () => file?.check.ok && importData.mutate(file.check.doc)

  const importAnother = () => {
    setFile(null)
    importData.reset()
  }

  const doc = file?.check.ok ? file.check.doc : null
  const exportedAt = doc ? formatDate(doc.exportedAt) : null

  const body = importData.data ? (
    <RestoreResult result={importData.data} fileName={file?.name} onClose={onClose} onImportAnother={importAnother} />
  ) : (
    <>
      <header className="modal__head">
        <div>
          <Eyebrow>Backup</Eyebrow>
          <h2 id="backup-title">Backup &amp; restore</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
          <Icon name="close" />
        </button>
      </header>

      <AnimatePresence>
        {importData.isError && (
          <motion.div
            className="banner banner--error"
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="banner__inner">Couldn't restore the backup. {describeError(importData.error)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="backup__part" aria-labelledby="backup-export">
        <h3 id="backup-export" className="backup__title">
          Export
        </h3>
        <p className="backup__text">
          Download every category and link, with notes and ratings, as one JSON file. Thumbnails aren't included; they're
          made again after a restore.
        </p>
        <div className="backup__row">
          <Button
            onClick={download}
            loading={exportData.isPending}
            disabled={busy}
            icon={<Icon name="import" size={14} />}
          >
            {exportData.isPending ? 'Preparing…' : 'Download backup'}
          </Button>
          {exportData.isSuccess && (
            <span className="backup__note" role="status">
              <Icon name="check" size={14} /> Saved <span className="mono">{backupFileName(exportData.data)}</span> ·{' '}
              {plural(exportData.data.counts.categories, 'category', 'categories')}, {plural(exportData.data.counts.links, 'link')}
            </span>
          )}
        </div>
        {exportData.isError && (
          <StatusText tone="error" onRetry={download}>
            Couldn't make the backup. {describeError(exportData.error)}
          </StatusText>
        )}
      </section>

      <section className="backup__part" aria-labelledby="backup-restore">
        <h3 id="backup-restore" className="backup__title">
          Restore
        </h3>
        <p className="backup__text">
          Pick a backup file to add its categories and links. Nothing is overwritten or deleted: what you already have is
          kept, and links whose address is already saved are skipped.
        </p>

        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={pick} />
        <div className="backup__row">
          <Button onClick={() => fileInput.current?.click()} disabled={busy || reading} loading={reading} icon={<Icon name="upload" size={14} />}>
            {file ? 'Choose another file…' : 'Choose file…'}
          </Button>
        </div>

        {file && (
          <div className={`backup__file ${file.check.ok ? '' : 'is-error'}`} aria-live="polite">
            <span className="backup__file-name mono">{file.name}</span>
            {doc ? (
              <span className="backup__file-meta">
                {exportedAt && <>Exported {exportedAt} · </>}
                {plural(doc.categories.length, 'category', 'categories')} · {plural(doc.links.length, 'link')}
              </span>
            ) : (
              !file.check.ok && <span className="backup__file-meta">{file.check.message}</span>
            )}
          </div>
        )}

        {importData.isPending && doc && (
          <LoadingStatePanel
            size="compact"
            title={`Restoring ${plural(doc.links.length, 'link')}…`}
            message="Thumbnails are generated in the background afterwards."
          />
        )}
      </section>

      <footer className="modal__foot">
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={restore}
          loading={importData.isPending}
          disabled={!doc || busy}
          icon={<Icon name="upload" size={14} />}
        >
          {importData.isPending ? 'Restoring…' : doc ? `Restore ${plural(doc.links.length, 'link')}` : 'Restore'}
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
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <motion.div
        className="modal modal--wide"
        role="dialog"
        aria-modal
        aria-labelledby="backup-title"
        aria-busy={busy || undefined}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      >
        {body}
      </motion.div>
    </motion.div>
  )
}

/** What a finished restore did: counts, then every skipped entry with its reason. */
function RestoreResult({
  result,
  fileName,
  onClose,
  onImportAnother,
}: {
  result: ImportBackupResponse
  fileName?: string
  onClose: () => void
  onImportAnother: () => void
}) {
  const { categories, links } = result.data
  const skipped = [
    ...categories.skipped.map((s) => ({ key: `c${s.index}`, where: `Category ${s.index}`, label: s.name || 'Unnamed category', message: s.message })),
    ...links.skipped.map((s) => ({ key: `l${s.index}`, where: `Link ${s.index}`, label: s.title || s.url || 'Untitled link', message: s.message })),
  ]

  return (
    <>
      <header className="modal__head">
        <div>
          <Eyebrow>Backup</Eyebrow>
          <h2 id="backup-title">Restore finished</h2>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>

      {fileName && <p className="backup__text mono">{fileName}</p>}

      <div className="bulk__summary" role="status">
        <span className="bulk__total">
          <strong>{links.created.toLocaleString()}</strong> {links.created === 1 ? 'link' : 'links'} restored
        </span>
        {categories.created > 0 && (
          <span className="bulk__chip bulk__chip--ok">{plural(categories.created, 'category', 'categories')} added</span>
        )}
        {categories.merged > 0 && <span className="bulk__chip">{plural(categories.merged, 'category', 'categories')} merged</span>}
        {links.skipped.length > 0 && <span className="bulk__chip bulk__chip--warn">{plural(links.skipped.length, 'link')} skipped</span>}
        {categories.skipped.length > 0 && (
          <span className="bulk__chip bulk__chip--warn">{plural(categories.skipped.length, 'category', 'categories')} skipped</span>
        )}
      </div>

      {skipped.length > 0 && (
        <ul className="bulk__issues" aria-label="Skipped entries">
          {skipped.slice(0, SHOWN_SKIPPED).map((s) => (
            <li key={s.key} className="bulk__issue is-warning">
              <span className="bulk__line mono">{s.where}</span>
              <span>
                <strong>{s.label}</strong> {s.message}
              </span>
            </li>
          ))}
          {skipped.length > SHOWN_SKIPPED && <li className="bulk__more">and {plural(skipped.length - SHOWN_SKIPPED, 'more')}</li>}
        </ul>
      )}

      <footer className="modal__foot">
        <Button onClick={onImportAnother}>Import another</Button>
        <Button variant="primary" onClick={onClose} icon={<Icon name="check" size={14} />}>
          Done
        </Button>
      </footer>
    </>
  )
}
