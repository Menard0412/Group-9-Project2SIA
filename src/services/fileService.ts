import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { ALLOWED_EXTENSIONS, CATEGORY_LABEL, MIME_BY_EXTENSION } from '../constants/fileTypes';
import type { FileCategory, StoredFile } from '../types/file';
import { getExtension, splitFileName } from '../utils/format';

export class FileServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileServiceError';
  }
}

export type PickOutcome =
  | { status: 'cancelled' }
  | { status: 'success'; file: StoredFile };

/** The minimum a file needs to be opened or shared (local library files and downloaded class materials). */
export type Openable = Pick<StoredFile, 'name' | 'localUri' | 'mimeType'>;

function detail(error: unknown): string {
  return error instanceof Error && error.message ? ` (${error.message})` : '';
}

async function categoryDirectory(category: FileCategory): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) throw new FileServiceError('This device does not provide storage for the app.');
  const directory = `${base}library/${category}/`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  return directory;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** "notes.pdf" -> "notes (1).pdf" -> "notes (2).pdf" when names collide. */
function uniqueName(originalName: string, takenNames: string[]): string {
  const taken = new Set(takenNames.map((n) => n.toLowerCase()));
  if (!taken.has(originalName.toLowerCase())) return originalName;
  const { base, ext } = splitFileName(originalName);
  let counter = 1;
  let candidate: string;
  do {
    candidate = `${base} (${counter})${ext ? `.${ext}` : ''}`;
    counter += 1;
  } while (taken.has(candidate.toLowerCase()));
  return candidate;
}

/**
 * Lets the user pick a document, validates it, and copies it into persistent
 * app storage. Returns the new record (the caller persists the metadata).
 */
export async function pickAndStoreFile(
  category: FileCategory,
  existing: StoredFile[],
): Promise<PickOutcome> {
  if (Platform.OS === 'web') {
    throw new FileServiceError(
      'Storing files works in the Android app, not in a web browser. Open this project in Expo Go on your phone to upload files.',
    );
  }

  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch (error) {
    throw new FileServiceError(`The file picker could not be opened. Please try again.${detail(error)}`);
  }

  if (result.canceled) return { status: 'cancelled' };

  const asset = result.assets[0];
  if (!asset) throw new FileServiceError('No file was selected.');

  const extension = getExtension(asset.name);
  const allowed = ALLOWED_EXTENSIONS[category];
  if (!extension || !allowed.includes(extension)) {
    throw new FileServiceError(
      `"${asset.name}" is not a supported ${CATEGORY_LABEL[category].toLowerCase()} file.\n\nSupported types: ${allowed
        .map((e) => `.${e}`)
        .join(', ')}`,
    );
  }

  const id = createId();
  const destination = `${await categoryDirectory(category)}${id}.${extension}`;
  try {
    // The legacy copy handles encoded file names and content:// URIs reliably.
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
  } catch (error) {
    throw new FileServiceError(
      `The selected file could not be read or saved. Please try another file.${detail(error)}`,
    );
  }

  const saved = await FileSystem.getInfoAsync(destination);
  if (!saved.exists) {
    throw new FileServiceError('The file could not be saved to app storage. Check your free space and try again.');
  }

  // Remove the temporary copy made by the picker (best effort).
  try {
    const cache = FileSystem.cacheDirectory;
    if (cache && asset.uri.startsWith(cache)) await FileSystem.deleteAsync(asset.uri, { idempotent: true });
  } catch {
    /* ignore */
  }

  const mimeType =
    asset.mimeType && asset.mimeType !== 'application/octet-stream'
      ? asset.mimeType
      : (MIME_BY_EXTENSION[extension] ?? 'application/octet-stream');

  const file: StoredFile = {
    id,
    name: uniqueName(
      asset.name,
      existing.filter((f) => f.category === category).map((f) => f.name),
    ),
    originalName: asset.name,
    category,
    mimeType,
    extension,
    size: saved.size || asset.size || 0,
    localUri: destination,
    createdAt: new Date().toISOString(),
  };
  return { status: 'success', file };
}

/**
 * Whether a stored copy is still there. If the check itself fails we assume it is,
 * so a temporary problem can never make records disappear.
 */
export async function fileExists(localUri: string): Promise<boolean> {
  try {
    return (await FileSystem.getInfoAsync(localUri)).exists;
  } catch {
    return true;
  }
}

/** Removes the stored copy of a file. Does nothing if it is already gone. */
export async function deleteStoredCopy(localUri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch (error) {
    throw new FileServiceError(`The file could not be deleted from app storage.${detail(error)}`);
  }
}

export async function shareFile(file: Openable, dialogTitle?: string): Promise<void> {
  if (!(await fileExists(file.localUri))) {
    throw new FileServiceError('This file is no longer available on the device.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new FileServiceError('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.localUri, {
    mimeType: file.mimeType,
    dialogTitle: dialogTitle ?? file.name,
  });
}

/** Tries an in-app preview first, then falls back to the system "open with" sheet. */
export async function openFile(file: Openable): Promise<void> {
  if (!(await fileExists(file.localUri))) {
    throw new FileServiceError('This file is no longer available on the device.');
  }
  try {
    const stored = new File(file.localUri);
    if (await stored.canPreview()) {
      await stored.preview({ title: file.name });
      return;
    }
  } catch {
    /* fall through to the share sheet */
  }
  await shareFile(file, `Open ${file.name} with`);
}
