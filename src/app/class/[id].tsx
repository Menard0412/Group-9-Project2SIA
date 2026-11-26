import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { EmptyState } from '../../components/EmptyState';
import { MaterialsTab } from '../../components/MaterialsTab';
import { PeopleTab } from '../../components/PeopleTab';
import { QuizzesTab } from '../../components/QuizzesTab';
import { SegmentedControl } from '../../components/SegmentedControl';
import { TextField } from '../../components/TextField';
import { colors, shadows, radius, spacing } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { useUnread } from '../../hooks/useUnread';
import { supabase } from '../../lib/supabase';
import {
  createPost,
  deleteAnnouncement,
  deleteClass,
  deletePost,
  getClass,
  leaveClass,
  listAnnouncements,
  listMembers,
  listPosts,
  postAnnouncement,
} from '../../services/cloudService';
import { removeAllMaterialFiles } from '../../services/classworkService';
import type { Announcement, ClassRoom, Member, Post } from '../../types/cloud';
import { errorMessage } from '../../utils/format';
import { formatDateTime } from '../../utils/time';

type Tab = 'announcements' | 'materials' | 'quizzes' | 'discussion' | 'people';

const TABS: { value: Tab; label: string }[] = [
  { value: 'announcements', label: 'Updates' },
  { value: 'materials', label: 'Materials' },
  { value: 'quizzes', label: 'Quizzes' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'people', label: 'People' },
];

