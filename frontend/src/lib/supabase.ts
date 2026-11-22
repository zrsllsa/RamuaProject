import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const canUseStorage = Platform.OS !== 'web' || typeof window !== 'undefined';

const storage = {
  getItem: (key: string) => {
    if (!canUseStorage) return Promise.resolve(null);
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (!canUseStorage) return Promise.resolve();
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!canUseStorage) return Promise.resolve();
    return AsyncStorage.removeItem(key);
  },
};

const supabaseUrl = 'https://hkmftnsbghtkhsddlqvw.supabase.co';
const supabaseAnonKey = 'sb_publishable_DnXMUOc0j_BFUgg-wcGWFg__0cp74ym';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage,
      autoRefreshToken: canUseStorage,
      persistSession: canUseStorage,
      detectSessionInUrl: false,
    },
  }
);