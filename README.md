# Link organizer application

The purpose of this application is to establish an application that stores links and related notes for articles that I browse on the web. I tend to spend a lot of time browsing the web, I find a lot of information, typically storing it in local files. Organization has become an issue, due to the amount of links, this has become a pain point. 

I wanted to establish a better methdology for organizing links. I need organize things structurally, support the ability to assign meta information, etc. which defines the scope of this effort.

The initial effort will be one where we take an MVP approach. We will byoass user roles, and assume there is a single user running this locally. 

## link definitions

A link definition started out describing a single link. It now describes a *parent* link, for
example `https://www.wonderfull.co`, which can carry notes about related material, including
sub-links such as the site's "Careers" and "About" pages.

* title
* link (the parent link)
* description (optional, plain text)
* notes (optional, rich text): formatted text, lists and hyperlinks, written with the rich text
  editor in the add/edit form. Use it for sub-links and anything else related to the parent link.
  Notes are stored as sanitized HTML (spec 007 here, spec 003 in link-organizer-api).
* 1-5 for star rating (0 = not rated)

Cards show a link's notes under its description; in list mode, rows with notes have a
**Notes** toggle that expands them. Links in notes open in a new tab.

## Requirements:
1. Support the ability to store links by categories in a hierachal manner, i.e. a parent category called 'food links' may have child categories such as 'italian' and 'mexican'.
2. define links wich reside within an parent category
3. support user interaction for interactig with links

## Running the app

```sh
npm install
npm run dev        # http://127.0.0.1:5173
```

## Connecting to the API

The app can talk to either of two backends:

- **Mock API (default).** Data comes from the JSON files in `mock-data/` and is saved in the browser's local storage. Every call waits 3–6 seconds and sometimes fails, so the loading and error states can be seen.
- **Real API.** Calls go to a running [link-organizer-api](../link-organizer-api) server. Its endpoints are documented in `../link-organizer-api/docs/API.md`.

The real API is used whenever `VITE_API_BASE_URL` is set. If it's missing or empty, the app falls back to the mock.

To use the real API:

1. Start the API server (see its README). By default it listens on `http://127.0.0.1:3000`.
2. Create `.env.local` in this folder (it's ignored by git), or copy `.env.example`, and set the endpoint:
   ```sh
   VITE_API_BASE_URL=http://127.0.0.1:3000
   ```
   Use the server's base address only, without `/api` or a trailing path.
3. Restart `npm run dev`. Vite reads the setting only at startup, and bakes it into `npm run build` output.

You can also set it for a single run: `VITE_API_BASE_URL=http://127.0.0.1:3000 npm run dev`.

To go back to the mock, remove the line or leave it empty, then restart. In development the browser console logs which backend is in use (`[api] using …`).

If the app shows "Can't reach the server at …", check that the API is running at that address and that its `CORS_ORIGIN` setting allows the UI's origin. The defaults allow both Vite ports `5173` and `5174` on `localhost` and `127.0.0.1`; if you change `CORS_ORIGIN`, include the origin shown in the browser's address bar. Restart the API after changing its configuration.

The mock's delay and failure rate are set with `VITE_MOCK_MIN_DELAY_MS`, `VITE_MOCK_MAX_DELAY_MS` and `VITE_MOCK_ERROR_RATE`; see `.env.example`.
