import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { EmptyState } from '../components/EmptyState';
import { TextField } from '../components/TextField';
import { colors, shadows, radius, spacing } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types/cloud';
import { errorMessage } from '../utils/format';

type Mode = 'signIn' | 'signUp';
type Notice = { kind: 'error' | 'info'; text: string };

const ROLES: { value: UserRole; label: string; hint: string; icon: 'school' | 'person' }[] = [
  { value: 'learner', label: 'Learner', hint: 'Join classes with a code', icon: 'person' },
  { value: 'instructor', label: 'Instructor', hint: 'Run classes (needs approval)', icon: 'school' },
];

/** Go back if there is somewhere to go back to, otherwise land on the home screen. */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function AuthScreen() {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('learner');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (!configured) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Cloud features are not set up"
          message="Add your Supabase URL and publishable key to the .env file, then restart Expo with npx expo start -c."
          actionLabel="Go back"
          onAction={leave}
        />
      </View>
    );
  }

  const switchMode = () => {
    setNotice(null);
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
  };

  const submit = async () => {
    setNotice(null);
    if (!email.trim() || !password) {
      setNotice({ kind: 'error', text: 'Please enter your email and password.' });
      return;
    }
    if (mode === 'signUp') {
      if (!displayName.trim()) {
        setNotice({ kind: 'error', text: 'Please enter your name.' });
        return;
      }
      if (password.length < 6) {
        setNotice({ kind: 'error', text: 'Use a password with at least 6 characters.' });
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
        leave();
      } else {
        const { needsConfirmation } = await signUp({ email, password, displayName, role });
        if (needsConfirmation) {
          setMode('signIn');
          setNotice({
            kind: 'info',
            text: 'Account created. We sent a confirmation link to your email. Open it, then sign in here.',
          });
        } else {
          leave();
        }
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        text: errorMessage(error, mode === 'signIn' ? 'Could not sign in.' : 'Could not create the account.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{mode === 'signIn' ? 'Welcome back' : 'Create your account'}</Text>
      <Text style={styles.subtitle}>
        {mode === 'signIn'
          ? 'Sign in to join classes, read announcements and take part in discussions.'
          : 'Choose how you will use LMS Mobile.'}
      </Text>

      {mode === 'signUp' ? (
        <>
          <View style={styles.roleRow}>
            {ROLES.map((option) => {
              const active = option.value === role;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setRole(option.value)}
                  style={[styles.roleCard, active && styles.roleCardActive]}
                >
                  <Ionicons name={option.icon} size={24} color={active ? colors.primary : colors.textMuted} />
                  <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>{option.label}</Text>
                  <Text style={styles.roleHint}>{option.hint}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextField
            label="Your name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Maria Santos"
            autoCapitalize="words"
          />
        </>
      ) : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        secureTextEntry
        autoCapitalize="none"
      />

      {notice ? (
        <View style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeInfo]}>
          <Text style={notice.kind === 'error' ? styles.noticeErrorText : styles.noticeInfoText}>{notice.text}</Text>
        </View>
      ) : null}

      <ActionButton label={mode === 'signIn' ? 'Sign in' : 'Create account'} onPress={submit} loading={busy} />
      <ActionButton
        label={mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        variant="secondary"
        disabled={busy}
        onPress={switchMode}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  roleLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  roleLabelActive: { color: colors.primary },
  roleHint: { fontSize: 12, color: colors.textMuted },
  notice: { borderRadius: radius.md, padding: spacing.md },
  noticeError: { backgroundColor: colors.dangerSoft },
  noticeInfo: { backgroundColor: colors.primarySoft },
  noticeErrorText: { fontSize: 14, color: colors.danger, lineHeight: 20 },
  noticeInfoText: { fontSize: 14, color: colors.primaryDark, lineHeight: 20 },
});
