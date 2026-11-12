import { db } from '../../services/storage/database';
import type { Annotation, HighlightColor, UserPreferences } from '../../types/domain';

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'accountId' | 'updatedAt'> = {
  theme: 'system', fontFamily: 'Georgia', fontSize: 100, lineHeight: 1.65, readingWidth: 760,
  cacheDownloads: true, revision: 1, pdfScaleMode: 'fit-page', pdfScale: 1, controlsPinned: false, pageMargin: 'comfortable', readerBrightness: 100
};

export async function loadPreferences(accountId: string): Promise<UserPreferences> {
  const stored = await db.preferences.get(`reader:${accountId}`);
  return { ...DEFAULT_PREFERENCES, ...stored, id: `reader:${accountId}`, accountId, updatedAt: stored?.updatedAt ?? new Date().toISOString() };
}

export async function savePreferences(preferences: UserPreferences): Promise<void> {
  await db.preferences.put({ ...preferences, updatedAt: new Date().toISOString(), revision: preferences.revision + 1 });
}

export async function loadAnnotations(accountId: string, bookId: string): Promise<Annotation[]> {
  return db.annotations.where('[accountId+bookId]').equals([accountId, bookId]).filter((item) => !item.deletedAt).toArray();
}

function baseAnnotation(accountId: string, bookId: string): Pick<Annotation, 'id' | 'accountId' | 'bookId' | 'tagIds' | 'createdAt' | 'updatedAt' | 'revision' | 'deviceId'> {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), accountId, bookId, tagIds: [], createdAt: now, updatedAt: now, revision: 1, deviceId: 'browser' };
}

export async function addBookmark(accountId: string, bookId: string, page: number, label?: string): Promise<Annotation> {
  const bookmark: Annotation = { ...baseAnnotation(accountId, bookId), type: 'bookmark', note: label, anchor: { kind: 'pdf', page, rects: [], textAnchor: '' } };
  await db.annotations.add(bookmark);
  return bookmark;
}

export async function addPdfHighlight(accountId: string, bookId: string, page: number, selectedText: string, rects: Array<{x:number;y:number;width:number;height:number}>, color: HighlightColor, note?: string): Promise<Annotation> {
  const highlight: Annotation = { ...baseAnnotation(accountId, bookId), type: note ? 'note' : 'highlight', selectedText, color, note, anchor: { kind: 'pdf', page, rects, textAnchor: selectedText.slice(0, 200) } };
  await db.annotations.add(highlight);
  return highlight;
}

export async function removeAnnotation(annotation: Annotation): Promise<void> {
  await db.annotations.update(annotation.id, { deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), revision: annotation.revision + 1 });
}
