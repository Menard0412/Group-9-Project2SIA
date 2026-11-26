import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { CourseCard } from '../../components/CourseCard';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { colors, spacing } from '../../constants/colors';
import { useFiles } from '../../hooks/useFiles';
import { useLms } from '../../hooks/useLms';
import { courseCompletion } from '../../utils/progress';

export default function CoursesScreen() {
  const { files } = useFiles();
  const { data, loading, quizzesFor } = useLms();
  const availableIds = new Set(files.map((f) => f.id));

  return (
    <View style={styles.screen}>
      <Header title="Courses" subtitle="Group your materials, track progress and take quizzes" />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data.courses}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListHeaderComponent={
            <View style={styles.headerAction}>
              <ActionButton label="New course" icon="add-circle-outline" onPress={() => router.push('/course-form')} />
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="school-outline"
              title="No courses yet"
              message="Create a course, then add presentations and exercises from your library and build quizzes for it."
            />
          }
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              completion={courseCompletion(item, data.progress[item.id], availableIds)}
              quizCount={quizzesFor(item.id).length}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  headerAction: { marginBottom: spacing.md },
});
