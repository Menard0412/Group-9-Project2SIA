import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { ClassCard } from '../../components/ClassCard';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { TextField } from '../../components/TextField';
import { colors, shadows, radius, spacing } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useUnread } from '../../hooks/useUnread';
import { joinClass, listClasses } from '../../services/cloudService';
import type { ClassRoom } from '../../types/cloud';
import { errorMessage } from '../../utils/format';

export default function ClassesScreen() {
  const { configured, loading: authLoading, session, profile, signOut } = useAuth();
  const userId = session?.user.id;
  const { counts, refresh: refreshUnread } = useUnread();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setClasses(await listClasses());
      void refreshUnread();
    } catch (e) {
      setError(errorMessage(e, 'Could not load your classes.'));
    } finally {
      setLoading(false);
    }
  }, [userId, refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const join = async () => {
    if (!code.trim()) {
      Alert.alert('Enter a code', 'Ask your instructor for the 6-character class code.');
      return;
    }
    setJoining(true);
    try {
      const classId = await joinClass(code);
      setCode('');
      await load();
      if (classId) router.push({ pathname: '/class/[id]', params: { id: classId } });
    } catch (e) {
      Alert.alert('Could not join class', errorMessage(e, 'Something went wrong.'));
    } finally {
      setJoining(false);
    }
  };

  const renderBody = () => {
    if (!configured) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title="Cloud features are not set up"
          message="Add your Supabase URL and publishable key to the .env file, then restart Expo with npx expo start -c."
        />
      );
    }
    if (authLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (!session) {
      return (
        <EmptyState
          icon="log-in-outline"
          title="Sign in to use classes"
          message="Instructors run classes and post announcements. Learners join with a code and take part in discussions. Your local courses and files work without an account."
          actionLabel="Sign in or create account"
          onAction={() => router.push('/auth')}
        />
      );
    }
    if (!profile) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Profile not found"
          message="You are signed in, but your profile could not be loaded. Check that the database scripts were run, then sign in again."
          actionLabel="Sign out"
          onAction={() => signOut().catch((e) => Alert.alert('Could not sign out', errorMessage(e, 'Try again.')))}
        />
      );
    }

    const isAdmin = profile.role === 'admin';
    const isApprovedInstructor = profile.role === 'instructor' && profile.instructorStatus === 'approved';
    const isPendingInstructor = profile.role === 'instructor' && !isApprovedInstructor;
    const wasRejected = profile.role === 'learner' && profile.instructorStatus === 'rejected';

    return (
      <FlatList
        data={classes}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <View style={styles.top}>
            {isAdmin ? (
              <ActionButton
                label="Open admin panel"
                icon="shield-checkmark-outline"
                onPress={() => router.push('/admin')}
              />
            ) : null}
            {isApprovedInstructor ? (
              <ActionButton label="New class" icon="add-circle-outline" onPress={() => router.push('/class-form')} />
            ) : null}
            {isPendingInstructor ? (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Waiting for approval</Text>
                <Text style={styles.noticeText}>
                  An administrator needs to approve your instructor account before you can create classes. Pull down to
                  refresh after you have been approved.
                </Text>
              </View>
            ) : null}
            {wasRejected ? (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Instructor request not approved</Text>
                <Text style={styles.noticeText}>Your account is now a learner account, so you can join classes.</Text>
              </View>
            ) : null}
            {profile.role === 'learner' ? (
              <>
                <TextField
                  label="Join a class"
                  value={code}
                  onChangeText={setCode}
                  placeholder="6-character class code"
                  autoCapitalize="characters"
                />
                <ActionButton label="Join class" icon="enter-outline" onPress={join} loading={joining} />
              </>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState
              icon="people-outline"
              title={
                isAdmin ? 'Nothing to show here' : isApprovedInstructor ? 'No classes yet' : 'You have not joined a class'
              }
              message={
                isAdmin
                  ? 'Administrators manage accounts from the admin panel.'
                  : isApprovedInstructor
                    ? 'Create a class and share its code with your learners.'
                    : profile.role === 'learner'
                      ? 'Enter the code your instructor gave you to join their class.'
                      : 'Your classes will appear here once you are approved.'
              }
            />
          )
        }
        renderItem={({ item }) => (
          <ClassCard
            room={item}
            isInstructor={item.instructorId === profile.id}
            unread={counts[item.id] ?? 0}
            onPress={() => router.push({ pathname: '/class/[id]', params: { id: item.id } })}
          />
        )}
      />
    );
  };

  const roleText = profile
    ? profile.role === 'admin'
      ? 'administrator'
      : profile.role === 'instructor'
        ? 'instructor'
        : 'learner'
    : null;

  return (
    <View style={styles.screen}>
      <Header
        title="Classes"
        subtitle={
          profile && roleText
            ? `Signed in as ${profile.displayName} (${roleText})`
            : 'Announcements and discussions with your instructor and classmates'
        }
      />
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  top: { gap: spacing.sm, marginBottom: spacing.md },
  error: { fontSize: 13, color: colors.danger },
  notice: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  noticeText: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
});
