import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { signOutGoogle } from '@/auth/google-sign-in';
import { Button } from '@/components/ui/button';
import { palette, spacing, typography } from '@/constants/theme';
import { firebaseAuth, isFirebaseConfigured } from '@/data/firebase';
import {
  isInviteApiError,
  isMongoApiConfigured,
  loadMongoMe,
  setMongoApiTokenProvider,
} from '@/data/mongodb-api';
import { AppProvider, useApp } from '@/state/app-context';

export const isFirebaseAuthConfigured =
  isMongoApiConfigured && isFirebaseConfigured && firebaseAuth !== null;

export type ManagedAuthStatus =
  | 'loading'
  | 'signed-out'
  | 'unverified'
  | 'profile-required'
  | 'ready'
  | 'account-link-required'
  | 'session-error'
  | 'backend-unavailable';

interface ManagedAuthValue {
  enabled: boolean;
  identityLoaded: boolean;
  identitySignedIn: boolean;
  status: ManagedAuthStatus;
  refreshInviteSession: () => void;
}

const unmanagedAuth: ManagedAuthValue = {
  enabled: false,
  identityLoaded: true,
  identitySignedIn: false,
  status: 'signed-out',
  refreshInviteSession: () => undefined,
};

const ManagedAuthContext = createContext<ManagedAuthValue>(unmanagedAuth);

export const useManagedAuth = () => useContext(ManagedAuthContext);

function InviteSessionLogoutMirror() {
  const { state } = useApp();
  const hadInviteSession = useState({ current: false })[0];

  useEffect(() => {
    if (state.session) {
      hadInviteSession.current = true;
      return;
    }

    if (state.hydrated && hadInviteSession.current && firebaseAuth) {
      hadInviteSession.current = false;
      void Promise.allSettled([signOut(firebaseAuth), signOutGoogle()]);
    }
  }, [hadInviteSession, state.hydrated, state.session]);

  return null;
}

function ManagedAuthBlockingState({
  status,
  onRetry,
  onSignOut,
}: {
  status: 'backend-unavailable' | 'session-error' | 'account-link-required';
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const copy =
    status === 'backend-unavailable'
      ? {
          title: 'Invite is having trouble connecting.',
          body: 'Your Firebase account is still signed in. We could not confirm your Invite profile with the server, so no account or profile changes were made.',
        }
      : status === 'session-error'
        ? {
            title: 'Your Invite session could not be verified.',
            body: 'Firebase is signed in, but the Invite API rejected the current session. Try again, or sign out and sign in again.',
          }
        : {
            title: 'This account needs to be linked.',
            body: 'An Invite profile already uses this email. For safety, Invite will not link accounts from an email match alone.',
          };

  return (
    <View style={styles.blocking}>
      <View style={styles.blockingCard}>
        <Text style={styles.blockingTitle}>{copy.title}</Text>
        <Text style={styles.blockingBody}>{copy.body}</Text>
        {status !== 'account-link-required' ? (
          <Button label="Try again" onPress={onRetry} />
        ) : null}
        <Button label="Sign out" onPress={onSignOut} variant="outline" />
      </View>
    </View>
  );
}

function FirebaseMongoBridge({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [status, setStatus] = useState<ManagedAuthStatus>('loading');
  const [inviteRevision, setInviteRevision] = useState(0);

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) return;
    return onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIdentityLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!identityLoaded) return;

    if (!user) {
      setMongoApiTokenProvider(undefined);
      setStatus('signed-out');
      return;
    }

    setMongoApiTokenProvider(async () => user.getIdToken());

    if (!user.emailVerified) {
      setStatus('unverified');
      return;
    }

    let active = true;
    setStatus('loading');
    void loadMongoMe()
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (isInviteApiError(error)) {
          if (error.status === 403 && error.code === 'INVITE_PROFILE_REQUIRED') {
            setStatus('profile-required');
            return;
          }
          if (error.status === 409 && error.code === 'ACCOUNT_LINK_REQUIRED') {
            setStatus('account-link-required');
            return;
          }
          if (error.status === 401) {
            setStatus('session-error');
            return;
          }
        }
        setStatus('backend-unavailable');
      });

    return () => {
      active = false;
    };
  }, [identityLoaded, inviteRevision, user]);

  useEffect(
    () => () => {
      setMongoApiTokenProvider(undefined);
    },
    [],
  );

  const refreshInviteSession = useCallback(() => {
    setStatus('loading');
    setInviteRevision((current) => current + 1);
  }, []);

  const signOutManagedIdentity = useCallback(() => {
    const auth = firebaseAuth;
    if (!auth) return;
    void Promise.allSettled([signOut(auth), signOutGoogle()]);
  }, []);

  const managedAuth = useMemo<ManagedAuthValue>(
    () => ({
      enabled: true,
      identityLoaded,
      identitySignedIn: Boolean(user),
      status,
      refreshInviteSession,
    }),
    [identityLoaded, refreshInviteSession, status, user],
  );

  if (!identityLoaded || status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (
    status === 'backend-unavailable' ||
    status === 'session-error' ||
    status === 'account-link-required'
  ) {
    return (
      <ManagedAuthContext.Provider value={managedAuth}>
        <ManagedAuthBlockingState
          onRetry={refreshInviteSession}
          onSignOut={signOutManagedIdentity}
          status={status}
        />
      </ManagedAuthContext.Provider>
    );
  }

  const sessionKey = user?.uid ?? 'signed-out';
  return (
    <ManagedAuthContext.Provider value={managedAuth}>
      <AppProvider key={`${sessionKey}:${inviteRevision}`}>
        <InviteSessionLogoutMirror />
        {children}
      </AppProvider>
    </ManagedAuthContext.Provider>
  );
}

export function InviteAuthProvider({ children }: { children: React.ReactNode }) {
  if (!isFirebaseAuthConfigured) {
    return (
      <ManagedAuthContext.Provider value={unmanagedAuth}>
        <AppProvider>{children}</AppProvider>
      </ManagedAuthContext.Provider>
    );
  }

  return <FirebaseMongoBridge>{children}</FirebaseMongoBridge>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.canvas,
  },
  blocking: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: palette.canvas,
    padding: spacing.xxl,
  },
  blockingCard: {
    gap: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: spacing.xxl,
  },
  blockingTitle: { ...typography.h2, color: palette.ink },
  blockingBody: { ...typography.body, color: palette.inkMuted },
});
