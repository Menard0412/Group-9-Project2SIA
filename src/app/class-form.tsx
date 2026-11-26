import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { EmptyState } from '../components/EmptyState';
import { TextField } from '../components/TextField';
import { colors, spacing } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { createClass } from '../services/cloudService';
import { errorMessage } from '../utils/format';

export default function ClassFormScreen() {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (!profile || profile.role !== 'instructor' || profile.instructorStatus !== 'approved') {
    return (
      <ScrollView style={styles.screen}>
        <EmptyState
          icon="lock-closed-outline"
          title="Approved instructors only"
          message="Only approved instructor accounts can create classes."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </ScrollView>
    );
  }

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please give the class a title.');
      return;
    }
    setSaving(true);
    try {
      const id = await createClass(profile.id, title, description);
      router.replace({ pathname: '/class/[id]', params: { id } });
    } catch (error) {
      Alert.alert('Could not create class', errorMessage(error, 'Something went wrong.'));
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField label="Class title" value={title} onChangeText={setTitle} placeholder="e.g. Biology 101 – Section A" />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="What will this class cover?"
        multiline
      />
      <ActionButton label="Create class" onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
});
