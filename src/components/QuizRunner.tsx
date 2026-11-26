import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, radius, spacing } from '../constants/colors';
import { errorMessage } from '../utils/format';
import { ActionButton } from './ActionButton';
import { ProgressBar } from './ProgressBar';

export interface RunnerQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface GradeResult {
  score: number;
  /** Index of the correct option for every question, in order. */
  correct: number[];
}

interface QuizRunnerProps {
  title: string;
  questions: RunnerQuestion[];
  /** Grades the answers (one chosen option index per question). Throw to stay on the quiz and retry. */
  grade: (answers: number[]) => Promise<GradeResult>;
  onDone: () => void;
}

/** Shared quiz-taking flow used for personal quizzes (graded on the device) and class quizzes (graded by the server). */
export function QuizRunner({ title, questions, grade, onDone }: QuizRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = questions.length;
  const question = questions[index];
  const selected = answers[question.id];
  const isLast = index === total - 1;

  const finish = async () => {
    setSubmitting(true);
    try {
      setResult(await grade(questions.map((q) => answers[q.id] ?? -1)));
    } catch (error) {
      Alert.alert('Could not submit quiz', errorMessage(error, 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
  };

  if (result) {
    const percent = Math.round((result.score / total) * 100);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title }} />
        <View style={styles.card}>
          <Text style={styles.resultLabel}>Your score</Text>
          <Text style={styles.resultScore}>
            {result.score} / {total}
          </Text>
          <Text style={styles.resultPercent}>{percent}%</Text>
        </View>

        <Text style={styles.sectionTitle}>Review</Text>
        {questions.map((q, i) => {
          const chosen = answers[q.id];
          const correctIndex = result.correct[i];
          const isCorrect = chosen === correctIndex;
          return (
            <View key={q.id} style={styles.card}>
              <View style={styles.reviewHeader}>
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={22}
                  color={isCorrect ? colors.primary : colors.danger}
                />
                <Text style={styles.reviewPrompt}>
                  {i + 1}. {q.prompt}
                </Text>
              </View>
              <Text style={styles.reviewLine}>
                Your answer: {chosen === undefined ? 'No answer' : (q.options[chosen] ?? 'No answer')}
              </Text>
              {!isCorrect ? (
                <Text style={styles.reviewCorrect}>Correct answer: {q.options[correctIndex] ?? '—'}</Text>
              ) : null}
            </View>
          );
        })}

        <View style={styles.actions}>
          <ActionButton label="Retake quiz" icon="refresh-outline" variant="secondary" onPress={retake} />
          <ActionButton label="Done" onPress={onDone} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />
      <Text style={styles.muted}>
        Question {index + 1} of {total}
      </Text>
      <ProgressBar percent={(index / total) * 100} />
      <View style={styles.card}>
        <Text style={styles.prompt}>{question.prompt}</Text>
      </View>
      {question.options.map((option, optionIndex) => {
        const active = selected === optionIndex;
        return (
          <Pressable
            key={optionIndex}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
            style={[styles.option, active && styles.optionActive]}
          >
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={active ? colors.primary : colors.textMuted}
            />
            <Text style={styles.optionText}>{option}</Text>
          </Pressable>
        );
      })}
      <View style={styles.actions}>
        {index > 0 ? (
          <ActionButton
            label="Previous"
            icon="arrow-back-outline"
            variant="secondary"
            onPress={() => setIndex((i) => i - 1)}
          />
        ) : null}
        {isLast ? (
          <ActionButton label="Finish quiz" disabled={selected === undefined} loading={submitting} onPress={finish} />
        ) : (
          <ActionButton label="Next" disabled={selected === undefined} onPress={() => setIndex((i) => i + 1)} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  muted: { fontSize: 13, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  prompt: { fontSize: 18, fontWeight: '700', color: colors.text, lineHeight: 26 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { flex: 1, fontSize: 15, color: colors.text },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  resultLabel: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  resultScore: { fontSize: 40, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  resultPercent: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  reviewHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  reviewPrompt: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  reviewLine: { fontSize: 14, color: colors.text },
  reviewCorrect: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
