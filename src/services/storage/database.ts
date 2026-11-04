import Dexie, { type EntityTable } from 'dexie';
import type { Annotation, Book, Collection, ReadingProgress, SyncOperation, Tag, UserPreferences } from '../../types/domain';

interface CachedBook { id: string; accountId: string; bookId: string; blob: Blob; cachedAt: string }

export class ReaderDatabase extends Dexie {
  books!: EntityTable<Book, 'id'>;
  annotations!: EntityTable<Annotation, 'id'>;
  progress!: EntityTable<ReadingProgress, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  collections!: EntityTable<Collection, 'id'>;
  preferences!: EntityTable<UserPreferences, 'id'>;
  syncQueue!: EntityTable<SyncOperation, 'id'>;
  cachedBooks!: EntityTable<CachedBook, 'id'>;

  constructor() {
    super('leaf-reader');
    this.version(1).stores({
      books: 'id, accountId, [accountId+lastOpenedAt], updatedAt',
      annotations: 'id, accountId, bookId, [accountId+bookId], updatedAt, deletedAt',
      progress: 'id, accountId, bookId, [accountId+bookId], updatedAt',
      tags: 'id, accountId, [accountId+name], updatedAt',
      collections: 'id, accountId, [accountId+name], updatedAt',
      preferences: 'id, accountId',
      syncQueue: 'id, accountId, [accountId+nextAttemptAt], entityId',
      cachedBooks: 'id, accountId, bookId, [accountId+bookId], cachedAt'
    });
  }

  async clearAccount(accountId: string): Promise<void> {
    await this.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map((table) => table.where('accountId').equals(accountId).delete()));
    });
  }
}

export const db = new ReaderDatabase();
