import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { EmptyState } from '../components/EmptyState';
import { SegmentedControl } from '../components/SegmentedControl';
import { colors, shadows, radius, spacing } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { listProfiles, reviewInstructor } from '../services/cloudService';
import type { AdminProfile } from '../types/cloud';
import { errorMessage } from '../utils/format';
import { formatDateTime } from '../utils/time';

type Tab = 'pending' | 'people';

function describe(profile: AdminProfile): string {
  if (profile.role === 'admin') return 'Administrator';
  if (profile.role === 'instructor') {
    return profile.instructorStatus === 'approved' ? 'Instructor' : 'Instructor · awaiting approval';
  }
  return profile.instructorStatus === 'rejected' ? 'Learner · instructor request declined' : 'Learner';
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const [people, setPeople] = useState<AdminProfile[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setPeople(await listProfiles());
    } catch (e) {
      setError(errorMessage(e, 'Could not load accounts.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  if (!profile || profile.role !== 'admin') {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="lock-closed-outline"
          title="Administrators only"
          message="This area is only available to administrator accounts."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const pending = people.filter((p) => p.role === 'instructor' && p.instructorStatus === 'pending');

  const review = async (person: AdminProfile, approve: boolean) => {
    setBusyId(person.id);
    try {
      await reviewInstructor(person.id, approve);
      await load(false);
    } catch (e) {
      Alert.alert('Could not update account', errorMessage(e, 'Something went wrong.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = (person: AdminProfile) =>
    Alert.alert('Decline request', `Decline ${person.displayName}'s instructor request? They will become a learner.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => void review(person, false) },
    ]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <SegmentedControl
        options={[
          { value: 'pending', label: `Pending (${pending.length})` },
          { value: 'people', label: `Everyone (${people.length})` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} /> : null}

      {!loading && tab === 'pending' ? (
        pending.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="No pending requests"
            message="New instructor sign-ups will appear here for your approval."
          />
        ) : (
          pending.map((person) => (
            <View key={person.id} style={styles.card}>
              <Text style={styles.name}>{person.displayName}</Text>
              <Text style={styles.muted}>Requested {formatDateTime(person.createdAt)}</Text>
              <View style={styles.actions}>
                <ActionButton
                  label="Approve"
                  icon="checkmark-outline"
                  flex
                  loading={busyId === person.id}
                  disabled={busyId !== null}
                  onPress={() => void review(person, true)}
                />
                <ActionButton
                  label="Decline"
                  icon="close-outline"
                  variant="danger"
                  flex
                  disabled={busyId !== null}
                  onPress={() => confirmReject(person)}
                />
              </View>
            </View>
          ))
        )
      ) : null}

      {!loading && tab === 'people'
        ? people.map((person) => (
            <View key={person.id} style={styles.card}>
              <Text style={styles.name}>{person.displayName}</Text>
              <Text style={styles.muted}>
                {describe(person)} · joined {formatDateTime(person.createdAt).split(',')[0]}
              </Text>
            </View>
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  spinner: { marginTop: spacing.lg },
  error: { fontSize: 13, color: colors.danger },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
