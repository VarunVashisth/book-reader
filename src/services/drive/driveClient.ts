import type { Annotation, Book, ReadingProgress, UserPreferences } from '../../types/domain';
import { db } from '../storage/database';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER = 'appDataFolder';
const SNAPSHOT_NAME = 'leaf-library-v1.json';

type DriveUser = { permissionId: string; displayName: string; emailAddress: string; photoLink?: string };
type DriveFile = { id: string; name: string; modifiedTime?: string; appProperties?: Record<string, string> };
type Snapshot = { version: 1; updatedAt: string; books: Book[]; annotations: Annotation[]; progress: ReadingProgress[]; preferences?: UserPreferences };

async function driveFetch<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  if (response.status === 401) throw new Error('Google authorization expired. Sign in again to continue syncing.');
  if (!response.ok) { const detail = await response.text(); throw new Error(`Google Drive request failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`); }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getDriveUser(token: string): Promise<DriveUser> {
  const result = await driveFetch<{ user: DriveUser }>(token, `${DRIVE_API}/about?fields=user(permissionId,displayName,emailAddress,photoLink)`);
  return result.user;
}

async function listFiles(token: string, query: string, spaces = 'drive'): Promise<DriveFile[]> {
  const parameters = new URLSearchParams({ q: query, spaces, fields: 'files(id,name,modifiedTime,appProperties)', pageSize: '100' });
  return (await driveFetch<{ files: DriveFile[] }>(token, `${DRIVE_API}/files?${parameters}`)).files;
}

async function ensureBookFolder(token: string): Promise<string> {
  const query = "trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='leafRoot' and value='true' }";
  const existing = (await listFiles(token, query))[0];
  if (existing) return existing.id;
  const created = await driveFetch<{ id: string }>(token, `${DRIVE_API}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Leaf Books', mimeType: 'application/vnd.google-apps.folder', appProperties: { leafRoot: 'true' } }) });
  return created.id;
}

export async function uploadBook(token: string, book: Book, blob: Blob, onProgress?: (percentage: number) => void): Promise<DriveFile> {
  const parent = await ensureBookFolder(token);
  const metadata = { name: `${book.metadata.title}.${book.format}`, parents: [parent], mimeType: book.file.mimeType, appProperties: { leafBookId: book.id, contentHash: book.file.contentHash } };
  const session = await fetch(`${UPLOAD_API}/files?uploadType=resumable&fields=id,name,modifiedTime,appProperties`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': blob.type || book.file.mimeType, 'X-Upload-Content-Length': String(blob.size) }, body: JSON.stringify(metadata) });
  if (!session.ok) throw new Error(`Could not start the Drive upload (${session.status}).`);
  const location = session.headers.get('Location'); if (!location) throw new Error('Drive did not return an upload session.');
  const chunkSize = 8 * 1024 * 1024; let offset = 0;
  while (offset < blob.size) {
    const end = Math.min(offset + chunkSize, blob.size); const chunk = blob.slice(offset, end);
    const response = await fetch(location, { method: 'PUT', headers: { 'Content-Type': blob.type || book.file.mimeType, 'Content-Length': String(chunk.size), 'Content-Range': `bytes ${offset}-${end - 1}/${blob.size}` }, body: chunk });
    if (response.status === 308) { offset = end; onProgress?.(Math.round(offset / blob.size * 100)); continue; }
    if (!response.ok) throw new Error(`Drive upload failed (${response.status}).`);
    onProgress?.(100); return response.json() as Promise<DriveFile>;
  }
  throw new Error('Drive upload ended unexpectedly.');
}

export async function downloadBook(token: string, fileId: string): Promise<Blob> {
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) throw new Error('Google authorization expired. Sign in again.');
  if (!response.ok) throw new Error(`The book could not be downloaded from Drive (${response.status}).`);
  return response.blob();
}

export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  await driveFetch<void>(token, `${DRIVE_API}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
}

async function localSnapshot(accountId: string): Promise<Snapshot> {
  const books = await db.books.where('accountId').equals(accountId).toArray();
  return { version: 1, updatedAt: new Date().toISOString(), books: books.map((book) => ({ ...book, metadata: { ...book.metadata, coverBlobId: undefined } })), annotations: await db.annotations.where('accountId').equals(accountId).toArray(), progress: await db.progress.where('accountId').equals(accountId).toArray(), preferences: await db.preferences.get(`reader:${accountId}`) };
}

async function findSnapshot(token: string): Promise<DriveFile | undefined> {
  return (await listFiles(token, `trashed=false and name='${SNAPSHOT_NAME}'`, APP_FOLDER))[0];
}

export async function pushSnapshot(token: string, accountId: string): Promise<void> {
  const snapshot = await localSnapshot(accountId); const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' }); const existing = await findSnapshot(token);
  if (existing) { await fetch(`${UPLOAD_API}/files/${existing.id}?uploadType=media`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: blob }).then((response) => { if (!response.ok) throw new Error(`Could not sync reading data (${response.status}).`); }); return; }
  const boundary = `leaf_${crypto.randomUUID()}`; const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: SNAPSHOT_NAME, parents: [APP_FOLDER] })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`, blob, `\r\n--${boundary}--`]);
  await fetch(`${UPLOAD_API}/files?uploadType=multipart`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body }).then((response) => { if (!response.ok) throw new Error(`Could not create reading-data sync (${response.status}).`); });
}

function newer<T extends { id: string; updatedAt: string }>(local: T | undefined, remote: T): T { return !local || remote.updatedAt > local.updatedAt ? remote : local; }

export async function pullAndMergeSnapshot(token: string, accountId: string): Promise<void> {
  const file = await findSnapshot(token); if (!file) { await pushSnapshot(token, accountId); return; }
  const remote = await driveFetch<Snapshot>(token, `${DRIVE_API}/files/${file.id}?alt=media`); if (remote.version !== 1) throw new Error('This Drive library uses an unsupported data version.');
  const books = await db.books.where('accountId').equals(accountId).toArray(); const bookMap = new Map(books.map((item) => [item.id, item]));
  const annotations = await db.annotations.where('accountId').equals(accountId).toArray(); const annotationMap = new Map(annotations.map((item) => [item.id, item]));
  const progress = await db.progress.where('accountId').equals(accountId).toArray(); const progressMap = new Map(progress.map((item) => [item.id, item]));
  await db.transaction('rw', db.books, db.annotations, db.progress, db.preferences, async () => {
    await db.books.bulkPut(remote.books.map((item) => newer(bookMap.get(item.id), { ...item, accountId })));
    await db.annotations.bulkPut(remote.annotations.map((item) => newer(annotationMap.get(item.id), { ...item, accountId })));
    await db.progress.bulkPut(remote.progress.map((item) => newer(progressMap.get(item.id), { ...item, accountId, id: `${accountId}:${item.bookId}` })));
    if (remote.preferences) { const value = { ...remote.preferences, id: `reader:${accountId}`, accountId }; const local = await db.preferences.get(value.id); await db.preferences.put(newer(local, value)); }
  });
  await pushSnapshot(token, accountId);
}

let syncTail: Promise<void> = Promise.resolve();
export function synchronizeDrive(token: string, accountId: string): Promise<void> {
  const run = syncTail.catch(() => undefined).then(() => pullAndMergeSnapshot(token, accountId));
  syncTail = run;
  return run;
}
