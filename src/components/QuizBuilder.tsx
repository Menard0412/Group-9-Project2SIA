import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, shadows, radius, spacing } from '../constants/colors';
import type { QuizQuestion } from '../types/lms';
import { errorMessage } from '../utils/format';
import { createId } from '../utils/id';
import { ActionButton } from './ActionButton';
import { TextField } from './TextField';

const OPTION_COUNT = 4;

interface DraftQuestion {
  key: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

function blankQuestion(): DraftQuestion {
  return { key: createId(), prompt: '', options: Array.from({ length: OPTION_COUNT }, () => ''), correctIndex: 0 };
}

function toDraft(question: QuizQuestion): DraftQuestion {
  const options = [...question.options];
  while (options.length < OPTION_COUNT) options.push('');
  return { key: question.id, prompt: question.prompt, options, correctIndex: question.correctIndex };
}

interface QuizBuilderProps {
  initialTitle?: string;
  initialQuestions?: QuizQuestion[];
  submitLabel: string;
  /** Optional note shown above the form. */
  notice?: string;
  /** Receives a validated title and questions. Throw to show an error and keep editing. */
  onSubmit: (title: string, questions: QuizQuestion[]) => Promise<void>;
}

/** Shared quiz editor used for personal quizzes and for class quizzes. */
export function QuizBuilder({ initialTitle = '', initialQuestions, submitLabel, notice, onSubmit }: QuizBuilderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    initialQuestions && initialQuestions.length > 0 ? initialQuestions.map(toDraft) : [blankQuestion()],
  );
  const [saving, setSaving] = useState(false);

  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) =>
    setQuestions((current) => current.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  const updateOption = (key: string, index: number, text: string) =>
    setQuestions((current) =>
      current.map((q) => (q.key === key ? { ...q, options: q.options.map((o, i) => (i === index ? text : o)) } : q)),
    );

  const removeQuestion = (key: string) =>
    setQuestions((current) => (current.length > 1 ? current.filter((q) => q.key !== key) : current));

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please give the quiz a title.');
      return;
    }
    const cleaned: QuizQuestion[] = [];
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const label = `Question ${i + 1}`;
      const prompt = q.prompt.trim();
      if (!prompt) {
        Alert.alert('Incomplete question', `${label} needs question text.`);
        return;
      }
      const kept = q.options
        .map((text, originalIndex) => ({ text: text.trim(), originalIndex }))
        .filter((o) => o.text.length > 0);
      if (kept.length < 2) {
        Alert.alert('Incomplete question', `${label} needs at least two answer options.`);
        return;
      }
      const correctIndex = kept.findIndex((o) => o.originalIndex === q.correctIndex);
      if (correctIndex === -1) {
        Alert.alert('Incomplete question', `${label}: mark one of the filled-in answers as correct.`);
        return;
      }
      cleaned.push({ id: q.key, prompt, options: kept.map((o) => o.text), correctIndex });
    }

    setSaving(true);
    try {
      await onSubmit(title.trim(), cleaned);
    } catch (error) {
      Alert.alert('Could not save quiz', errorMessage(error, 'Something went wrong.'));
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <TextField label="Quiz title" value={title} onChangeText={setTitle} placeholder="e.g. Chapter 1 check" />

      {questions.map((question, index) => (
        <View key={question.key} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Question {index + 1}</Text>
            {questions.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove question ${index + 1}`}
                hitSlop={8}
                onPress={() => removeQuestion(question.key)}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
          <TextField
            value={question.prompt}
            onChangeText={(text) => updateQuestion(question.key, { prompt: text })}
            placeholder="Type the question"
            multiline
          />
          <Text style={styles.hint}>Fill in 2–4 answers and tap the circle next to the correct one.</Text>
          {question.options.map((option, optionIndex) => {
            const correct = question.correctIndex === optionIndex;
            return (
              <View key={optionIndex} style={styles.optionRow}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: correct }}
                  accessibilityLabel={`Mark answer ${optionIndex + 1} as correct`}
                  hitSlop={8}
                  onPress={() => updateQuestion(question.key, { correctIndex: optionIndex })}
                >
                  <Ionicons
                    name={correct ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={correct ? colors.primary : colors.textMuted}
                  />
                </Pressable>
                <TextInput
                  style={styles.optionInput}
                  value={option}
                  onChangeText={(text) => updateOption(question.key, optionIndex, text)}
                  placeholder={`Answer ${optionIndex + 1}`}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            );
          })}
        </View>
      ))}

      <ActionButton
        label="Add question"
        icon="add-circle-outline"
        variant="secondary"
        onPress={() => setQuestions((current) => [...current, blankQuestion()])}
      />
      <ActionButton label={submitLabel} onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
  notice: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
});
