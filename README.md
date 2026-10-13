# Ice & Chandra Wedding Invitation

React invitation with event locations, attendance confirmations, and a public guestbook.

## Run locally

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173/` (or `http://localhost:5173/`). The preview uses a fixed local address and port, so the page and response API stay on the same server. Restart the development server after changing its configuration. If the response counters report a connection error, stop any older preview and run `npm run dev` from this project directory again.

The development server also serves the response API. Both forms save to the same JSON file and update the attendance counters and guestbook after a successful save. Other guests' responses refresh every 30 seconds while the invitation is visible.

## Run in production

```sh
npm run build
npm start
```

The Node server serves the built invitation and API on port 3000. Use `PORT` and `HOST` to change its address; set `HOST=0.0.0.0` when the host needs to accept external connections.

This invitation needs the Node server for the forms to save responses. Uploading only `dist/` to static hosting does not provide the response API.

## Response storage

Responses are stored in `data/guest-responses.json`, outside the public site and excluded from Git. The file is created on the first API request. It contains:

- `rsvps`: guest name, attendance choice, guest count, and timestamps.
- `wishes`: guest name, message, and timestamp.

Set `WEDDING_DATA_DIR` to choose a different directory. In production, use a persistent writable directory and back up the JSON file. Restarts retain responses as long as that directory is preserved. Run one server process against each data file.

Attendance confirmation IDs are remembered in each guest's browser, so updating an existing confirmation updates the counters instead of adding another confirmation. A different browser or device counts as a separate confirmation. Wish submissions use IDs to prevent duplicated messages when a failed request is retried.

The public API returns aggregate attendance counts and wishes. It does not expose the individual RSVP records or the storage file. Wishes are displayed publicly in the invitation.

## Check the project

```sh
npm run lint
npm test
npm run build
```
