import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, radius, spacing } from '../constants/colors';
import { deleteClassQuiz, listAttempts, listClassQuizzes } from '../services/classworkService';
import type { ClassAttempt, ClassQuiz } from '../types/classwork';
import type { ClassRoom } from '../types/cloud';
import { errorMessage } from '../utils/format';
import { formatDateTime } from '../utils/time';
import { ActionButton } from './ActionButton';
import { EmptyState } from './EmptyState';

interface QuizzesTabProps {
  room: ClassRoom;
  isInstructor: boolean;
  refreshToken: number;
}

const percent = (a: ClassAttempt) => (a.total === 0 ? 0 : Math.round((a.score / a.total) * 100));

export function QuizzesTab({ room, isInstructor, refreshToken }: QuizzesTabProps) {
  const [quizzes, setQuizzes] = useState<ClassQuiz[]>([]);
  const [attempts, setAttempts] = useState<ClassAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [q, a] = await Promise.all([listClassQuizzes(room.id), listAttempts(room.id)]);
      setQuizzes(q);
      setAttempts(a);
    } catch (e) {
      setError(errorMessage(e, 'Could not load quizzes.'));
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const confirmDelete = (quiz: ClassQuiz) =>
    Alert.alert('Delete quiz', `Delete "${quiz.title}" and all learner results?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClassQuiz(quiz.id);
            await load();
          } catch (e) {
            Alert.alert('Could not delete quiz', errorMessage(e, 'Something went wrong.'));
          }
        },
      },
    ]);

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />;
  }

  return (
    <View style={styles.wrap}>
      {isInstructor ? (
        <ActionButton
          label="New quiz"
          icon="add-circle-outline"
          onPress={() => router.push({ pathname: '/class-quiz-form', params: { classId: room.id } })}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {quizzes.length === 0 ? (
        <EmptyState
          icon="help-circle-outline"
          title="No quizzes yet"
          message={
            isInstructor
              ? 'Build a multiple-choice quiz. It is graded automatically on the server.'
              : 'Your instructor has not published any quizzes yet.'
          }
        />
      ) : (
        quizzes.map((quiz) => {
          const quizAttempts = attempts.filter((a) => a.quizId === quiz.id);
          const best = quizAttempts.length === 0 ? null : Math.max(...quizAttempts.map(percent));
          return (
            <View key={quiz.id} style={styles.card}>
              <Text style={styles.title}>{quiz.title}</Text>
              <Text style={styles.muted}>
                {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'} ·{' '}
                {isInstructor
                  ? `${quizAttempts.length} ${quizAttempts.length === 1 ? 'attempt' : 'attempts'}`
                  : `your best ${best === null ? '—' : `${best}%`}`}
              </Text>

              {isInstructor && quizAttempts.length > 0 ? (
                <View style={styles.results}>
                  {quizAttempts.slice(0, 5).map((a) => (
                    <View key={a.id} style={styles.resultRow}>
                      <Text style={styles.resultName} numberOfLines={1}>
                        {a.learnerName}
                      </Text>
                      <Text style={styles.resultScore}>
                        {a.score}/{a.total} · {percent(a)}%
                      </Text>
                      <Text style={styles.muted}>{formatDateTime(a.takenAt).split(',')[0]}</Text>
                    </View>
                  ))}
                  {quizAttempts.length > 5 ? (
                    <Text style={styles.muted}>Showing the 5 most recent of {quizAttempts.length} attempts.</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.actions}>
                {!isInstructor ? (
                  <ActionButton
                    label={quizAttempts.length > 0 ? 'Retake quiz' : 'Take quiz'}
                    icon="play-outline"
                    flex
                    disabled={quiz.questions.length === 0}
                    onPress={() => router.push({ pathname: '/class-quiz/[id]', params: { id: quiz.id } })}
                  />
                ) : (
                  <>
                    <ActionButton
                      label="Edit"
                      icon="create-outline"
                      variant="secondary"
                      flex
                      onPress={() =>
                        router.push({ pathname: '/class-quiz-form', params: { classId: room.id, quizId: quiz.id } })
                      }
                    />
                    <ActionButton
                      label="Delete"
                      icon="trash-outline"
                      variant="danger"
                      flex
                      onPress={() => confirmDelete(quiz)}
                    />
                  </>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  spinner: { marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
  results: { gap: spacing.xs, marginTop: spacing.xs },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  resultName: { flex: 1, fontSize: 14, color: colors.text },
  resultScore: { fontSize: 13, fontWeight: '700', color: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
