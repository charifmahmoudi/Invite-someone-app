import type { Session } from '@supabase/supabase-js';
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
import { isMongoApiConfigured, setMongoApiTokenProvider } from '@/data/mongodb-api';
import { isSupabaseConfigured, supabase } from '@/data/supabase';
import { AppProvider, useApp } from '@/state/app-context';

export const isSupabaseAuthConfigured =
  isMongoApiConfigured && isSupabaseConfigured && supabase !== null;

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

function SupabaseApiTokenInstaller({ session }: { session: Session | null }) {
  useEffect(() => {
    setMongoApiTokenProvider(async () => session?.access_token ?? null);
    return () => {
      setMongoApiTokenProvider(undefined);
    };
  }, [session]);

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

    if (state.hydrated && hadInviteSession.current && supabase) {
      hadInviteSession.current = false;
      void supabase.auth.signOut();
    }
  }, [state.hydrated, state.session]);

  return null;
}

function SupabaseMongoBridge({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [inviteRevision, setInviteRevision] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(error ? null : data.session);
      setIdentityLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setIdentityLoaded(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshInviteSession = useCallback(() => {
    setInviteRevision((current) => current + 1);
  }, []);

  const managedAuth = useMemo<ManagedAuthValue>(
    () => ({
      enabled: true,
      identityLoaded,
      identitySignedIn: Boolean(session),
      refreshInviteSession,
    }),
    [identityLoaded, refreshInviteSession, session],
  );

  if (!identityLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  const sessionKey = session?.user.id ?? 'signed-out';

  return (
    <ManagedAuthContext.Provider value={managedAuth}>
      <SupabaseApiTokenInstaller session={session} />
      <AppProvider key={`${sessionKey}:${inviteRevision}`}>
        <InviteSessionLogoutMirror />
        {children}
      </AppProvider>
    </ManagedAuthContext.Provider>
  );
}

export function InviteAuthProvider({ children }: { children: React.ReactNode }) {
  if (!isSupabaseAuthConfigured) {
    return (
      <ManagedAuthContext.Provider value={unmanagedAuth}>
        <AppProvider>{children}</AppProvider>
      </ManagedAuthContext.Provider>
    );
  }

  return <SupabaseMongoBridge>{children}</SupabaseMongoBridge>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.canvas,
  },
});
