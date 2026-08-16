import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData, Session } from '@/types/domain';

const STORAGE_KEY = '@invite/app-state/v1';

export interface PersistedState {
  version: 1;
  data: AppData;
  session: Session | null;
}

export const loadPersistedState = async (): Promise<PersistedState | null> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as PersistedState;
    return parsed.version === 1 ? parsed : null;
  } catch {
    // A corrupt cache should never prevent the app from opening.
    return null;
  }
};

export const savePersistedState = async (state: PersistedState) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearPersistedState = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};
