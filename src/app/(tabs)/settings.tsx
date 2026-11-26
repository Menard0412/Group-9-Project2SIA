import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { Header } from '../../components/Header';
import { colors, shadows, radius, spacing } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useFiles } from '../../hooks/useFiles';
import { useLms } from '../../hooks/useLms';
import { deleteMyAccount } from '../../services/cloudService';
import { errorMessage, formatBytes } from '../../utils/format';

function roleLabel(role: 'admin' | 'instructor' | 'learner', status: string): string {
  if (role === 'admin') return 'Administrator';
  if (role === 'instructor') return status === 'approved' ? 'Instructor' : 'Instructor (awaiting approval)';
  return 'Learner';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { files, byCategory, totalSize } = useFiles();
  const { data } = useLms();
  const { configured, session, profile, signOut } = useAuth();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const [accountError, setAccountError] = useState<string | null>(null);

  // Signs out straight away: it only ends the cloud session, local files and courses stay on the device.
  const handleSignOut = () => {
    setAccountError(null);
    signOut().catch((e) => setAccountError(errorMessage(e, 'Could not sign out. Please try again.')));
  };

  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!session) return;
    setDeleting(true);
    setAccountError(null);
    try {
      await deleteMyAccount(session.user.id);
    } catch (e) {
      setAccountError(errorMessage(e, 'Could not delete the account. Please try again.'));
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () =>
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and your cloud data: your posts, quiz results and, for instructors, the classes you run and their files. Files and courses stored on this device are not affected. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => void deleteAccount() },
      ],
    );

  return (
    <View style={styles.screen}>
      <Header title="Settings" subtitle="Account, app information and storage" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {!configured ? (
            <Text style={styles.about}>
              Cloud features (classes, announcements, discussion) are not set up. Add your Supabase keys to the .env
              file to enable them.
            </Text>
          ) : session ? (
            <>
              <Row label="Name" value={profile?.displayName ?? '—'} />
              <Row label="Role" value={profile ? roleLabel(profile.role, profile.instructorStatus) : '—'} />
              <Row label="Email" value={session.user.email ?? '—'} />
            </>
          ) : (
            <Text style={styles.about}>You are not signed in. Sign in to use classes.</Text>
          )}
        </View>
        {configured ? (
          session ? (
            <>
              <ActionButton label="Sign out" icon="log-out-outline" variant="secondary" onPress={handleSignOut} />
              <ActionButton
                label="Delete account"
                icon="trash-outline"
                variant="danger"
                loading={deleting}
                onPress={confirmDeleteAccount}
              />
            </>
          ) : (
            <ActionButton label="Sign in or create account" icon="log-in-outline" onPress={() => router.push('/auth')} />
          )
        ) : null}

        {accountError ? <Text style={styles.error}>{accountError}</Text> : null}

        {profile?.role === 'admin' ? (
          <ActionButton
            label="Admin panel"
            icon="shield-checkmark-outline"
            variant="secondary"
            onPress={() => router.push('/admin')}
          />
        ) : null}

        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.card}>
          <Row label="Name" value="LMS Mobile" />
          <Row label="Version" value={version} />
        </View>

        <Text style={styles.sectionTitle}>Storage on this device</Text>
        <View style={styles.card}>
          <Row label="Total files" value={String(files.length)} />
          <Row label="Presentations" value={String(byCategory('presentation').length)} />
          <Row label="Exercises" value={String(byCategory('exercise').length)} />
          <Row label="Space used" value={formatBytes(totalSize)} />
          <Row label="Courses" value={String(data.courses.length)} />
          <Row label="Quizzes" value={String(data.quizzes.length)} />
          <Row label="Quiz attempts" value={String(data.attempts.length)} />
        </View>
        <Text style={styles.note}>
          Files, courses, quizzes and progress are stored privately on this device and are not uploaded. Classes,
          announcements and discussions live in the cloud and need an account.
        </Text>

        <Text style={styles.sectionTitle}>About LMS Mobile</Text>
        <View style={styles.card}>
          <Text style={styles.about}>
            LMS Mobile lets you organise presentations and exercises into courses, track your progress, test yourself
            with quizzes, and join classes run by instructors.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
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
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 15, color: colors.textMuted },
  rowValue: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'right' },
  error: { fontSize: 13, color: colors.danger },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  about: { fontSize: 14, color: colors.text, lineHeight: 21, paddingVertical: spacing.md },
});
