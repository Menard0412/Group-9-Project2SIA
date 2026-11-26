import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  deleteStoredCopy,
  fileExists,
  FileServiceError,
  pickAndStoreFile,
  type PickOutcome,
} from '../services/fileService';
import { loadFiles, saveFiles } from '../services/storageService';
import type { FileCategory, StoredFile } from '../types/file';

interface FilesContextValue {
  files: StoredFile[];
  loading: boolean;
  totalSize: number;
  addFile: (category: FileCategory) => Promise<PickOutcome>;
  removeFile: (id: string) => Promise<void>;
  getFile: (id: string) => StoredFile | undefined;
  byCategory: (category: FileCategory) => StoredFile[];
}

const FilesContext = createContext<FilesContextValue | null>(null);

export function FilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const filesRef = useRef<StoredFile[]>([]);

  const commit = useCallback(async (next: StoredFile[]) => {
    await saveFiles(next);
    filesRef.current = next;
    setFiles(next);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await loadFiles();
        // Drop records whose stored copy no longer exists.
        const present = await Promise.all(stored.map((f) => fileExists(f.localUri)));
        const valid = stored.filter((_, index) => present[index]);
        if (valid.length !== stored.length) await saveFiles(valid);
        if (active) {
          filesRef.current = valid;
          setFiles(valid);
        }
      } catch (error) {
        console.warn('Failed to load files', error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const addFile = useCallback(
    async (category: FileCategory): Promise<PickOutcome> => {
      const outcome = await pickAndStoreFile(category, filesRef.current);
      if (outcome.status === 'success') {
        try {
          await commit([outcome.file, ...filesRef.current]);
        } catch {
          // Keep storage and metadata consistent.
          try {
            await deleteStoredCopy(outcome.file.localUri);
          } catch {
            /* ignore */
          }
          throw new FileServiceError('The file was copied but its record could not be saved. Please try again.');
        }
      }
      return outcome;
    },
    [commit],
  );

  const removeFile = useCallback(
    async (id: string) => {
      const target = filesRef.current.find((f) => f.id === id);
      if (!target) return;
      await deleteStoredCopy(target.localUri);
      await commit(filesRef.current.filter((f) => f.id !== id));
    },
    [commit],
  );

  const value = useMemo<FilesContextValue>(
    () => ({
      files,
      loading,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      addFile,
      removeFile,
      getFile: (id) => files.find((f) => f.id === id),
      byCategory: (category) => files.filter((f) => f.category === category),
    }),
    [files, loading, addFile, removeFile],
  );

  return <FilesContext.Provider value={value}>{children}</FilesContext.Provider>;
}

export function useFiles(): FilesContextValue {
  const ctx = useContext(FilesContext);
  if (!ctx) throw new Error('useFiles must be used inside <FilesProvider>');
  return ctx;
}
