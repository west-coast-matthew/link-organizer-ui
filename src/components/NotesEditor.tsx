import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { normaliseUrl } from '../lib/urls'
import { Field } from './form'

interface Props {
  label: ReactNode
  optional?: boolean
  /** Initial HTML. Read once when the editor is created. */
  value: string | null
  onChange: (html: string) => void
  disabled?: boolean
  placeholder?: string
  error?: ReactNode
}

/**
 * Rich text (hypertext) editor for a link's notes (spec 007), built on TipTap.
 * Produces an HTML fragment; the server sanitizes it, and every display sanitizes again.
 */
export function NotesEditor({ label, optional, value, onChange, disabled, placeholder, error }: Props) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
          isAllowedUri: (url) => /^(?:https?|mailto):/i.test(url),
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value ?? '',
    editable: !disabled,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': typeof label === 'string' ? label : 'Notes' },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.isEmpty ? '' : editor.getHTML()),
  })

  useEffect(() => {
    editor.setEditable(!disabled)
  }, [editor, disabled])

  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      bullets: editor.isActive('bulletList'),
      numbers: editor.isActive('orderedList'),
      link: editor.isActive('link'),
      empty: editor.state.selection.empty,
    }),
  })

  /* ----- Link bar ----- */

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [linkError, setLinkError] = useState<string>()
  const urlInput = useRef<HTMLInputElement>(null)

  const openLink = () => {
    const href = (editor.getAttributes('link').href as string | undefined) ?? ''
    if (href) editor.chain().focus().extendMarkRange('link').run()
    setLinkUrl(href)
    setLinkText('')
    setLinkError(undefined)
    setLinkOpen(true)
    requestAnimationFrame(() => urlInput.current?.focus())
  }

  const closeLink = () => {
    setLinkOpen(false)
    requestAnimationFrame(() => editor.commands.focus())
  }

  const applyLink = () => {
    const href = normaliseUrl(linkUrl)
    if (!href) {
      setLinkError('Enter a web address, like example.com/careers')
      return
    }
    const chain = editor.chain().focus()
    if (editor.state.selection.empty && !editor.isActive('link')) {
      // Nothing selected: insert the text (or the address itself) as a new link.
      chain
        .insertContent({ type: 'text', text: linkText.trim() || href, marks: [{ type: 'link', attrs: { href } }] })
        .insertContent(' ')
        .run()
    } else {
      chain.extendMarkRange('link').setLink({ href }).run()
    }
    setLinkOpen(false)
    // The focused input is about to unmount; put the caret back in the editor afterwards.
    requestAnimationFrame(() => editor.commands.focus())
  }

  const onLinkKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault() // don't submit the link form
      applyLink()
    }
  }

  // The modal closes on Escape at the window. While the link bar is open, Escape closes
  // only the bar: catch it first (capture phase) and stop it there.
  useEffect(() => {
    if (!linkOpen) return
    const onEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      setLinkOpen(false)
      requestAnimationFrame(() => editor.commands.focus())
    }
    window.addEventListener('keydown', onEscape, true)
    return () => window.removeEventListener('keydown', onEscape, true)
  }, [linkOpen, editor])

  const tool = (name: string, title: string, on: boolean, run: () => void, glyph: ReactNode) => (
    <button
      key={name}
      type="button"
      className={`rte__tool ${on ? 'is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={run}
    >
      {glyph}
    </button>
  )

  return (
    <Field label={label} optional={optional} error={error}>
      {({ id, describedBy, invalid }) => (
        <div className={`control control--rich ${disabled ? 'is-disabled' : ''}`} aria-invalid={invalid || undefined}>
          <div className="rte__toolbar" role="toolbar" aria-label="Notes formatting">
            {tool('bold', 'Bold', active.bold, () => editor.chain().focus().toggleBold().run(), <b>B</b>)}
            {tool('italic', 'Italic', active.italic, () => editor.chain().focus().toggleItalic().run(), <i>I</i>)}
            <span className="rte__sep" />
            {tool('bullets', 'Bulleted list', active.bullets, () => editor.chain().focus().toggleBulletList().run(), <Glyph d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />)}
            {tool('numbers', 'Numbered list', active.numbers, () => editor.chain().focus().toggleOrderedList().run(), <Glyph d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5c0-1 2.5-1.5 2.5 0 0 1-2.5 2-2.5 3.5H6" />)}
            <span className="rte__sep" />
            {tool('link', active.link ? 'Edit link' : 'Add link', active.link || linkOpen, openLink, <Glyph d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1" />)}
            {active.link &&
              tool('unlink', 'Remove link', false, () => editor.chain().focus().extendMarkRange('link').unsetLink().run(), <Glyph d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1M4 4l16 16" />)}
          </div>

          {linkOpen && (
            <div className="rte__linkbar" onKeyDown={onLinkKey}>
              <input
                ref={urlInput}
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/careers"
                aria-label="Link address"
                aria-invalid={!!linkError || undefined}
              />
              {active.empty && !active.link && (
                <input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Text (optional)" aria-label="Link text" />
              )}
              <button type="button" className="rte__linkbtn rte__linkbtn--primary" onClick={applyLink}>
                Apply
              </button>
              <button type="button" className="rte__linkbtn" onClick={closeLink}>
                Cancel
              </button>
              {linkError && (
                <span className="field__error rte__linkerror" role="alert">
                  {linkError}
                </span>
              )}
            </div>
          )}

          <EditorContent editor={editor} className="rte__content notes" id={id} aria-describedby={describedBy} />
        </div>
      )}
    </Field>
  )
}

function Glyph({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
