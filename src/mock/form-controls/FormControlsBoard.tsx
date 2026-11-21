import { useCallback, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Category, LinkDraft, Rating } from '../../types'
import { Button, Checkbox, SelectField, TextArea, TextField } from '../../components/form'
import { StarRating } from '../../components/StarRating'
import { LinkForm, categoryOptions } from '../../components/LinkForm'
import { Annotated, Eyebrow, Icon, Toggle } from '../../components/ui'
import { TokenPanel } from './TokenPanel'
import categoriesList from '../../../mock-data/categories/list.json'

/* Categories straight from the API contract's seed data; the artboard never calls the service. */
const CATEGORIES = categoriesList.responses[0].body.data as Category[]
const ITALIAN_ID = CATEGORIES.find((c) => c.name === 'Italian')!.id
const REACT_ID = CATEGORIES.find((c) => c.name === 'React')!.id
const OPTIONS = [{ value: '', label: 'Unsorted' }, ...categoryOptions(CATEGORIES)]

/** One specimen on the board, with its state written underneath. */
function Specimen({ caption, children, wide }: { caption: string; children: ReactNode; wide?: boolean }) {
  return (
    <figure className={`specimen ${wide ? 'specimen--wide' : ''}`}>
      <div className="specimen__body">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/** A control family: specimens on the left, a leader line out to the note on the right. */
function Plate({
  id,
  component,
  title,
  note,
  children,
}: {
  id: string
  component: string
  title: string
  note: ReactNode
  children: ReactNode
}) {
  return (
    <section className="plate" id={id} aria-labelledby={`${id}-title`}>
      <div className="plate__stage">{children}</div>
      <aside className="plate__note">
        <Eyebrow>{component}</Eyebrow>
        <h2 id={`${id}-title`}>{title}</h2>
        <div className="plate__copy">{note}</div>
      </aside>
    </section>
  )
}

function ButtonsPlate() {
  const variants = ['primary', 'ghost', 'dashed'] as const
  return (
    <Plate
      id="buttons"
      component="<Button>"
      title="Buttons"
      note={
        <>
          <p>Primary is for the single action that saves. Everything else is ghost; dashed is for “create something new” in lists.</p>
          <p>Saving replaces the icon with a spinner and blocks repeat clicks while the request is out.</p>
        </>
      }
    >
      <div className="specimen-grid specimen-grid--buttons">
        {variants.map((v) => (
          <div className="specimen-row" key={v}>
            <span className="specimen-row__name">{v[0].toUpperCase() + v.slice(1)}</span>
            <Specimen caption="Rest">
              <Button variant={v}>Save link</Button>
            </Specimen>
            <Specimen caption="Hover">
              <Button variant={v} forceState="hover">
                Save link
              </Button>
            </Specimen>
            <Specimen caption="Focus">
              <Button variant={v} forceState="focus">
                Save link
              </Button>
            </Specimen>
            <Specimen caption="Disabled">
              <Button variant={v} disabled>
                Save link
              </Button>
            </Specimen>
            <Specimen caption="Saving">
              <Button variant={v} loading>
                Saving…
              </Button>
            </Specimen>
          </div>
        ))}
        <div className="specimen-row">
          <span className="specimen-row__name">Large</span>
          <Specimen caption="With icon" wide>
            <Button variant="primary" size="lg" icon={<Icon name="plus" size={16} />}>
              Add link
            </Button>
          </Specimen>
          <Specimen caption="Link out" wide>
            <Button icon={null}>
              Open link <Icon name="arrow" size={14} />
            </Button>
          </Specimen>
        </div>
      </div>
    </Plate>
  )
}

function TextPlate() {
  const [value, setValue] = useState('seriouseats.com/cacio-e-pepe')
  return (
    <Plate
      id="text"
      component="<TextField>"
      title="Text fields"
      note={
        <>
          <p>Focus swaps the border to a dashed accent line, borrowed from the annotation frames in the reference.</p>
          <p>Errors say what to type, not what went wrong. They sit directly under the field and are announced to screen readers.</p>
        </>
      }
    >
      <div className="specimen-grid specimen-grid--fields">
        <Specimen caption="Empty">
          <TextField label="Link" placeholder="https://example.com/article" />
        </Specimen>
        <Specimen caption="Filled">
          <TextField label="Link" value={value} onChange={(e) => setValue(e.target.value)} />
        </Specimen>
        <Specimen caption="Focus">
          <TextField label="Title" forceState="focus" defaultValue="Cacio e pepe, properly" />
        </Specimen>
        <Specimen caption="Error">
          <TextField label="Link" defaultValue="cacio e pepe" error="Enter a web address, like example.com/article" />
        </Specimen>
        <Specimen caption="Hint">
          <TextField label="Title" placeholder="What is this?" hint="Shown on the card and used by search." />
        </Specimen>
        <Specimen caption="Disabled">
          <TextField label="Link" disabled defaultValue="motion.dev/docs/react" />
        </Specimen>
        <Specimen caption="Search, with prefix" wide>
          <TextField label="Search" placeholder="Search links…" prefix={<Icon name="search" />} />
        </Specimen>
      </div>
    </Plate>
  )
}

function LongFormPlate() {
  const [cat, setCat] = useState(ITALIAN_ID)
  return (
    <Plate
      id="longform"
      component="<TextArea> · <SelectField>"
      title="Description and category"
      note={
        <p>
          The category list is the tree flattened in order, with subcategories indented under their parent, so a link can be
          filed at any depth.
        </p>
      }
    >
      <div className="specimen-grid specimen-grid--fields">
        <Specimen caption="Description, empty">
          <TextArea label="Description" optional placeholder="Notes, why it's worth keeping…" />
        </Specimen>
        <Specimen caption="Description, focus">
          <TextArea
            label="Description"
            optional
            forceState="focus"
            defaultValue="The emulsion trick that keeps the cheese from clumping."
          />
        </Specimen>
        <Specimen caption="Category">
          <SelectField label="Category" value={cat} onChange={(e) => setCat(e.target.value)} options={OPTIONS} />
        </Specimen>
        <Specimen caption="Category, focus">
          <SelectField label="Category" forceState="focus" defaultValue={REACT_ID} options={OPTIONS} />
        </Specimen>
      </div>
    </Plate>
  )
}

function RatingPlate() {
  const [rating, setRating] = useState<Rating>(4)
  return (
    <Plate
      id="rating"
      component="<StarRating>"
      title="Star rating"
      note={
        <>
          <p>0 means not rated yet. Click a star to set the rating; click the same star again to clear it.</p>
          <p>From the keyboard: arrows step, 0–5 jump, Backspace clears.</p>
        </>
      }
    >
      <div className="rating-stage">
        <Annotated className="rating-stage__hero">
          <StarRating value={rating} onChange={setRating} size={34} />
        </Annotated>
        <p className="rating-stage__value">
          {rating ? `Rated ${rating} of 5` : 'Not rated'}
        </p>
      </div>
      <div className="specimen-grid specimen-grid--ratings">
        {([0, 1, 2, 3, 4, 5] as Rating[]).map((r) => (
          <Specimen key={r} caption={r ? `${r} of 5, read only` : 'Unrated, read only'}>
            <StarRating value={r} size={16} />
          </Specimen>
        ))}
        <Specimen caption="Card size, interactive" wide>
          <StarRating value={rating} onChange={setRating} size={18} />
        </Specimen>
        <Specimen caption="Form size, interactive" wide>
          <StarRating value={rating} onChange={setRating} size={20} />
        </Specimen>
      </div>
    </Plate>
  )
}

function ChoicePlate() {
  const [sort, setSort] = useState<'newest' | 'rating'>('newest')
  const [a, setA] = useState(true)
  const [b, setB] = useState(false)
  return (
    <Plate
      id="choices"
      component="<Toggle> · <Checkbox>"
      title="Toggles and checkboxes"
      note={
        <p>
          The toggle is for a choice between two views of the same list. Checkboxes are for independent on/off settings;
          the check draws in so the change is visible.
        </p>
      }
    >
      <div className="specimen-grid specimen-grid--fields">
        <Specimen caption="Sort toggle" wide>
          <Toggle
            left={{ value: 'newest', label: 'Newest' }}
            right={{ value: 'rating', label: 'Top rated' }}
            value={sort}
            onChange={setSort}
          />
        </Specimen>
        <Specimen caption="Checked">
          <Checkbox label="Open links in a new tab" checked={a} onChange={setA} />
        </Specimen>
        <Specimen caption="Unchecked">
          <Checkbox label="Show unrated links" checked={b} onChange={setB} />
        </Specimen>
        <Specimen caption="Focus">
          <Checkbox label="Show unrated links" checked={false} forceState="focus" />
        </Specimen>
        <Specimen caption="Disabled">
          <Checkbox label="Sync with server" checked={false} disabled />
        </Specimen>
        <Specimen caption="Chip">
          <span className="chip">
            <Icon name="spark" size={12} /> Top pick
          </span>
        </Specimen>
      </div>
    </Plate>
  )
}

type Outcome = { kind: 'saved'; at: string } | null

function ComposedPlate() {
  const [draft, setDraft] = useState<LinkDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string>()
  const [failNext, setFailNext] = useState(false)
  const [slow, setSlow] = useState(true)
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [formKey, setFormKey] = useState(0)
  const timer = useRef<number>(undefined)

  const onDraftChange = useCallback((d: LinkDraft) => setDraft(d), [])

  // Stand-in for the REST call: no request is made; this only plays out the states.
  const save = () => {
    setServerError(undefined)
    setOutcome(null)
    setSaving(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => {
        setSaving(false)
        if (failNext) setServerError('This link is already saved in Food links / Italian.')
        else setOutcome({ kind: 'saved', at: new Date().toLocaleTimeString() })
      },
      slow ? 1400 : 250,
    )
  }

  const reset = () => {
    window.clearTimeout(timer.current)
    setSaving(false)
    setServerError(undefined)
    setOutcome(null)
    setFormKey((k) => k + 1)
  }

  return (
    <Plate
      id="composed"
      component="<LinkForm>"
      title="Add a link, end to end"
      note={
        <>
          <p>The real form, built from the controls above. Save it to walk through the request states.</p>
          <p>
            The panel beside it shows the body the form would send. The API isn't built yet, so the endpoint and shape are
            placeholders.
          </p>
          <div className="plate__switches">
            <Checkbox label="Slow network" checked={slow} onChange={setSlow} />
            <Checkbox label="Server rejects the save" checked={failNext} onChange={setFailNext} />
          </div>
        </>
      }
    >
      <div className="composed">
        <LinkForm
          key={formKey}
          inline
          categories={CATEGORIES}
          defaultCategoryId={ITALIAN_ID}
          initial={undefined}
          onSave={save}
          onClose={reset}
          saving={saving}
          serverError={serverError}
          onDraftChange={onDraftChange}
        />
        <div className="request">
          <div className="request__line">
            <span className="request__method">POST</span>
            <code>/api/links</code>
            <span className={`request__status ${saving ? 'is-pending' : serverError ? 'is-error' : outcome ? 'is-ok' : ''}`}>
              {saving ? 'Pending' : serverError ? '409 Conflict' : outcome ? '201 Created' : 'Not sent'}
            </span>
          </div>
          <pre className="request__body">{draft ? JSON.stringify(draft, null, 2) : '{}'}</pre>
          <AnimatePresence>
            {outcome && (
              <motion.p className="request__note" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                Saved at {outcome.at}. In the app the dialog would close and the card would appear at the top of the list.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Plate>
  )
}

const SECTIONS = [
  ['buttons', 'Buttons'],
  ['text', 'Text fields'],
  ['longform', 'Description and category'],
  ['rating', 'Star rating'],
  ['choices', 'Toggles and checkboxes'],
  ['composed', 'Add a link'],
] as const

export function FormControlsBoard() {
  return (
    <div className="artboard">
      <div className="artboard__main">
        <header className="artboard__head">
          <a className="artboard__back" href="/">
            Back to the app
          </a>
          <h1>Form controls</h1>
          <p>
            Every control used to add and edit links, in each of its states. Adjust the tokens in Tweaks to try a new look
            here; when you like it, Copy CSS gives you the values to paste into <code>src/styles.css</code> so the app picks
            them up.
          </p>
          <nav className="artboard__toc" aria-label="Sections">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
        </header>

        <ButtonsPlate />
        <TextPlate />
        <LongFormPlate />
        <RatingPlate />
        <ChoicePlate />
        <ComposedPlate />
      </div>
      <TokenPanel />
    </div>
  )
}
