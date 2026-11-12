import { db } from '../../services/storage/database';
import type { Book, BookFormat } from '../../types/domain';
import { downloadBook } from '../../services/drive/driveClient';

const ACCEPTED_TYPES: Record<string, BookFormat> = {
  'application/pdf': 'pdf',
  'application/epub+zip': 'epub'
};

function formatFor(file: File): BookFormat | undefined {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_TYPES[file.type] ?? (extension === 'pdf' || extension === 'epub' ? extension : undefined);
}

export async function addBook(accountId: string, file: File): Promise<Book> {
  const format = formatFor(file);
  if (!format) throw new Error('Choose a PDF or EPUB file.');
  const id = crypto.randomUUID();
  const bytes = await file.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const fallbackTitle = file.name.replace(/\.(pdf|epub)$/i, '').trim() || 'Untitled';
  const extracted = format === 'pdf' ? await extractPdfDetails(bytes) : await extractEpubDetails(bytes);
  const now = new Date().toISOString();
  const book: Book = {
    id,
    accountId,
    format,
    metadata: { title: extracted.title || fallbackTitle, authors: extracted.authors, coverBlobId: extracted.cover },
    file: { driveFileId: `local:${id}`, mimeType: format === 'pdf' ? 'application/pdf' : 'application/epub+zip', size: file.size, contentHash: hash },
    progress: 0,
    createdAt: now,
    updatedAt: now,
    offlineAvailable: true,
    collectionIds: [],
    tags: []
  };
  await db.transaction('rw', db.books, db.cachedBooks, async () => {
    await db.books.add(book);
    await db.cachedBooks.add({ id: `${accountId}:${id}`, accountId, bookId: id, blob: file, cachedAt: now });
  });
  return book;
}

async function extractPdfDetails(bytes: ArrayBuffer): Promise<{ title?: string; authors: string[]; cover?: string }> {
  const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const task = getDocument({ data: bytes.slice(0) });
  try {
    const pdf = await task.promise; const metadata = await pdf.getMetadata(); const info = metadata.info as { Title?: string; Author?: string };
    const page = await pdf.getPage(1); const viewport = page.getViewport({ scale: Math.min(1, 260 / page.getViewport({ scale: 1 }).width) });
    const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d'); if (context) await page.render({ canvas, canvasContext: context, viewport }).promise;
    return { title: info.Title?.trim(), authors: info.Author ? [info.Author.trim()] : [], cover: context ? canvas.toDataURL('image/jpeg', .78) : undefined };
  } catch { return { authors: [] }; } finally { await task.destroy(); }
}

async function extractEpubDetails(bytes: ArrayBuffer): Promise<{ title?: string; authors: string[]; cover?: string }> {
  const { default: ePub } = await import('epubjs');
  const epub = ePub();
  try {
    await epub.open(bytes.slice(0)); const metadata = await epub.loaded.metadata; const coverUrl = await epub.coverUrl();
    let cover: string | undefined;
    if (coverUrl) { const response = await fetch(coverUrl); const blob = await response.blob(); cover = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
    return { title: metadata.title?.trim(), authors: metadata.creator ? [metadata.creator.trim()] : [], cover };
  } catch { return { authors: [] }; } finally { epub.destroy(); }
}

export async function renameBook(book: Book, title: string): Promise<void> {
  const cleanTitle = title.trim();
  if (!cleanTitle) throw new Error('A title is required.');
  await db.books.update(book.id, { metadata: { ...book.metadata, title: cleanTitle }, updatedAt: new Date().toISOString() });
}

export async function deleteBook(book: Book): Promise<void> {
  await db.transaction('rw', db.books, db.cachedBooks, async () => {
    const now = new Date().toISOString();
    await db.books.update(book.id, { deletedAt: now, updatedAt: now });
    await db.cachedBooks.where('[accountId+bookId]').equals([book.accountId, book.id]).delete();
  });
}

export async function getBookBlob(book: Book, token?: string): Promise<Blob | undefined> {
  const cached = (await db.cachedBooks.where('[accountId+bookId]').equals([book.accountId, book.id]).first())?.blob;
  if (cached || !token || book.file.driveFileId.startsWith('local:')) return cached;
  const blob = await downloadBook(token, book.file.driveFileId);
  await db.cachedBooks.put({ id: `${book.accountId}:${book.id}`, accountId: book.accountId, bookId: book.id, blob, cachedAt: new Date().toISOString() });
  await db.books.update(book.id, { offlineAvailable: true });
  return blob;
}
