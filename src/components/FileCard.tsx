import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, shadows, radius, spacing } from '../constants/colors';
import type { StoredFile } from '../types/file';
import { formatBytes, formatDate } from '../utils/format';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function iconForExtension(ext: string): { name: IconName; color: string; bg: string } {
  switch (ext) {
    case 'ppt':
    case 'pptx':
      return { name: 'easel-outline', color: colors.accent, bg: colors.accentSoft };
    case 'xls':
    case 'xlsx':
    case 'csv':
      return { name: 'grid-outline', color: '#15803D', bg: '#F0FDF4' };
    case 'pdf':
      return { name: 'document-text-outline', color: colors.danger, bg: colors.dangerSoft };
    default:
      return { name: 'document-outline', color: colors.primary, bg: colors.primarySoft };
  }
}

interface FileCardProps {
  file: StoredFile;
  onPress: () => void;
  onDelete?: () => void;
}

export function FileCard({ file, onPress, onDelete }: FileCardProps) {
  const icon = iconForExtension(file.extension);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${file.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={24} color={icon.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {file.extension.toUpperCase()} · {formatBytes(file.size)} · {formatDate(file.createdAt)}
        </Text>
      </View>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${file.name}`}
          hitSlop={8}
          onPress={onDelete}
          style={styles.delete}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
  },
  pressed: { opacity: 0.85 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  delete: { padding: spacing.xs },
});
