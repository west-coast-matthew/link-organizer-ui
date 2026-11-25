# Mock data: the API contract

These files define the REST API the backend will implement. Until it exists,
`src/services/link-mgmnt-services.ts` emulates it from these same files, so the
UI is built against the contract rather than against ad-hoc fixtures.

| File | What it defines |
| --- | --- |
| `models.json` | The `Category` and `Link` resources: fields, types, limits, defaults. |
| `errors.json` | The error envelope and every error code, with status and user-facing message. |
| `categories/*.json`, `links/*.json` | One file per call: method, path, request, responses, possible errors, and business rules. |
| `backup/*.json` | Export of all data as one backup file, and import of that file (spec 008). |

Conventions:

- Success bodies are wrapped in `{ "data": ... }`; lists add `{ "meta": { "total": n } }`.
- Errors are `{ "error": { "code", "message", "details"? } }`; `message` is safe to show users.
- Timestamps are ISO 8601 UTC. Ids are UUIDs. Optional values are `null`, never omitted.
- Exception: `GET /api/export` returns the backup file itself, not `{ "data": ... }`.
- `PATCH` is a partial update; `DELETE` of a link returns `204` with no body.

The `200` responses of `categories/list.json` and `links/list.json` double as the
mock backend's seed data. Change the contract here first, then the service.
