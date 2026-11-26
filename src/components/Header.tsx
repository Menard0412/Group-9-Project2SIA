import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../constants/colors';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View pointerEvents="none" style={styles.circleLarge} />
      <View pointerEvents="none" style={styles.circleSmall} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg + spacing.sm,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
  },
  circleLarge: {
    position: 'absolute',
    right: -50,
    top: -60,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  circleSmall: {
    position: 'absolute',
    right: 70,
    bottom: -42,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  title: { color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
});
