status: ready

# 007 — add rich text notes to link definitions

## Summary

Until now a link definition described a single link. A link now acts as a *parent* link
(for example `https://www.wonderfull.co`), and we need somewhere to record related
material under it, including sub-links such as the site's "Careers" and "About" pages.

Add an optional `notes` attribute to links, edited with a rich text (hypertext) editor in
the add/edit link form and shown on cards and rows. The API work is covered by
link-organizer-api spec 003.

## Requirements

1. **Contract.** Add `notes` to `Link` in `mock-data/models.json`
   (`type: ["string", "null"]`, `maxLength: 20000`, `default: null`, HTML fragment, sanitized
   by the server), to the create/update request fields and rules, and to the link examples
   in `mock-data/links/*.json`. Mirror it in `src/types.ts` (`LinkItem`, `CreateLinkInput`,
   `LinkDraft`).
2. **Mock service.** `link-mgmnt-services.ts` validates and sanitizes `notes` with the same
   rules as the API (allowlist, empty → `null`, 20 000-character limit), so the mock and
   the real API behave the same. Bulk-imported links get `notes: null`.
3. **HTTP service.** Passes `notes` through unchanged in both directions.
4. **Rich text editor.** In `LinkForm`, add an optional "Notes" field below Description using
   a rich text editor (TipTap). Toolbar: bold, italic, bulleted list, numbered list, add/edit
   link, remove link. Adding a link asks for a URL (scheme added if missing, as for the
   main link field); links in the editor are not followed on click. The editor works in both
   add and edit modes, loads existing notes when editing, follows the form's disabled state
   while saving, and matches the app's existing field styling in light and dark themes.
5. **Display.** Render notes as sanitized HTML (DOMPurify, same allowlist) — never insert
   unsanitized HTML.
   - **Card view:** notes appear below the description; links open in a new tab.
   - **List view:** rows with notes show a "Notes" toggle that expands the notes under the row.
6. **README.** Update the "link definitions" section to describe parent links and notes.

## Acceptance criteria

- `npm run build` passes.
- Creating a link with notes containing a bulleted list of "Careers" and "About" sub-links
  shows them on the card and, expanded, in list view, with working links that open in new tabs.
- Editing a link shows its existing notes in the editor; changes save; clearing the editor
  saves `notes: null`.
- Pasted `<script>`, `onclick` or `javascript:` content never runs or survives saving.
- Works against the mock and the real API.
