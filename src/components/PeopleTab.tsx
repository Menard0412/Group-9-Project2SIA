import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, radius, spacing } from '../constants/colors';
import { listAttempts, listClassProgress, listMaterials } from '../services/classworkService';
import type { ClassAttempt, MaterialProgressRow } from '../types/classwork';
import type { ClassRoom, Member } from '../types/cloud';
import { errorMessage } from '../utils/format';
import { formatDateTime } from '../utils/time';
import { ProgressBar } from './ProgressBar';

interface PeopleTabProps {
  room: ClassRoom;
  members: Member[];
  isInstructor: boolean;
  refreshToken: number;
}

export function PeopleTab({ room, members, isInstructor, refreshToken }: PeopleTabProps) {
  const [materialCount, setMaterialCount] = useState(0);
  const [progress, setProgress] = useState<MaterialProgressRow[]>([]);
  const [attempts, setAttempts] = useState<ClassAttempt[]>([]);
  const [loading, setLoading] = useState(isInstructor);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isInstructor) return;
    setError(null);
    try {
      const [materials, rows, allAttempts] = await Promise.all([
        listMaterials(room.id),
        listClassProgress(room.id),
        listAttempts(room.id),
      ]);
      setMaterialCount(materials.length);
      setProgress(rows);
      setAttempts(allAttempts);
    } catch (e) {
      setError(errorMessage(e, 'Could not load learner progress.'));
    } finally {
      setLoading(false);
    }
  }, [room.id, isInstructor]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Instructor</Text>
      <Text style={styles.body}>{room.instructorName}</Text>

      {isInstructor ? (
        <>
          <Text style={[styles.heading, styles.spaced]}>Learners ({members.length})</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : members.length === 0 ? (
            <Text style={styles.muted}>No one has joined yet. Share the class code at the top of this page.</Text>
          ) : (
            members.map((member) => {
              const done = progress.filter((p) => p.learnerId === member.learnerId).length;
              const percent = materialCount === 0 ? 0 : Math.round((done / materialCount) * 100);
              const mine = attempts.filter((a) => a.learnerId === member.learnerId);
              const average =
                mine.length === 0
                  ? null
                  : Math.round(mine.reduce((sum, a) => sum + (a.total === 0 ? 0 : (a.score / a.total) * 100), 0) / mine.length);
              return (
                <View key={member.learnerId} style={styles.member}>
                  <View style={styles.memberTop}>
                    <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.muted}>Joined {formatDateTime(member.joinedAt).split(',')[0]}</Text>
                  </View>
                  <ProgressBar percent={percent} />
                  <Text style={styles.muted}>
                    Materials {done}/{materialCount} · Quizzes taken {mine.length} · Average{' '}
                    {average === null ? '—' : `${average}%`}
                  </Text>
                </View>
              );
            })
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heading: { fontSize: 15, fontWeight: '700', color: colors.text },
  spaced: { marginTop: spacing.sm },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
  member: { gap: spacing.xs, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
});
