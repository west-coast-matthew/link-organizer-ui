status: completed

# 008 — implement json import and export

## Summary

Let the user download every category and link as a single backup file, and restore
(import) such a file later. Database backups remain an option, but this gives a portable,
readable backup from the app itself.

The server side, including the file format and merge rules, is defined by
link-organizer-api spec 004 (`GET /api/export`, `POST /api/import`). The file is JSON: notes
are rich text HTML, and JSON string escaping carries them safely, so no custom format is needed.

## Requirements

1. **Contract.** Add `mock-data/backup/export.json` and `mock-data/backup/import.json` call
   definitions (method, path, request, responses, rules, errors) matching API spec 004, list
   them in `mock-data/README.md`, and mirror the types in `src/types.ts` (`ExportDocument`,
   `ImportBackupResponse`, skipped entries). In the file, `rating` uses the API's spelling:
   1–5 or `null` for not rated (the UI's `0`).

2. **Services.** Add `exportData()` and `importData(document)` to `LinkManagementApi`
   (`src/services/contract.ts`).
   - **HTTP** (`link-mgmnt-http.ts`): `GET /api/export` and `POST /api/import`, passing the
     document through unchanged.
   - **Mock** (`link-mgmnt-services.ts`): the same behavior as the API, so files move freely
     between the mock and a real server: same format and version checks, merge rules
     (existing ids kept, same-name siblings merged, missing parents → top-level, missing
     categories → unsorted, duplicate URLs skipped, link validation and notes sanitizing as on
     create, ids and timestamps kept), and the same response shape. Export writes `rating: null`
     for unrated links; import maps `null` back to `0`.

3. **Query hooks.** `useExportData()` and `useImportData()` in `link-mgmnt-queries.ts`.
   After an import that created anything, refetch categories and links.

4. **Backup & restore dialog.** A "Backup & restore" button in the sidebar, below
   "New category", opens a modal with two parts:
   - **Export:** "Download backup" saves the document as
     `link-organizer-backup-YYYY-MM-DD.json`, showing progress and any error.
   - **Restore:** pick a `.json` file. The dialog reads it in the browser and checks it before
     sending: not JSON, wrong `format` or unsupported `version` show a clear message and
     disable import. A valid file shows its name, export date and number of categories and
     links. The dialog explains that existing data is kept and duplicate URLs are skipped.
     "Import" sends it; while it runs the form is disabled and a loading panel shows.
   - **Result:** numbers of categories created/merged and links imported/skipped, the
     skipped entries with their reasons (first 8, then "and N more"), and "Import another" / "Done".
   - Server errors show in the dialog's error banner. Escape and backdrop click close it
     unless a request is running. Follows the existing modal styling in light and dark themes.

5. **README.** Add a short "Backup and restore" section.

## Acceptance criteria

- `npm run build` passes.
- With the mock: export downloads a file holding every category and link with notes; after
  `mockApi.reset()` plus deleting a few links, importing that file brings them back, and
  importing it again reports every link as skipped.
- A non-JSON file, or JSON that isn't an export, is refused before anything is sent.
- A file exported from the mock imports into the real API, and vice versa.
- Works against the mock and the real API.
