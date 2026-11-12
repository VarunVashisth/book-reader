# Leaf Cloud Reader

Leaf is a private, local-first personal library built with React 19, TypeScript, Google Drive, and IndexedDB.

Leaf starts with an empty library: it does not ship demo or fixture books. Signed-in users can add their own PDF and EPUB files, manage them, and read them locally. Files and reading progress are stored in IndexedDB on the current browser. Google Drive transfer and remote sync are not implemented yet.

## Reader capabilities

- PDF.js canvas rendering with an aligned, selectable text layer and graceful scanned-page detection.
- Horizontal PDF navigation by controls, keyboard, reading margins, direct page entry, and touch swipe.
- Fit-page, fit-width, zoom, warm/dark surroundings, auto-hiding controls, and persisted preferences.
- Incremental PDF text search, bookmarks, highlights, notes, annotation sidebar, and restored progress.
- EPUB pagination with restored CFI progress, font sizing, line height, and reading themes.
- Real PDF/EPUB metadata and cover extraction, library sorting/filtering, recent reading, and completion state.

Reader records are isolated by account in IndexedDB. Local accounts are device-local; Drive transfer and cross-device synchronization are still deferred.

## Develop

Requires Node.js 20+.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set the public Web OAuth client ID in `VITE_GOOGLE_CLIENT_ID`. Never put a client secret in frontend configuration.

For development without Google OAuth, choose **Create a local account** on the sign-in screen. Local account credentials are salted and hashed, remain in that browser's local storage, and are intended only for testing; they do not provide Drive sync or a production authentication backend.

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Google Cloud setup

1. Enable the Google Drive API.
2. Configure the OAuth consent screen and add your account as a test user if the app remains in testing.
3. Request only `drive.file` and `drive.appdata`; never add `drive` or `drive.readonly`.
4. Create an OAuth client of type **Web application**.
5. Add exact authorized JavaScript origins, such as `http://localhost:5173` and your HTTPS Pages domain (no path).
6. Copy only the client ID into the environment variable.

Picker is not implemented in Phase 1. When added, existing files will be explicitly user-selected and the browser API key will be HTTP-referrer restricted.

## Cloudflare Pages

- Preset: Vite
- Build: `npm run build`
- Output: `dist`
- Node: 20+
- Variable: `VITE_GOOGLE_CLIENT_ID`

After the first deployment, add the exact Pages and custom-domain origins to the OAuth client. `_redirects` handles SPA navigation and `_headers` applies the baseline CSP/security policy.

## Production checklist

- Confirm consent requests exactly the two approved scopes.
- Confirm tokens/secrets never appear in built assets, storage, or logs.
- Test denial, expiry, revocation, sign-out, offline startup, and account switching.
- Review lockfile/audit changes and the CSP after reader integration.
- Keep HTTPS redirects enabled.

See [the architecture record](docs/ARCHITECTURE.md) for constraints, risks, synchronization policy, and phase acceptance criteria.

## Troubleshooting

- `Sign-in is not configured`: create `.env.local`, set the client ID, restart Vite.
- `origin_mismatch`: add the exact current origin to the Web client.
- Works locally but not on Pages: verify the Pages variable and production origin, then rebuild.
- Stale installed PWA: close all installed-app windows and reload.
