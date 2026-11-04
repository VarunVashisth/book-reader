export type BookFormat = 'epub' | 'pdf';
export type SyncStatus = 'synced' | 'saving-local' | 'syncing' | 'offline' | 'auth-required' | 'conflict' | 'failed';
export type ReaderTheme = 'light' | 'sepia' | 'dark';

export interface UserIdentity {
  accountId: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

export interface BookMetadata {
  title: string;
  authors: string[];
  description?: string;
  publisher?: string;
  language?: string;
  publishedAt?: string;
  coverBlobId?: string;
}

export interface BookFileReference {
  driveFileId: string;
  mimeType: 'application/epub+zip' | 'application/pdf';
  size: number;
  contentHash: string;
  modifiedTime?: string;
}

export interface Book {
  id: string;
  accountId: string;
  format: BookFormat;
  metadata: BookMetadata;
  file: BookFileReference;
  progress: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  completedAt?: string;
  offlineAvailable: boolean;
  collectionIds: string[];
  tags: string[];
}

export type LocationAnchor =
  | { kind: 'epub-cfi'; cfi: string; context?: string }
  | { kind: 'pdf'; page: number; rects: Array<{ x: number; y: number; width: number; height: number }>; textAnchor: string };

export interface Annotation {
  id: string;
  accountId: string;
  bookId: string;
  type: 'highlight' | 'note' | 'bookmark';
  selectedText?: string;
  anchor: LocationAnchor;
  color?: 'yellow' | 'green' | 'blue' | 'rose';
  note?: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  revision: number;
  deviceId: string;
}

export interface ReadingProgress {
  id: string;
  accountId: string;
  bookId: string;
  anchor: LocationAnchor;
  percentage: number;
  updatedAt: string;
  deviceId: string;
  revision: number;
}

export interface Tag { id: string; accountId: string; name: string; color: string; updatedAt: string; deletedAt?: string; revision: number }
export interface Collection { id: string; accountId: string; name: string; description?: string; updatedAt: string; deletedAt?: string; revision: number }

export interface SyncOperation {
  id: string;
  accountId: string;
  entityType: 'annotation' | 'progress' | 'book' | 'tag' | 'collection' | 'preferences';
  entityId: string;
  action: 'upsert' | 'delete';
  createdAt: string;
  attempts: number;
  nextAttemptAt?: string;
}

export interface UserPreferences {
  id: string;
  accountId: string;
  theme: ReaderTheme;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  readingWidth: number;
  cacheDownloads: boolean;
  updatedAt: string;
  revision: number;
}
