import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, radius, spacing } from '../constants/colors';
import type { Course } from '../types/lms';
import type { Completion } from '../utils/progress';
import { ProgressBar } from './ProgressBar';

interface CourseCardProps {
  course: Course;
  completion: Completion;
  quizCount: number;
  onPress: () => void;
}

export function CourseCard({ course, completion, quizCount, onPress }: CourseCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open course ${course.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.iconBox}>
          <Ionicons name="school" size={22} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {course.title}
          </Text>
          {course.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {course.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
      <ProgressBar percent={completion.percent} />
      <Text style={styles.meta}>
        {completion.done} of {completion.total} materials done · {completion.percent}% · {quizCount}{' '}
        {quizCount === 1 ? 'quiz' : 'quizzes'}
      </Text>
    </Pressable>
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
  pressed: { opacity: 0.85 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  description: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textMuted },
});
