import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: clamped }}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.primaryMid, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
