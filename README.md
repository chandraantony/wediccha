# Ice & Chandra Wedding Invitation

React invitation with event locations, attendance confirmations, and a public guestbook.

## Run locally

```sh
npm install
npm run dev
```

The development server also serves the response API. Both forms save to the same JSON file and update the attendance counters and guestbook after a successful save. Other guests' responses refresh every 30 seconds while the invitation is visible.

## Run in production

```sh
npm run build
npm start
```

The Node server serves the built invitation and API on port 3000. Use `PORT` and `HOST` to change its address; set `HOST=0.0.0.0` when the host needs to accept external connections. In this mode responses are stored in the local JSON file (see below), which needs a writable, persistent directory.

### Deploy to Vercel

Vercel serves `dist/` and runs the API from `api/` as serverless functions. Serverless filesystems are read-only, so the JSON file is stored in **Vercel Blob** instead of on disk. Setup:

1. Import the project into Vercel (the Vite preset is configured in `vercel.json`).
2. In the project's Storage tab, create a Blob store and connect it. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically. Access defaults to **public**; for a private store set `WEDDING_BLOB_ACCESS=private`.
3. Deploy. `api/guest-responses.js`, `api/rsvps.js`, and `api/wishes.js` expose the same API as the Node server.

Responses live in one blob at `wedding/guest-responses.json`. Writes use the blob ETag with `ifMatch` and retry on conflict, so concurrent submissions are not lost. Set `WEDDING_BLOB_PATH` to change the blob pathname and `WEDDING_BLOB_ACCESS` to `private` (with a private store) or `public`.

> **Privacy:** with the default public access, the blob URL is readable by anyone who has it, and it contains every RSVP record. Use a private store plus `WEDDING_BLOB_ACCESS=private` if that matters.

## Response storage

Responses are a single JSON document with this shape:

- `rsvps`: guest name, attendance choice, guest count, and timestamps.
- `wishes`: guest name, message, and timestamp.

Two backends implement the same logic:

- **Vercel:** `server/blob-guest-store.mjs` stores the JSON in a Vercel Blob (configured above).
- **Node server / local:** responses are stored in `data/guest-responses.json`, outside the public site. The file is created on the first API request. Set `WEDDING_DATA_DIR` to choose a different directory. In production, use a persistent writable directory and back up the JSON file. Restarts retain responses as long as that directory is preserved. Run one server process against each data file.

Attendance confirmation IDs are remembered in each guest's browser, so updating an existing confirmation updates the counters instead of adding another confirmation. A different browser or device counts as a separate confirmation. Wish submissions use IDs to prevent duplicated messages when a failed request is retried.

The public API returns aggregate attendance counts and wishes. It does not expose the individual RSVP records or the storage file. Wishes are displayed publicly in the invitation.

## Check the project

```sh
npm run lint
npm test
npm run build
```
