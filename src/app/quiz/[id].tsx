import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { QuizRunner } from '../../components/QuizRunner';
import { colors } from '../../constants/colors';
import { useLms } from '../../hooks/useLms';
import { errorMessage } from '../../utils/format';
import { createId } from '../../utils/id';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getQuiz, recordAttempt, loading } = useLms();
  const quiz = getQuiz(id);

  if (!quiz || quiz.questions.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="alert-circle-outline"
          title={loading ? 'Loading…' : 'Quiz not available'}
          message={loading ? 'Please wait a moment.' : 'This quiz was deleted or has no questions.'}
          actionLabel={loading ? undefined : 'Go back'}
          onAction={loading ? undefined : () => router.back()}
        />
      </View>
    );
  }

  return (
    <QuizRunner
      title={quiz.title}
      questions={quiz.questions}
      onDone={() => router.back()}
      grade={async (answers) => {
        const correct = quiz.questions.map((q) => q.correctIndex);
        const score = answers.filter((answer, i) => answer === correct[i]).length;
        try {
          await recordAttempt({
            id: createId(),
            quizId: quiz.id,
            courseId: quiz.courseId,
            score,
            total: quiz.questions.length,
            takenAt: new Date().toISOString(),
          });
        } catch (error) {
          Alert.alert('Result not saved', errorMessage(error, 'Your score could not be saved, but you can still review it.'));
        }
        return { score, correct };
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
