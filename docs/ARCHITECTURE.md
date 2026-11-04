# Leaf architecture

## Decision and data flow

Leaf is a static React application deployed to Cloudflare Pages. Google Drive is the durable book store and sync transport; account-scoped IndexedDB is the local source of truth. There is no app server, database, client secret, or service account.

1. A user explicitly starts Google authorization through Google Identity Services (GIS).
2. The short-lived token exists only in the Zustand runtime store and is never persisted.
3. App-created books go into an app-created `BookReader` folder. File IDs—not public URLs—are saved in metadata. This folder is organizational, not an OAuth boundary.
4. Changes commit locally first and enqueue stable-ID sync operations.
5. Granular, versioned records sync to `appDataFolder` with retry and conflict detection.
6. Optional account-scoped book blobs support offline reading.

The requested scopes are exactly `drive.file` and `drive.appdata`. `drive.file` covers app-created or explicitly user-authorized files, not arbitrary folder contents. Existing Drive imports will require Google Picker. GIS has no browser refresh token; expiry or 401 requires a new user-driven authorization.

## Sync and reader anchors

Records include stable IDs, `accountId`, `revision`, `updatedAt`, and `deviceId`; deletes produce tombstones. Annotations merge by ID and independent IDs are retained. Same-ID concurrent edits become visible conflicts. Reading progress uses latest `updatedAt`, with documented device-clock limitations. The implementation will use compare-before-write and verified Drive revisions/ETags, without assuming `If-Match` provides a transaction.

EPUB positions use CFI/CFI ranges with text context. PDF selections use page numbers, normalized page-space rectangles, and text anchors—never fixed screen coordinates.

## Key risks

| Risk | Mitigation |
| --- | --- |
| Cross-account cache disclosure | Every row carries `accountId`; all reads require the active partition. |
| Token theft | Tokens are memory-only; restrictive CSP; no sensitive logging. |
| EPUB injection | Disable scripting, sandbox content, sanitize metadata, review CSP exceptions. |
| Concurrent data loss | Stable IDs, revisions, tombstones, granular records, conflict UI. |
| Deleted app data | Restore from local state only after explicit confirmation; do not call it immutable backup. |
| Quota/network failure | Local-first queue, deduplication, capped backoff with jitter, visible status. |
| Interrupted upload | 256 KiB-aligned resumable chunks, status probes, one-week session expiry handling. |
| Storage exhaustion | Quota estimates plus explicit download/remove controls. |

## Phases and acceptance criteria

### 1 — Foundation (implemented)

- Strict React/TypeScript/Vite build, responsive sign-in/library shell, route protection.
- GIS uses only approved scopes; token expiry is safe and memory-only.
- Versioned account-scoped Dexie schema and typed domain models.
- PWA shell, Cloudflare SPA routing/security headers, and auth unit tests.

### 2 — Drive and real library

- Resolve stable account identity, create the app folder, validate signatures/sizes, hash in a worker, extract safe metadata, implement cancelable resumable upload/recovery and authenticated download/cache.

### 3 — Reading engines

- Lazy-load and dispose epub.js/PDF.js; add TOC, search, navigation, themes, text layer detection, and exact progress restoration.

### 4 — Annotations

- Durable highlights, notes, bookmarks, tags, exact navigation, filters, and Markdown/JSON export using resilient anchors.

### 5 — Synchronization

- Granular merge, tombstones, conflict UI, retries, auth interruption, failure tests, and verified account isolation.

### 6 — Offline and polish

- Explicit offline controls, quota UI, end-to-end offline tests, accessibility/performance pass, and deployment verification.

## Verified references

[GIS token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [appDataFolder](https://developers.google.com/workspace/drive/api/guides/appdata), and [resumable uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).
