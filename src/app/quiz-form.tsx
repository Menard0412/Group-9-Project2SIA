import { router, useLocalSearchParams } from 'expo-router';
import { QuizBuilder } from '../components/QuizBuilder';
import { useLms } from '../hooks/useLms';
import { createId } from '../utils/id';

export default function QuizFormScreen() {
  const { courseId, quizId } = useLocalSearchParams<{ courseId: string; quizId?: string }>();
  const { getQuiz, saveQuiz } = useLms();
  const existing = getQuiz(quizId);

  return (
    <QuizBuilder
      initialTitle={existing?.title}
      initialQuestions={existing?.questions}
      submitLabel={existing ? 'Save changes' : 'Save quiz'}
      onSubmit={async (title, questions) => {
        await saveQuiz({
          id: existing?.id ?? createId(),
          courseId: existing?.courseId ?? courseId,
          title,
          questions,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        });
        router.back();
      }}
    />
  );
}
