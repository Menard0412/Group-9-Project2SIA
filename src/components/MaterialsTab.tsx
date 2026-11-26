import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';
import { useFiles } from '../hooks/useFiles';
import {
  deleteMaterial,
  downloadMaterial,
  listClassProgress,
  listMaterials,
  listMyCompleted,
  setMaterialCompleted,
  uploadMaterial,
} from '../services/classworkService';
import { openFile } from '../services/fileService';
import type { ClassMaterial } from '../types/classwork';
import type { ClassRoom } from '../types/cloud';
import { errorMessage, formatBytes } from '../utils/format';
import { ActionButton } from './ActionButton';
import { EmptyState } from './EmptyState';
import { MaterialPickerModal } from './MaterialPickerModal';

const NO_SELECTION: string[] = [];

interface MaterialsTabProps {
  room: ClassRoom;
  userId: string;
  isInstructor: boolean;
  learnerCount: number;
  refreshToken: number;
}

export function MaterialsTab({ room, userId, isInstructor, learnerCount, refreshToken }: MaterialsTabProps) {
  const { files } = useFiles();
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [doneCounts, setDoneCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMaterials(await listMaterials(room.id));
      if (isInstructor) {
        const counts: Record<string, number> = {};
        for (const row of await listClassProgress(room.id)) {
          counts[row.materialId] = (counts[row.materialId] ?? 0) + 1;
        }
        setDoneCounts(counts);
      } else {
        setCompleted(new Set(await listMyCompleted(room.id, userId)));
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not load materials.'));
    } finally {
      setLoading(false);
    }
  }, [room.id, userId, isInstructor]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const upload = async (ids: string[]) => {
    setPickerOpen(false);
    const chosen = files.filter((f) => ids.includes(f.id));
    if (chosen.length === 0) return;
    const failures: string[] = [];
    for (let i = 0; i < chosen.length; i += 1) {
      setBusy(`Uploading ${i + 1} of ${chosen.length}…`);
      try {
        await uploadMaterial(room.id, userId, chosen[i]);
      } catch (e) {
        failures.push(`${chosen[i].name}: ${errorMessage(e, 'upload failed')}`);
      }
    }
    setBusy(null);
    await load();
    if (failures.length > 0) Alert.alert('Some files were not uploaded', failures.join('\n'));
  };

  const open = async (material: ClassMaterial) => {
    setBusy('Opening…');
    try {
      await openFile(await downloadMaterial(material));
    } catch (e) {
      Alert.alert('Could not open file', errorMessage(e, 'Something went wrong.'));
    } finally {
      setBusy(null);
    }
  };

  const toggleDone = async (material: ClassMaterial) => {
    const done = !completed.has(material.id);
    setCompleted((current) => {
      const next = new Set(current);
      if (done) next.add(material.id);
      else next.delete(material.id);
      return next;
    });
    try {
      await setMaterialCompleted(material, userId, done);
    } catch (e) {
      Alert.alert('Could not update progress', errorMessage(e, 'Something went wrong.'));
      await load();
    }
  };

  const confirmDelete = (material: ClassMaterial) =>
    Alert.alert('Remove material', `Remove "${material.name}" from this class for everyone?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy('Removing…');
          try {
            await deleteMaterial(material);
            await load();
          } catch (e) {
            Alert.alert('Could not remove material', errorMessage(e, 'Something went wrong.'));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />;
  }

  return (
    <View style={styles.wrap}>
      {isInstructor ? (
        <ActionButton
          label={busy ?? 'Add from my library'}
          icon="cloud-upload-outline"
          loading={busy !== null && busy.startsWith('Upload')}
          disabled={busy !== null}
          onPress={() => setPickerOpen(true)}
        />
      ) : null}
      {busy && !isInstructor ? <Text style={styles.muted}>{busy}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {materials.length === 0 ? (
        <EmptyState
          icon="document-attach-outline"
          title="No materials yet"
          message={
            isInstructor
              ? 'Upload presentations and exercises from your library for your learners.'
              : 'Your instructor has not shared any materials yet.'
          }
        />
      ) : (
        materials.map((material) => {
          const done = completed.has(material.id);
          return (
            <View key={material.id} style={styles.row}>
              {!isInstructor ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`Mark ${material.name} as ${done ? 'not done' : 'done'}`}
                  hitSlop={8}
                  onPress={() => toggleDone(material)}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={done ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              ) : null}
              <View style={styles.info}>
                <Text style={[styles.name, done && styles.nameDone]} numberOfLines={1}>
                  {material.name}
                </Text>
                <Text style={styles.muted}>
                  {material.extension.toUpperCase()} · {formatBytes(material.size)}
                  {isInstructor ? ` · ${doneCounts[material.id] ?? 0} of ${learnerCount} learners done` : ''}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${material.name}`}
                hitSlop={8}
                disabled={busy !== null}
                onPress={() => open(material)}
              >
                <Ionicons name="open-outline" size={22} color={colors.primary} />
              </Pressable>
              {isInstructor ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${material.name}`}
                  hitSlop={8}
                  disabled={busy !== null}
                  onPress={() => confirmDelete(material)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}

      <MaterialPickerModal
        visible={pickerOpen}
        files={files}
        selectedIds={NO_SELECTION}
        onClose={() => setPickerOpen(false)}
        onSave={upload}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  spinner: { marginTop: spacing.lg },
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
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  nameDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  muted: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
});
