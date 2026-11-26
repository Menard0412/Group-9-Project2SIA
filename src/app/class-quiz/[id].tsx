import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { QuizRunner } from '../../components/QuizRunner';
import { colors } from '../../constants/colors';
import { getClassQuiz, submitClassAttempt } from '../../services/classworkService';
import type { ClassQuiz } from '../../types/classwork';
import { errorMessage } from '../../utils/format';

export default function ClassQuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quiz, setQuiz] = useState<ClassQuiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getClassQuiz(id)
      .then((loaded) => {
        if (active) setQuiz(loaded);
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
  }, [id]);

  if (!quiz || quiz.questions.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={loading ? 'hourglass-outline' : 'alert-circle-outline'}
          title={loading ? 'Loading…' : 'Quiz not available'}
          message={loading ? 'Please wait a moment.' : (error ?? 'This quiz was deleted or you no longer have access.')}
          actionLabel={loading ? undefined : 'Go back'}
          onAction={loading ? undefined : () => router.back()}
        />
      </View>
    );
  }

  return (
    <QuizRunner
      title={quiz.title}
      questions={quiz.questions.map((q, i) => ({ id: `${quiz.id}-${i}`, prompt: q.prompt, options: q.options }))}
      onDone={() => router.back()}
      grade={async (answers) => {
        const result = await submitClassAttempt(quiz.id, answers);
        return { score: result.score, correct: result.correct };
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
