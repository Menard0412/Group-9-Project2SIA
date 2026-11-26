import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, shadows, spacing } from '../constants/colors';

type Variant = 'primary' | 'secondary' | 'danger';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  flex?: boolean;
}

const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.primaryMid },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
};

export function ActionButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  flex = false,
}: ActionButtonProps) {
  const { bg, fg, border } = palette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || 'Action'}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border, opacity: inactive ? 0.55 : pressed ? 0.88 : 1 },
        variant === 'primary' && !inactive && shadows.raised,
        flex && styles.flex,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
          {label ? <Text style={[styles.label, { color: fg }]}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
});
