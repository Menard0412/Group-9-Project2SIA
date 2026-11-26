import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchUnreadCounts, markClassSeen } from '../services/notificationService';
import { useAuth } from './useAuth';

interface UnreadValue {
  /** New items per class id. */
  counts: Record<string, number>;
  total: number;
  refresh: () => Promise<void>;
  markSeen: (classId: string) => Promise<void>;
}

const UnreadContext = createContext<UnreadValue | null>(null);

const WATCHED_TABLES = ['announcements', 'posts', 'class_materials', 'class_quizzes'];

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!userId) {
      setCounts({});
      return;
    }
    try {
      setCounts(await fetchUnreadCounts());
    } catch (error) {
      console.warn('Could not load unread counts', error);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live: when anything new is added to a class you belong to, refresh the badges shortly after.
  useEffect(() => {
    if (!userId) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 800);
    };
    const channel = supabase.channel(`unread-${userId}`);
    for (const table of WATCHED_TABLES) {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table }, schedule);
    }
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const markSeen = useCallback(
    async (classId: string) => {
      setCounts((current) => (current[classId] ? { ...current, [classId]: 0 } : current));
      try {
        await markClassSeen(classId);
      } catch (error) {
        console.warn('Could not mark class as seen', error);
      }
    },
    [],
  );

  const value = useMemo<UnreadValue>(
    () => ({
      counts,
      total: Object.values(counts).reduce((sum, n) => sum + n, 0),
      refresh,
      markSeen,
    }),
    [counts, refresh, markSeen],
  );

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread(): UnreadValue {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error('useUnread must be used inside <UnreadProvider>');
  return ctx;
}
