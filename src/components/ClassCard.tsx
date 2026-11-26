import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../constants/colors';
import type { ClassRoom } from '../types/cloud';

interface ClassCardProps {
  room: ClassRoom;
  isInstructor: boolean;
  unread?: number;
  onPress: () => void;
}

export function ClassCard({ room, isInstructor, unread = 0, onPress }: ClassCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open class ${room.title}${unread > 0 ? `, ${unread} new` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <Ionicons name="people" size={22} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {room.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {isInstructor ? `You teach this class · code ${room.joinCode}` : `Instructor: ${room.instructorName}`}
        </Text>
        {room.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {room.description}
          </Text>
        ) : null}
      </View>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread} new</Text>
        </View>
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
  pressed: { opacity: 0.88 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  description: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  badge: { backgroundColor: colors.accent, borderRadius: radius.lg, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
