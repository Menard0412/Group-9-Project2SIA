import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { TextField } from '../components/TextField';
import { colors, spacing } from '../constants/colors';
import { useLms } from '../hooks/useLms';
import { errorMessage } from '../utils/format';

export default function CourseFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getCourse, createCourse, updateCourse } = useLms();
  const existing = getCourse(id);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please give the course a title.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateCourse(existing.id, { title, description });
        router.back();
      } else {
        const course = await createCourse({ title, description });
        router.replace({ pathname: '/course/[id]', params: { id: course.id } });
      }
    } catch (error) {
      Alert.alert('Could not save course', errorMessage(error, 'Something went wrong.'));
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Course title" value={title} onChangeText={setTitle} placeholder="e.g. Introduction to Biology" />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What is this course about?"
        multiline
      />
      <View style={styles.actions}>
        <ActionButton label={existing ? 'Save changes' : 'Create course'} onPress={save} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  actions: { marginTop: spacing.sm },
});
