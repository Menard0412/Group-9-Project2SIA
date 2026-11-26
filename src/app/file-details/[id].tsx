import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { EmptyState } from '../../components/EmptyState';
import { iconForExtension } from '../../components/FileCard';
import { colors, shadows, radius, spacing } from '../../constants/colors';
import { CATEGORY_LABEL } from '../../constants/fileTypes';
import { useFiles } from '../../hooks/useFiles';
import { openFile, shareFile } from '../../services/fileService';
import { errorMessage, formatBytes, formatDate } from '../../utils/format';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function FileDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFile, removeFile, loading } = useFiles();
  const [busy, setBusy] = useState(false);
  const file = getFile(id);

  if (!file) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="alert-circle-outline"
          title={loading ? 'Loading…' : 'File not found'}
          message={loading ? 'Please wait a moment.' : 'This file may have been deleted.'}
          actionLabel={loading ? undefined : 'Go back'}
          onAction={loading ? undefined : () => router.back()}
        />
      </View>
    );
  }

  const icon = iconForExtension(file.extension);

  const run = async (action: () => Promise<void>, failureTitle: string) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert(failureTitle, errorMessage(error, 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete file', `Delete "${file.name}"? It will be removed from this device and cannot be recovered.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await removeFile(file.id);
            router.back();
          }, 'Could not delete file'),
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={40} color={icon.color} />
        </View>
        <Text style={styles.name}>{file.name}</Text>
      </View>

      <View style={styles.card}>
        <Row label="Category" value={CATEGORY_LABEL[file.category]} />
        <Row label="Type" value={`.${file.extension}`} />
        <Row label="Size" value={formatBytes(file.size)} />
        <Row label="Date added" value={formatDate(file.createdAt)} />
      </View>

      <View style={styles.actions}>
        <ActionButton
          label="Open"
          icon="open-outline"
          disabled={busy}
          onPress={() => run(() => openFile(file), 'Could not open file')}
        />
        <ActionButton
          label="Share"
          icon="share-outline"
          variant="secondary"
          disabled={busy}
          onPress={() => run(() => shareFile(file), 'Could not share file')}
        />
        <ActionButton label="Delete" icon="trash-outline" variant="danger" disabled={busy} onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  heroIcon: { width: 80, height: 80, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 15, color: colors.textMuted },
  rowValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  actions: { gap: spacing.sm },
});
