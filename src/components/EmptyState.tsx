import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/colors';
import { ActionButton } from './ActionButton';

interface EmptyStateProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={34} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <ActionButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.2 },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
    maxWidth: 320,
  },
  action: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
