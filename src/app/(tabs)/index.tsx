import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { EmptyState } from '../../components/EmptyState';
import { FileCard } from '../../components/FileCard';
import { Header } from '../../components/Header';
import { ProgressBar } from '../../components/ProgressBar';
import { colors, shadows, radius, spacing } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useFiles } from '../../hooks/useFiles';
import { useLms } from '../../hooks/useLms';
import type { StoredFile } from '../../types/file';
import { formatBytes, formatDate, sortFiles } from '../../utils/format';
import { attemptPercent, formatDuration, overallStats } from '../../utils/progress';

export default function HomeScreen() {
  const { files, loading: filesLoading, byCategory, totalSize } = useFiles();
  const { data, loading: lmsLoading, getQuiz, getCourse } = useLms();
  const loading = filesLoading || lmsLoading;
  const { profile } = useAuth();
  const firstName = profile?.displayName.split(' ')[0];
  const presentationCount = byCategory('presentation').length;
  const exerciseCount = byCategory('exercise').length;
  const recent = useMemo(() => sortFiles(files, 'newest').slice(0, 5), [files]);
  const stats = useMemo(() => overallStats(data, new Set(files.map((f) => f.id))), [data, files]);
  const recentAttempts = data.attempts.slice(0, 3);

  const openDetails = (file: StoredFile) =>
    router.push({ pathname: '/file-details/[id]', params: { id: file.id } });

  return (
    <View style={styles.screen}>
      <Header
        title="LMS Mobile"
        subtitle={`${firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'} Your courses, materials and quizzes in one place.`}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open courses"
              style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
              onPress={() => router.push('/courses')}
            >
              <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="school" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.courses}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open presentations"
              style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
              onPress={() => router.push('/presentations')}
            >
              <View style={[styles.statIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="easel" size={20} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>{presentationCount}</Text>
              <Text style={styles.statLabel}>Slides</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open exercises"
              style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
              onPress={() => router.push('/exercises')}
            >
              <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="clipboard" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{exerciseCount}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>Using {formatBytes(totalSize)} on this device</Text>

          <Text style={styles.sectionTitle}>Learning progress</Text>
          {stats.courses === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>Create a course to start tracking your progress.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.progressTop}>
                <Text style={styles.progressPercent}>{stats.percent}%</Text>
                <Text style={styles.muted}>
                  {stats.done} of {stats.total} materials completed
                </Text>
              </View>
              <ProgressBar percent={stats.percent} />
              <View style={styles.miniRow}>
                <View style={styles.mini}>
                  <Text style={styles.miniValue}>{formatDuration(stats.seconds)}</Text>
                  <Text style={styles.miniLabel}>Time in courses</Text>
                </View>
                <View style={styles.mini}>
                  <Text style={styles.miniValue}>{stats.quizzesTaken}</Text>
                  <Text style={styles.miniLabel}>Quizzes taken</Text>
                </View>
                <View style={styles.mini}>
                  <Text style={styles.miniValue}>{stats.averageScore === null ? '—' : `${stats.averageScore}%`}</Text>
                  <Text style={styles.miniLabel}>Average score</Text>
                </View>
              </View>
            </View>
          )}

          {recentAttempts.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Recent quiz results</Text>
              <View style={styles.card}>
                {recentAttempts.map((attempt) => (
                  <View key={attempt.id} style={styles.attemptRow}>
                    <View style={styles.attemptInfo}>
                      <Text style={styles.attemptTitle} numberOfLines={1}>
                        {getQuiz(attempt.quizId)?.title ?? 'Quiz'}
                      </Text>
                      <Text style={styles.miniLabel} numberOfLines={1}>
                        {getCourse(attempt.courseId)?.title ?? 'Course'} · {formatDate(attempt.takenAt)}
                      </Text>
                    </View>
                    <Text style={styles.attemptScore}>
                      {attempt.score}/{attempt.total} · {attemptPercent(attempt)}%
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.buttonRow}>
            <ActionButton label="Courses" icon="school-outline" flex onPress={() => router.push('/courses')} />
            <ActionButton
              label="Slides"
              icon="easel-outline"
              variant="secondary"
              flex
              onPress={() => router.push('/presentations')}
            />
          </View>
          <View style={styles.buttonRow}>
            <ActionButton
              label="Exercises"
              icon="clipboard-outline"
              variant="secondary"
              flex
              onPress={() => router.push('/exercises')}
            />
            <ActionButton
              label="Settings"
              icon="settings-outline"
              variant="secondary"
              flex
              onPress={() => router.push('/settings')}
            />
          </View>

          <Text style={styles.sectionTitle}>Recently added files</Text>
          {recent.length === 0 ? (
            <EmptyState
              icon="folder-open-outline"
              title="Nothing here yet"
              message="Files you upload will show up here for quick access."
            />
          ) : (
            <View style={styles.recentList}>
              {recent.map((file) => (
                <FileCard key={file.id} file={file} onPress={() => openDetails(file)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  muted: { fontSize: 13, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  progressTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  progressPercent: { fontSize: 28, fontWeight: '700', color: colors.primary },
  miniRow: { flexDirection: 'row', gap: spacing.sm },
  mini: { flex: 1 },
  miniValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  miniLabel: { fontSize: 12, color: colors.textMuted },
  attemptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attemptInfo: { flex: 1 },
  attemptTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  attemptScore: { fontSize: 14, fontWeight: '700', color: colors.primary },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  recentList: { gap: spacing.sm },
});
