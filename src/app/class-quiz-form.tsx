import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { QuizBuilder } from '../components/QuizBuilder';
import { colors } from '../constants/colors';
import { createClassQuiz, getQuizForEdit, updateClassQuiz } from '../services/classworkService';
import type { QuizQuestion } from '../types/lms';
import { errorMessage } from '../utils/format';

export default function ClassQuizFormScreen() {
  const { classId, quizId } = useLocalSearchParams<{ classId: string; quizId?: string }>();
  const [initial, setInitial] = useState<{ title: string; questions: QuizQuestion[] } | null>(null);
  const [loading, setLoading] = useState(Boolean(quizId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return undefined;
    let active = true;
    getQuizForEdit(quizId)
      .then((loaded) => {
        if (active) setInitial(loaded);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e, 'Could not load this quiz.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quizId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title="Quiz not available"
          message={error}
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <QuizBuilder
      initialTitle={initial?.title}
      initialQuestions={initial?.questions}
      submitLabel={quizId ? 'Save changes' : 'Publish quiz'}
      notice={
        quizId
          ? 'Learners keep the scores they already earned. Only new attempts use the updated questions.'
          : undefined
      }
      onSubmit={async (title, questions) => {
        if (quizId) await updateClassQuiz(quizId, title, questions);
        else await createClassQuiz(classId, title, questions);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
