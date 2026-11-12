import { db } from '../../services/storage/database';
import { addBookmark, addPdfHighlight, loadAnnotations, loadPreferences, removeAnnotation, savePreferences } from './readerStorage';
import { normalizeSelectionRects } from './selectionGeometry';

describe('reader persistence', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });
  afterAll(async () => db.delete());

  it('persists preferences per account without leaking them', async () => {
    const first = await loadPreferences('account-a');
    await savePreferences({ ...first, theme: 'dark', pdfScaleMode: 'fit-width' });
    expect((await loadPreferences('account-a')).theme).toBe('dark');
    expect((await loadPreferences('account-b')).theme).toBe('system');
  });

  it('persists bookmarks, highlights, notes, and soft deletion per book', async () => {
    const bookmark = await addBookmark('account-a', 'book-a', 7, 'Important');
    await addPdfHighlight('account-a', 'book-a', 7, 'selected text', [{ x: .1, y: .2, width: .3, height: .04 }], 'purple', 'My note');
    expect(await loadAnnotations('account-a', 'book-a')).toHaveLength(2);
    expect(await loadAnnotations('account-b', 'book-a')).toHaveLength(0);
    await removeAnnotation(bookmark);
    expect(await loadAnnotations('account-a', 'book-a')).toHaveLength(1);
  });

  it('stores multi-line selection geometry in scale-independent page coordinates', () => {
    const bounds = { left: 100, top: 50, width: 400, height: 800 };
    const rects = normalizeSelectionRects([{ left: 140, top: 130, width: 200, height: 20 }, { left: 140, top: 150, width: 120, height: 20 }], bounds);
    expect(rects).toEqual([{ x: .1, y: .1, width: .5, height: .025 }, { x: .1, y: .125, width: .3, height: .025 }]);
  });
});
