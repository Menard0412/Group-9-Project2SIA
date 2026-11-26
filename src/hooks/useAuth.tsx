import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { fetchProfile } from '../services/cloudService';
import type { Profile, UserRole } from '../types/cloud';

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

interface AuthContextValue {
  /** False when the .env file with the Supabase keys is missing. */
  configured: boolean;
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves with needsConfirmation=true when the project requires email confirmation. */
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionChecked, setSessionChecked] = useState(!isSupabaseConfigured);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch((error) => console.warn('Could not restore session', error))
      .finally(() => {
        if (active) setSessionChecked(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    // Keep the token fresh only while the app is in the foreground.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      appState.remove();
    };
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return undefined;
    }
    let active = true;
    setProfileLoading(true);
    fetchProfile(userId)
      .then((loaded) => {
        if (active) setProfile(loaded);
      })
      .catch((error) => console.warn('Could not load profile', error))
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async ({ email, password, displayName, role }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim(), role } },
    });
    if (error) throw new Error(error.message);
    return { needsConfirmation: data.session === null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading: !sessionChecked || profileLoading,
      session,
      profile,
      signIn,
      signUp,
      signOut,
    }),
    [sessionChecked, profileLoading, session, profile, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
