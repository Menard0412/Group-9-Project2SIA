import { supabase } from '../lib/supabase';

type Row = Record<string, unknown>;

/** Number of new items (announcements, messages, materials, quizzes) per class since it was last opened. */
export async function fetchUnreadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('class_unread_counts');
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  if (Array.isArray(data)) {
    for (const item of data as Row[]) {
      if (typeof item.room_id === 'string') counts[item.room_id] = Number(item.unread_count) || 0;
    }
  }
  return counts;
}

export async function markClassSeen(classId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_class_seen', { p_class: classId });
  if (error) throw new Error(error.message);
}