export default function ClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const profileId = profile?.id;
  const { markSeen } = useUnread();

  const [room, setRoom] = useState<ClassRoom | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<Tab>('announcements');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [postBody, setPostBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!id) return;
      if (isRefresh) setRefreshing(true);
      setRefreshToken((t) => t + 1);
      setError(null);
      try {
        const loaded = await getClass(id);
        if (!loaded) {
          setRoom(null);
          setError('This class was not found or you no longer have access.');
          return;
        }
        setRoom(loaded);
        const [a, p] = await Promise.all([listAnnouncements(id), listPosts(id)]);
        setAnnouncements(a);
        setPosts(p);
        setMembers(profileId === loaded.instructorId ? await listMembers(id) : []);
        void markSeen(id);
      } catch (e) {
        setError(errorMessage(e, 'Could not load this class.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, profileId, markSeen],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  // Live updates: reload when something new is added to this class.
  useEffect(() => {
    if (!id) return undefined;
    const channel = supabase.channel(`class-${id}`);
    for (const table of ['announcements', 'posts', 'class_materials', 'class_quizzes']) {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `class_id=eq.${id}` },
        () => {
          void load(false);
        },
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, load]);

  const run = async (action: () => Promise<void>, failureTitle: string) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert(failureTitle, errorMessage(e, 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  };

  if (!room || !profile) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={loading ? 'hourglass-outline' : 'alert-circle-outline'}
          title={loading ? 'Loading…' : 'Class not available'}
          message={loading ? 'Please wait a moment.' : (error ?? 'Sign in to view this class.')}
          actionLabel={loading ? undefined : 'Go back'}
          onAction={loading ? undefined : () => router.back()}
        />
      </View>
    );
  }

  const isInstructor = profile.id === room.instructorId;

  const sendAnnouncement = () => {
    if (!annTitle.trim() || !annBody.trim()) {
      Alert.alert('Incomplete announcement', 'Please add a title and a message.');
      return;
    }
    void run(async () => {
      await postAnnouncement(room.id, profile.id, annTitle, annBody);
      setAnnTitle('');
      setAnnBody('');
      await load(false);
    }, 'Could not post announcement');
  };

  const sendPost = () => {
    if (!postBody.trim()) return;
    void run(async () => {
      await createPost(room.id, profile.id, postBody);
      setPostBody('');
      await load(false);
    }, 'Could not send message');
  };

  const confirmDelete = (what: string, action: () => Promise<void>) =>
    Alert.alert(`Delete ${what}`, `Delete this ${what}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void run(async () => {
            await action();
            await load(false);
          }, `Could not delete ${what}`),
      },
    ]);

  const shareCode = () =>
    Share.share({ message: `Join my class "${room.title}" in LMS Mobile with code ${room.joinCode}` }).catch(() => undefined);

  const confirmLeave = () =>
    Alert.alert('Leave class', `Leave "${room.title}"? You can rejoin later with the code.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () =>
          void run(async () => {
            await leaveClass(room.id, profile.id);
            router.back();
          }, 'Could not leave class'),
      },
    ]);

  const confirmDeleteClass = () =>
    Alert.alert('Delete class', `Delete "${room.title}" with all its announcements and discussion?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void run(async () => {
            await removeAllMaterialFiles(room.id);
            await deleteClass(room.id);
            router.back();
          }, 'Could not delete class'),
      },
    ]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{room.title}</Text>
        <Text style={styles.muted}>Instructor: {room.instructorName}</Text>
        {room.description ? <Text style={styles.description}>{room.description}</Text> : null}
        {isInstructor ? (
          <View style={styles.codeRow}>
            <View>
              <Text style={styles.muted}>Class code</Text>
              <Text style={styles.code}>{room.joinCode}</Text>
            </View>
            <ActionButton label="Share" icon="share-outline" variant="secondary" onPress={shareCode} />
          </View>
        ) : null}
      </View>

      <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {tab === 'announcements' ? (
        <>
          {isInstructor ? (
            <View style={styles.card}>
              <TextField label="New announcement" value={annTitle} onChangeText={setAnnTitle} placeholder="Title" />
              <TextField value={annBody} onChangeText={setAnnBody} placeholder="Write your message" multiline />
              <ActionButton label="Post announcement" icon="megaphone-outline" onPress={sendAnnouncement} loading={busy} />
            </View>
          ) : null}
          {announcements.length === 0 ? (
            <EmptyState
              icon="megaphone-outline"
              title="No announcements"
              message={isInstructor ? 'Post an update for your learners.' : 'Your instructor has not posted anything yet.'}
            />
          ) : (
            announcements.map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{a.title}</Text>
                  {a.authorId === profile.id || isInstructor ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete announcement"
                      hitSlop={8}
                      onPress={() => confirmDelete('announcement', () => deleteAnnouncement(a.id))}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.body}>{a.body}</Text>
                <Text style={styles.muted}>
                  {a.authorName} · {formatDateTime(a.createdAt)}
                </Text>
              </View>
            ))
          )}
        </>
      ) : null}

      {tab === 'materials' ? (
        <MaterialsTab
          room={room}
          userId={profile.id}
          isInstructor={isInstructor}
          learnerCount={members.length}
          refreshToken={refreshToken}
        />
      ) : null}

      {tab === 'quizzes' ? <QuizzesTab room={room} isInstructor={isInstructor} refreshToken={refreshToken} /> : null}

      {tab === 'discussion' ? (
        <>
          <View style={styles.card}>
            <TextField value={postBody} onChangeText={setPostBody} placeholder="Ask a question or share something" multiline />
            <ActionButton label="Send" icon="send-outline" onPress={sendPost} loading={busy} disabled={!postBody.trim()} />
          </View>
          {posts.length === 0 ? (
            <EmptyState icon="chatbubbles-outline" title="No messages yet" message="Start the conversation." />
          ) : (
            posts.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {p.authorName}
                    {p.authorRole === 'instructor' ? '  ·  Instructor' : ''}
                  </Text>
                  {p.authorId === profile.id || isInstructor ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete message"
                      hitSlop={8}
                      onPress={() => confirmDelete('message', () => deletePost(p.id))}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.body}>{p.body}</Text>
                <Text style={styles.muted}>{formatDateTime(p.createdAt)}</Text>
              </View>
            ))
          )}
        </>
      ) : null}

      {tab === 'people' ? (
        <PeopleTab room={room} members={members} isInstructor={isInstructor} refreshToken={refreshToken} />
      ) : null}

      <View style={styles.footer}>
        {isInstructor ? (
          <ActionButton label="Delete class" icon="trash-outline" variant="danger" onPress={confirmDeleteClass} disabled={busy} />
        ) : (
          <ActionButton label="Leave class" icon="exit-outline" variant="danger" onPress={confirmLeave} disabled={busy} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  description: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  muted: { fontSize: 12, color: colors.textMuted },
  error: { fontSize: 13, color: colors.danger },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  code: { fontSize: 24, fontWeight: '700', color: colors.primary, letterSpacing: 2 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  entryTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 21 },
  spaced: { marginTop: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  memberName: { flex: 1, fontSize: 15, color: colors.text },
  footer: { marginTop: spacing.md },
});
