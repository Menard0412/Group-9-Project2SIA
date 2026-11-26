import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../constants/colors';
import { CATEGORY_LABEL } from '../constants/fileTypes';
import type { StoredFile } from '../types/file';
import { formatBytes } from '../utils/format';
import { ActionButton } from './ActionButton';
import { EmptyState } from './EmptyState';

interface MaterialPickerModalProps {
  visible: boolean;
  files: StoredFile[];
  selectedIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}

export function MaterialPickerModal({ visible, files, selectedIds, onClose, onSave }: MaterialPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (visible) setSelection(selectedIds);
  }, [visible, selectedIds]);

  const toggle = (id: string) =>
    setSelection((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Course materials</Text>
          <Pressable accessibilityLabel="Close" hitSlop={8} onPress={onClose}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <FlatList
          data={files}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="folder-open-outline"
              title="Library is empty"
              message="Upload presentations or exercises first, then add them to a course."
            />
          }
          renderItem={({ item }) => {
            const checked = selection.includes(item.id);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(item.id)}
                style={[styles.row, checked && styles.rowChecked]}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={checked ? colors.primary : colors.textMuted}
                />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {CATEGORY_LABEL[item.category]} · {formatBytes(item.size)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
        <View style={styles.footer}>
          <ActionButton label={`Save (${selection.length} selected)`} onPress={() => onSave(selection)} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  list: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowChecked: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
