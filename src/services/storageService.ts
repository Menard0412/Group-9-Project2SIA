import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredFile } from '../types/file';

const STORAGE_KEY = 'lms-mobile.files.v1';

function isStoredFile(value: unknown): value is StoredFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.originalName === 'string' &&
    (v.category === 'presentation' || v.category === 'exercise') &&
    typeof v.mimeType === 'string' &&
    typeof v.extension === 'string' &&
    typeof v.size === 'number' &&
    typeof v.localUri === 'string' &&
    typeof v.createdAt === 'string'
  );
}

/** Loads file metadata. Only metadata is stored here, never file contents. */
export async function loadFiles(): Promise<StoredFile[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredFile) : [];
  } catch (error) {
    console.warn('Could not read stored file records', error);
    return [];
  }
}

export async function saveFiles(files: StoredFile[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}
