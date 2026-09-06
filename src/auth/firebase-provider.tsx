import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';
import { firebaseAuth, isFirebaseConfigured } from '@/data/firebase';
import { isMongoApiConfigured, setMongoApiTokenProvider } from '@/data/mongodb-api';
import { AppProvider, useApp } from '@/state/app-context';

export const isFirebaseAuthConfigured =
  isMongoApiConfigured && isFirebaseConfigured && firebaseAuth !== null;

interface ManagedAuthValue {
  enabled: boolean;
  identityLoaded: boolean;
  identitySignedIn: boolean;
  refreshInviteSession: () => void;
}

const unmanagedAuth: ManagedAuthValue = {
  enabled: false,
  identityLoaded: true,
  identitySignedIn: false,
  refreshInviteSession: () => undefined,
};

const ManagedAuthContext = createContext<ManagedAuthValue>(unmanagedAuth);

export const useManagedAuth = () => useContext(ManagedAuthContext);

function FirebaseApiTokenInstaller({ user }: { user: User | null }) {
  useEffect(() => {
    setMongoApiTokenProvider(async () => (user ? user.getIdToken() : null));
    return () => setMongoApiTokenProvider(undefined);
  }, [user]);
  return null;
}

function InviteSessionLogoutMirror() {
  const { state } = useApp();
  const hadInviteSession = useRef(false);

  useEffect(() => {
    if (state.session) {
      hadInviteSession.current = true;
      return;
    }

    if (state.hydrated && hadInviteSession.current && firebaseAuth) {
      hadInviteSession.current = false;
      void signOut(firebaseAuth);
    }
  }, [state.hydrated, state.session]);

  return null;
}

function FirebaseMongoBridge({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [inviteRevision, setInviteRevision] = useState(0);

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) return;
    return onIdTokenChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIdentityLoaded(true);
    });
  }, []);

  const refreshInviteSession = useCallback(() => {
    setInviteRevision((current) => current + 1);
  }, []);

  const managedAuth = useMemo<ManagedAuthValue>(
    () => ({
      enabled: true,
      identityLoaded,
      identitySignedIn: Boolean(user),
      refreshInviteSession,
    }),
    [identityLoaded, refreshInviteSession, user],
  );

  if (!identityLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  const sessionKey = user?.uid ?? 'signed-out';
  return (
    <ManagedAuthContext.Provider value={managedAuth}>
      <FirebaseApiTokenInstaller user={user} />
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
});
