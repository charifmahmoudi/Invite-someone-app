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

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
const SESSION_KEY = '@invite/mongodb-session/v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const isMongoApiConfigured = Boolean(configuredApiUrl);

interface StoredApiSession {
  token: string;
  userId: string;
}

interface ApiErrorBody {
  message?: string;
}

export interface ApiPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface PeoplePageOptions {
  cursor?: string;
  limit?: number;
  query?: string;
  interests?: string[];
  availability?: string;
  connectionGoal?: string;
  verifiedOnly?: boolean;
}

export type ApiTokenProvider = () => Promise<string | null>;

export interface IdentityProvisionInput {
  name: string;
  city: string;
  interests: SignUpInput['interests'];
  availability: SignUpInput['availability'];
  connectionGoals: SignUpInput['connectionGoals'];
}

export interface IdentityProvisionResult {
  created: boolean;
  userId: string;
  profile: Profile;
}

let externalTokenProvider: ApiTokenProvider | undefined;

/**
 * Installs the token source used by a managed identity SDK such as Clerk.
 * Passing undefined restores the internal Invite-session compatibility path.
 */
export const setMongoApiTokenProvider = (provider?: ApiTokenProvider) => {
  externalTokenProvider = provider;
};

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

const readBearerToken = async () => {
  if (externalTokenProvider) return externalTokenProvider();
  return (await readSession())?.token ?? null;
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> => {
  if (!configuredApiUrl) throw new Error('The Invite API is not configured.');
  const token = authenticated ? await readBearerToken() : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${configuredApiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      throw new Error('The server took too long to respond. Check your connection and try again.');
    }
    throw new Error('Could not reach the Invite server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
};

const queryString = (values: Record<string, string | number | boolean | undefined>) => {
  const search = Object.entries(values)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return search ? `?${search}` : '';
};

export const getMongoSession = async (): Promise<{ userId: string } | null> => {
  const token = await readBearerToken();
  if (!token) return null;
  try {
    return await request<{ userId: string }>('/v1/session');
  } catch (error) {
    if (!externalTokenProvider && error instanceof ApiError && error.status === 401) {
      await removeSession();
      return null;
    }
    throw error;
  }
};

const storeAuthenticatedSession = async (session: StoredApiSession) => {
  const serialized = JSON.stringify(session);
  if (Platform.OS === 'web') await AsyncStorage.setItem(SESSION_KEY, serialized);
  else await SecureStore.setItemAsync(SESSION_KEY, serialized, secureStoreOptions);
  return session;
};

export const signInMongo = async (input: SignInInput) => {
  const session = await request<StoredApiSession>(
    '/v1/auth/login',
    { method: 'POST', body: JSON.stringify(input) },
    false,
  );
  return storeAuthenticatedSession(session);
};

export const signUpMongo = async (input: SignUpInput) => {
  const session = await request<StoredApiSession>(
    '/v1/auth/register',
    { method: 'POST', body: JSON.stringify(input) },
    false,
  );
  return storeAuthenticatedSession(session);
};

export const signOutMongo = removeSession;

export const provisionMongoIdentity = (input: IdentityProvisionInput) =>
  request<IdentityProvisionResult>('/v1/auth/provision', {
    method: 'POST',
    body: JSON.stringify(input),
  });

// Compatibility bootstrap used by the current AppProvider. New screens should
// migrate toward the resource-oriented page helpers below.
export const loadMongoData = () => request<AppData>('/v1/data');

export const loadMongoMe = () => request<Profile>('/v1/me');

export const loadMongoActivitiesPage = (cursor?: string, limit = 20) =>
  request<ApiPage<Activity>>(`/v1/activities${queryString({ cursor, limit })}`);

export const loadMongoPeoplePage = (options: PeoplePageOptions = {}) =>
  request<ApiPage<Profile>>(
    `/v1/people${queryString({
      cursor: options.cursor,
      limit: options.limit ?? 20,
      query: options.query,
      interests: options.interests?.join(','),
      availability: options.availability,
      connectionGoal: options.connectionGoal,
      verifiedOnly: options.verifiedOnly,
    })}`,
  );

export const loadMongoInvitationsPage = (
  direction?: 'sent' | 'received',
  cursor?: string,
  limit = 20,
) =>
  request<ApiPage<Invitation>>(
    `/v1/invitations${queryString({ direction, cursor, limit })}`,
  );

export const loadMongoSavedPage = (cursor?: string, limit = 20) =>
  request<ApiPage<string>>(`/v1/saved${queryString({ cursor, limit })}`);

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
