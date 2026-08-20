import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type {
  Activity,
  AppData,
  Invitation,
  InvitationStatus,
  Profile,
  SignInInput,
  SignUpInput,
} from '@/types/domain';

const DEFAULT_API_URL = 'https://invite-someone-api.onrender.com';
const environmentApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
const localDemoRequested = process.env.EXPO_PUBLIC_ENABLE_LOCAL_DEMO === 'true';
// Release builds fail closed to the deployed API. Local demo mode now requires an explicit opt-in.
const configuredApiUrl = environmentApiUrl || (localDemoRequested ? undefined : DEFAULT_API_URL);
const SESSION_KEY = '@invite/mongodb-session/v1';
const REQUEST_TIMEOUT_MS = 45_000;
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const isMongoApiConfigured = Boolean(configuredApiUrl);
export const isLocalDemoEnabled = localDemoRequested && !environmentApiUrl;

interface StoredApiSession {
  token: string;
  userId: string;
}

interface AuthenticationResponse extends StoredApiSession {
  /** Newer APIs return bootstrap data atomically with authentication. */
  data?: AppData;
}

interface ApiErrorBody {
  message?: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const removeSession = () =>
  Platform.OS === 'web'
    ? AsyncStorage.removeItem(SESSION_KEY)
    : SecureStore.deleteItemAsync(SESSION_KEY, secureStoreOptions);

const readSession = async (): Promise<StoredApiSession | null> => {
  const raw =
    Platform.OS === 'web'
      ? await AsyncStorage.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY, secureStoreOptions);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredApiSession;
  } catch {
    await removeSession();
    return null;
  }
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> => {
  if (!configuredApiUrl) throw new Error('The Invite API is not configured.');
  const session = authenticated ? await readSession() : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${configuredApiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...options.headers,
      },
    });

    const body =
      response.status === 204 ? undefined : ((await response.json()) as T | ApiErrorBody);
    if (!response.ok) {
      const message =
        (body as ApiErrorBody | undefined)?.message ?? 'The server rejected the request.';
      throw new ApiError(message, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'The Invite service took too long to respond. It may be waking up; wait a moment and try again.',
      );
    }
    throw new Error('Could not reach the Invite server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
};

export const getMongoSession = async (): Promise<{ userId: string } | null> => {
  const stored = await readSession();
  if (!stored) return null;
  try {
    return await request<{ userId: string }>('/v1/session');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await removeSession();
      return null;
    }
    throw error;
  }
};

const storeAuthenticatedSession = async <T extends StoredApiSession>(session: T): Promise<T> => {
  // Bootstrap data can be large and is intentionally never copied into secure token storage.
  const serialized = JSON.stringify({ token: session.token, userId: session.userId });
  if (Platform.OS === 'web') await AsyncStorage.setItem(SESSION_KEY, serialized);
  else await SecureStore.setItemAsync(SESSION_KEY, serialized, secureStoreOptions);
  return session;
};

export const signInMongo = async (input: SignInInput) => {
  const session = await request<AuthenticationResponse>(
    '/v1/auth/login',
    { method: 'POST', body: JSON.stringify(input) },
    false,
  );
  return storeAuthenticatedSession(session);
};

export const signUpMongo = async (input: SignUpInput) => {
  const session = await request<AuthenticationResponse>(
    '/v1/auth/register',
    { method: 'POST', body: JSON.stringify(input) },
    false,
  );
  return storeAuthenticatedSession(session);
};

export const signOutMongo = removeSession;

/** Starts a sleeping free-tier service before the user submits a form. */
export const warmMongoApi = async () => {
  try {
    await request<{ status: 'ok' }>('/health', {}, false, 60_000);
    return true;
  } catch {
    return false;
  }
};

export const loadMongoData = () => request<AppData>('/v1/data');

export const updateMongoProfile = (profile: Profile) =>
  request<Profile>('/v1/profile', {
    method: 'PUT',
    body: JSON.stringify({ ...profile, avatarUrl: profile.avatarUrl ?? null }),
  });

export const createMongoActivity = (activity: Activity) =>
  request<Activity>('/v1/activities', { method: 'POST', body: JSON.stringify(activity) });

export const createMongoInvitations = (invitations: Invitation[]) =>
  request<Invitation[]>('/v1/invitations', {
    method: 'POST',
    body: JSON.stringify({ invitations }),
  });

export const respondMongoInvitation = (
  invitationId: string,
  status: Exclude<InvitationStatus, 'pending'>,
) =>
  request<void>(`/v1/invitations/${encodeURIComponent(invitationId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const joinMongoActivity = (activityId: string) =>
  request<void>(`/v1/activities/${encodeURIComponent(activityId)}/attendees/me`, {
    method: 'PUT',
  });

export const setMongoActivitySaved = (activityId: string, saved: boolean) =>
  request<void>(`/v1/saved-activities/${encodeURIComponent(activityId)}`, {
    method: saved ? 'PUT' : 'DELETE',
  });
