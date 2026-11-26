import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { EmptyState } from '../../components/EmptyState';
import { MaterialPickerModal } from '../../components/MaterialPickerModal';
import { ProgressBar } from '../../components/ProgressBar';
import { colors, shadows, radius, spacing } from '../../constants/colors';
import { CATEGORY_LABEL } from '../../constants/fileTypes';
import { useFiles } from '../../hooks/useFiles';
import { useLms } from '../../hooks/useLms';
import { openFile } from '../../services/fileService';
import type { StoredFile } from '../../types/file';
import type { Quiz } from '../../types/lms';
import { errorMessage, formatBytes } from '../../utils/format';
import { bestAttemptPercent, courseCompletion, formatDuration } from '../../utils/progress';

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { files } = useFiles();
  const {
    data,
    loading,
    getCourse,
    quizzesFor,
    attemptsFor,
    toggleMaterialComplete,
    setMaterials,
    addTimeSpent,
    deleteCourse,
    deleteQuiz,
  } = useLms();
  const [pickerOpen, setPickerOpen] = useState(false);
  const course = getCourse(id);

  // Approximate time spent: how long this screen stays in focus (capped at 1 hour per visit).
  useFocusEffect(
    useCallback(() => {
      if (!id) return undefined;
      const start = Date.now();
      return () => {
        const seconds = Math.min(Math.round((Date.now() - start) / 1000), 3600);
        if (seconds > 0) addTimeSpent(id, seconds);
      };
    }, [id, addTimeSpent]),
  );

  if (!course) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="alert-circle-outline"
          title={loading ? 'Loading…' : 'Course not found'}
          message={loading ? 'Please wait a moment.' : 'This course may have been deleted.'}
          actionLabel={loading ? undefined : 'Go back'}
          onAction={loading ? undefined : () => router.back()}
        />
      </View>
    );
  }

  const materials = course.materialIds
    .map((materialId) => files.find((f) => f.id === materialId))
    .filter((f): f is StoredFile => f !== undefined);
  const progress = data.progress[course.id];
  const completed = new Set(progress?.completedMaterialIds ?? []);
  const completion = courseCompletion(course, progress, new Set(materials.map((f) => f.id)));
  const quizzes = quizzesFor(course.id);

  const guard = async (action: () => Promise<void>, title: string) => {
    try {
      await action();
    } catch (error) {
      Alert.alert(title, errorMessage(error, 'Something went wrong.'));
    }
  };

  const confirmDeleteCourse = () =>
    Alert.alert(
      'Delete course',
      `Delete "${course.title}", its quizzes and its progress? Your files stay in the library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            guard(async () => {
              await deleteCourse(course.id);
              router.back();
            }, 'Could not delete course'),
        },
      ],
    );

  const confirmDeleteQuiz = (quiz: Quiz) =>
    Alert.alert('Delete quiz', `Delete "${quiz.title}" and its results?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => guard(() => deleteQuiz(quiz.id), 'Could not delete quiz') },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{course.title}</Text>
        {course.description ? <Text style={styles.description}>{course.description}</Text> : null}
        <ProgressBar percent={completion.percent} />
        <Text style={styles.muted}>
          {completion.percent}% complete · {completion.done} of {completion.total} materials · time in course{' '}
          {formatDuration(progress?.secondsSpent ?? 0)}
        </Text>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Materials</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setPickerOpen(true)}>
          <Text style={styles.link}>Add / remove</Text>
        </Pressable>
      </View>
      {materials.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>No materials yet. Add presentations or exercises from your library.</Text>
          <ActionButton label="Add materials" icon="add-circle-outline" onPress={() => setPickerOpen(true)} />
        </View>
      ) : (
        <View style={styles.list}>
          {materials.map((file) => {
            const done = completed.has(file.id);
            return (
              <View key={file.id} style={styles.row}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`Mark ${file.name} as ${done ? 'not done' : 'done'}`}
                  hitSlop={8}
                  onPress={() => guard(() => toggleMaterialComplete(course.id, file.id), 'Could not update progress')}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={done ? colors.primary : colors.textMuted}
                  />
                </Pressable>
                <Pressable
                  style={styles.rowInfo}
                  onPress={() => router.push({ pathname: '/file-details/[id]', params: { id: file.id } })}
                >
                  <Text style={[styles.rowName, done && styles.rowDone]} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={styles.muted}>
                    {CATEGORY_LABEL[file.category]} · {formatBytes(file.size)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${file.name}`}
                  hitSlop={8}
                  onPress={() => guard(() => openFile(file), 'Could not open file')}
                >
                  <Ionicons name="open-outline" size={22} color={colors.primary} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Quizzes</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push({ pathname: '/quiz-form', params: { courseId: course.id } })}
        >
          <Text style={styles.link}>New quiz</Text>
        </Pressable>
      </View>
      {quizzes.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>No quizzes yet. Build a multiple-choice quiz that is graded automatically.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {quizzes.map((quiz) => {
            const attempts = attemptsFor(quiz.id);
            const best = bestAttemptPercent(attempts);
            return (
              <View key={quiz.id} style={styles.quizCard}>
                <Text style={styles.rowName}>{quiz.title}</Text>
                <Text style={styles.muted}>
                  {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'} · {attempts.length}{' '}
                  {attempts.length === 1 ? 'attempt' : 'attempts'} · best {best === null ? '—' : `${best}%`}
                </Text>
                <View style={styles.quizActions}>
                  <ActionButton
                    label="Take quiz"
                    icon="play-outline"
                    flex
                    disabled={quiz.questions.length === 0}
                    onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: quiz.id } })}
                  />
                  <ActionButton
                    label="Edit"
                    icon="create-outline"
                    variant="secondary"
                    onPress={() =>
                      router.push({ pathname: '/quiz-form', params: { courseId: course.id, quizId: quiz.id } })
                    }
                  />
                  <ActionButton label="" icon="trash-outline" variant="danger" onPress={() => confirmDeleteQuiz(quiz)} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <ActionButton
          label="Edit course"
          icon="create-outline"
          variant="secondary"
          onPress={() => router.push({ pathname: '/course-form', params: { id: course.id } })}
        />
        <ActionButton label="Delete course" icon="trash-outline" variant="danger" onPress={confirmDeleteCourse} />
      </View>

      <MaterialPickerModal
        visible={pickerOpen}
        files={files}
        selectedIds={course.materialIds}
        onClose={() => setPickerOpen(false)}
        onSave={(ids) => {
          setPickerOpen(false);
          guard(() => setMaterials(course.id, ids), 'Could not update materials');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  muted: { fontSize: 12, color: colors.textMuted },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  link: { fontSize: 14, fontWeight: '600', color: colors.primary },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  quizCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  quizActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  footer: { gap: spacing.sm, marginTop: spacing.md },
});
