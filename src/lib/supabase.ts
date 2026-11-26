import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False until a .env file with the project URL and publishable key exists. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Expo Router can render pages in Node (static web rendering). There is no `window`
// there, so AsyncStorage cannot be used and no session should be restored or saved.
const isServer = typeof (globalThis as { window?: unknown }).window === 'undefined';

const deviceStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

const serverStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => undefined,
  removeItem: async (_key: string): Promise<void> => undefined,
};

export const supabase = createClient(
  supabaseUrl ?? 'https://not-configured.invalid',
  supabaseKey ?? 'not-configured',
  {
    auth: {
      storage: isServer ? serverStorage : deviceStorage,
      autoRefreshToken: !isServer,
      persistSession: !isServer,
      detectSessionInUrl: false,
    },
  },
);
