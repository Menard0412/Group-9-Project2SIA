import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../constants/colors';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A pill-style tab switcher that scrolls sideways when there are many options. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(option.value)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.primaryMid, borderRadius: radius.md, padding: 4 },
  scroll: { flexGrow: 1, gap: 4 },
  segment: {
    flexGrow: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface, ...shadows.card },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  labelActive: { color: colors.primary },
});
