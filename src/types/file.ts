export type FileCategory = 'presentation' | 'exercise';

export type SortOption = 'newest' | 'oldest' | 'name' | 'size';

export interface StoredFile {
  id: string;
  /** Display name (made unique within its category). */
  name: string;
  /** Name of the file as it was on the device when picked. */
  originalName: string;
  category: FileCategory;
  mimeType: string;
  /** Lower-case extension without the dot, e.g. "pdf". */
  extension: string;
  /** Size in bytes. */
  size: number;
  /** file:// URI of the copy inside app storage. */
  localUri: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}
