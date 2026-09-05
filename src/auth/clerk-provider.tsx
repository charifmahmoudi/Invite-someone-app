import { ClerkProvider, useAuth, useClerk } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';
import { setMongoApiTokenProvider } from '@/data/mongodb-api';
import { AppProvider, useApp } from '@/state/app-context';

export const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? '';
export const isClerkConfigured = clerkPublishableKey.length > 0;

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

function InviteSessionLogoutMirror() {
  const { state } = useApp();
  const { isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { signOut } = useClerk();
  const hadInviteSession = useRef(false);

  useEffect(() => {
    if (state.session) {
      hadInviteSession.current = true;
      return;
    }

    if (state.hydrated && hadInviteSession.current && isSignedIn) {
      hadInviteSession.current = false;
      void signOut();
    }
  }, [isSignedIn, signOut, state.hydrated, state.session]);

  return null;
}

function ClerkMongoBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn, sessionId } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const getTokenRef = useRef(getToken);
  const [installedSessionKey, setInstalledSessionKey] = useState<string>();
  const [inviteRevision, setInviteRevision] = useState(0);
  const sessionKey = sessionId ?? 'signed-out';

  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isLoaded) return;

    setMongoApiTokenProvider(() => getTokenRef.current());
    setInstalledSessionKey(sessionKey);

    return () => {
      setMongoApiTokenProvider(undefined);
    };
  }, [isLoaded, sessionKey]);

  const refreshInviteSession = useCallback(() => {
    setInviteRevision((current) => current + 1);
  }, []);

  const managedAuth = useMemo<ManagedAuthValue>(
    () => ({
      enabled: true,
      identityLoaded: isLoaded,
      identitySignedIn: Boolean(isSignedIn),
      refreshInviteSession,
    }),
    [isLoaded, isSignedIn, refreshInviteSession],
  );

  if (!isLoaded || installedSessionKey !== sessionKey) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

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
  if (!isClerkConfigured) {
    return (
      <ManagedAuthContext.Provider value={unmanagedAuth}>
        <AppProvider>{children}</AppProvider>
      </ManagedAuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkMongoBridge>{children}</ClerkMongoBridge>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.canvas,
  },
});
