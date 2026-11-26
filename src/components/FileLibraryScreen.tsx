import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';
import { CATEGORY_LABEL } from '../constants/fileTypes';
import { useFiles } from '../hooks/useFiles';
import type { FileCategory, SortOption, StoredFile } from '../types/file';
import { errorMessage, sortFiles } from '../utils/format';
import { ActionButton } from './ActionButton';
import { EmptyState } from './EmptyState';
import { FileCard } from './FileCard';
import { Header } from './Header';
import { SearchBar } from './SearchBar';

interface FileLibraryScreenProps {
  category: FileCategory;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyMessage: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
];

export function FileLibraryScreen({
  category,
  title,
  subtitle,
  searchPlaceholder,
  emptyTitle,
  emptyMessage,
}: FileLibraryScreenProps) {
  const { files, loading, addFile, removeFile } = useFiles();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [uploading, setUploading] = useState(false);

  const categoryFiles = useMemo(() => files.filter((f) => f.category === category), [files, category]);

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? categoryFiles.filter((f) => f.name.toLowerCase().includes(q)) : categoryFiles;
    return sortFiles(filtered, sort);
  }, [categoryFiles, query, sort]);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const outcome = await addFile(category);
      if (outcome.status === 'success') {
        Alert.alert('File added', `"${outcome.file.name}" was saved to your library.`);
      }
    } catch (error) {
      Alert.alert('Could not add file', errorMessage(error, 'Something went wrong while adding the file.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (file: StoredFile) => {
    Alert.alert('Delete file', `Delete "${file.name}"? It will be removed from this device and cannot be recovered.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFile(file.id);
          } catch (error) {
            Alert.alert('Could not delete file', errorMessage(error, 'Something went wrong while deleting the file.'));
          }
        },
      },
    ]);
  };

  const openDetails = (file: StoredFile) =>
    router.push({ pathname: '/file-details/[id]', params: { id: file.id } });

  const label = CATEGORY_LABEL[category].toLowerCase();

  return (
    <View style={styles.screen}>
      <Header title={title} subtitle={subtitle} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleFiles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.controls}>
              <ActionButton
                label={`Upload ${label}`}
                icon="cloud-upload-outline"
                onPress={handleUpload}
                loading={uploading}
              />
              {categoryFiles.length > 0 ? (
                <>
                  <SearchBar value={query} onChangeText={setQuery} placeholder={searchPlaceholder} />
                  <View style={styles.sortRow}>
                    {SORT_OPTIONS.map((option) => {
                      const active = option.value === sort;
                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => setSort(option.value)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.count}>
                    {visibleFiles.length} of {categoryFiles.length} {categoryFiles.length === 1 ? 'file' : 'files'}
                  </Text>
                </>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <FileCard file={item} onPress={() => openDetails(item)} onDelete={() => handleDelete(item)} />
          )}
          ListEmptyComponent={
            categoryFiles.length === 0 ? (
              <EmptyState icon="folder-open-outline" title={emptyTitle} message={emptyMessage} />
            ) : (
              <EmptyState
                icon="search-outline"
                title="No matches"
                message={`No ${label} files match "${query.trim()}".`}
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  controls: { gap: spacing.md, marginBottom: spacing.md },
  sortRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  count: { fontSize: 12, color: colors.textMuted },
});
