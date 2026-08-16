import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

import { appReducer, createInitialState } from '@/domain/app-reducer';
import { createSeedData, DEMO_USER_ID } from '@/data/seed';
import { clearPersistedState, loadPersistedState, savePersistedState } from '@/data/storage';
import {
  createRemoteActivity,
  createRemoteInvitations,
  getRemoteSession,
  isSupabaseConfigured,
  joinRemoteActivity,
  loadRemoteData,
  respondRemoteInvitation,
  setRemoteActivitySaved,
  signInRemote,
  signOutRemote,
  signUpRemote,
  updateRemoteProfile,
} from '@/data/supabase';
import type {
  Activity,
  ActivityDraft,
  AppState,
  Invitation,
  InvitationDraft,
  InvitationStatus,
  Profile,
  ProfileUpdateInput,
  SignInInput,
  SignUpInput,
} from '@/types/domain';
import { createId, handleFromName, initialsFromName } from '@/utils/format';

interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

interface AppContextValue {
  state: AppState;
  isProductionBackend: boolean;
  startDemo: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  createActivity: (draft: ActivityDraft) => Promise<Activity>;
  sendInvitations: (draft: InvitationDraft) => Promise<Invitation[]>;
  respondToInvitation: (
    invitationId: string,
    status: Exclude<InvitationStatus, 'pending'>,
  ) => Promise<void>;
  joinActivity: (activityId: string) => Promise<void>;
  toggleSavedActivity: (activityId: string) => Promise<void>;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const friendlyError = (error: unknown) =>
  error instanceof Error ? error : new Error('Something went wrong. Please try again.');

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, createSeedData(), createInitialState);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        if (isSupabaseConfigured) {
          const remoteSession = await getRemoteSession();
          if (remoteSession) {
            const data = await loadRemoteData(remoteSession.user.id);
            if (active) {
              dispatch({
                type: 'hydrate',
                data,
                session: { userId: remoteSession.user.id, mode: 'supabase' },
              });
            }
            return;
          }
        } else {
          const persisted = await loadPersistedState();
          if (persisted && active) {
            dispatch({ type: 'hydrate', data: persisted.data, session: persisted.session });
            return;
          }
        }
      } catch {
        // The welcome screen remains available even if remote hydration fails.
      }

      if (active) dispatch({ type: 'hydrate', data: createSeedData(), session: null });
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated || isSupabaseConfigured || state.session?.mode === 'supabase') return;
    void savePersistedState({
      version: 1,
      data: {
        profiles: state.profiles,
        activities: state.activities,
        invitations: state.invitations,
        savedActivityIds: state.savedActivityIds,
      },
      session: state.session,
    });
  }, [state]);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    dispatch({ type: 'set-busy', busy: true });
    dispatch({ type: 'set-error', error: null });
    try {
      return await operation();
    } catch (error) {
      const normalized = friendlyError(error);
      dispatch({ type: 'set-error', error: normalized.message });
      throw normalized;
    } finally {
      dispatch({ type: 'set-busy', busy: false });
    }
  }, []);

  const startDemo = useCallback(
    () =>
      run(async () => {
        const data = createSeedData();
        dispatch({ type: 'start-session', session: { userId: DEMO_USER_ID, mode: 'demo' }, data });
      }),
    [run],
  );

  const signIn = useCallback(
    (input: SignInInput) =>
      run(async () => {
        if (isSupabaseConfigured) {
          const remote = await signInRemote(input.email.trim(), input.password);
          const data = await loadRemoteData(remote.user.id);
          dispatch({
            type: 'start-session',
            session: { userId: remote.user.id, mode: 'supabase' },
            data,
          });
          return;
        }

        const profile = state.profiles.find(
          (candidate) => candidate.email?.toLowerCase() === input.email.trim().toLowerCase(),
        );
        if (!profile) {
          throw new Error(
            'No local account matches that email. Try demo@invite.app or create an account.',
          );
        }
        dispatch({ type: 'start-session', session: { userId: profile.id, mode: 'local' } });
      }),
    [run, state.profiles],
  );

  const signUp = useCallback(
    (input: SignUpInput) =>
      run(async (): Promise<SignUpResult> => {
        if (isSupabaseConfigured) {
          const remote = await signUpRemote(input.email.trim(), input.password, {
            name: input.name,
            city: input.city,
            interests: input.interests,
            availability: input.availability,
            connectionGoals: input.connectionGoals,
          });

          if (!remote.session || !remote.user) return { requiresEmailConfirmation: true };
          const data = await loadRemoteData(remote.user.id);
          dispatch({
            type: 'start-session',
            session: { userId: remote.user.id, mode: 'supabase' },
            data,
          });
          return { requiresEmailConfirmation: false };
        }

        if (
          state.profiles.some(
            (profile) => profile.email?.toLowerCase() === input.email.trim().toLowerCase(),
          )
        ) {
          throw new Error('An account with this email already exists.');
        }

        const profile: Profile = {
          id: createId('profile'),
          name: input.name.trim(),
          handle: handleFromName(input.name),
          email: input.email.trim().toLowerCase(),
          headline: 'Ready for a few good plans',
          bio: 'I joined Invite to meet kind people through small, comfortable activities.',
          city: input.city.trim(),
          initials: initialsFromName(input.name),
          avatarColor: '#315C4C',
          interests: input.interests,
          availability: input.availability,
          connectionGoals: input.connectionGoals,
          joinedAt: new Date().toISOString(),
          completedActivities: 0,
          reliabilityScore: 100,
        };
        dispatch({
          type: 'add-profile',
          profile,
          session: { userId: profile.id, mode: 'local' },
        });
        return { requiresEmailConfirmation: false };
      }),
    [run, state.profiles],
  );

  const signOut = useCallback(
    () =>
      run(async () => {
        if (state.session?.mode === 'supabase') await signOutRemote();
        dispatch({ type: 'end-session' });
      }),
    [run, state.session?.mode],
  );

  const updateProfile = useCallback(
    (input: ProfileUpdateInput) =>
      run(async () => {
        const current = state.profiles.find((profile) => profile.id === state.session?.userId);
        if (!current) throw new Error('Your profile could not be found.');
        const profile: Profile = {
          ...current,
          ...input,
          name: input.name.trim(),
          city: input.city.trim(),
          headline: input.headline.trim(),
          bio: input.bio.trim(),
          initials: initialsFromName(input.name),
        };
        if (state.session?.mode === 'supabase') await updateRemoteProfile(profile);
        dispatch({ type: 'update-profile', profile });
      }),
    [run, state.profiles, state.session],
  );

  const createActivity = useCallback(
    (draft: ActivityDraft) =>
      run(async () => {
        const userId = state.session?.userId;
        if (!userId) throw new Error('Sign in to create an activity.');
        const activity: Activity = {
          ...draft,
          id: createId('activity'),
          hostId: userId,
          attendeeIds: [userId],
          invitedIds: [],
          createdAt: new Date().toISOString(),
        };
        if (state.session?.mode === 'supabase') await createRemoteActivity(activity);
        dispatch({ type: 'create-activity', activity });
        return activity;
      }),
    [run, state.session],
  );

  const sendInvitations = useCallback(
    (draft: InvitationDraft) =>
      run(async () => {
        const userId = state.session?.userId;
        const activity = state.activities.find((candidate) => candidate.id === draft.activityId);
        if (!userId || !activity) throw new Error('The activity could not be found.');
        if (activity.hostId !== userId) throw new Error('Only the host can send invitations.');

        const existingReceivers = new Set(
          state.invitations
            .filter(
              (invitation) =>
                invitation.activityId === draft.activityId && invitation.status !== 'cancelled',
            )
            .map((invitation) => invitation.receiverId),
        );
        const createdAt = new Date().toISOString();
        const invitations: Invitation[] = [...new Set(draft.receiverIds)]
          .filter((receiverId) => receiverId !== userId && !existingReceivers.has(receiverId))
          .map((receiverId) => ({
            id: createId('invite'),
            activityId: draft.activityId,
            senderId: userId,
            receiverId,
            status: 'pending',
            message: draft.message.trim(),
            createdAt,
          }));

        if (invitations.length === 0) return [];
        if (state.session?.mode === 'supabase') await createRemoteInvitations(invitations);
        dispatch({ type: 'send-invitations', invitations });
        return invitations;
      }),
    [run, state.activities, state.invitations, state.session],
  );

  const respondToInvitation = useCallback(
    (invitationId: string, status: Exclude<InvitationStatus, 'pending'>) =>
      run(async () => {
        const invitation = state.invitations.find((candidate) => candidate.id === invitationId);
        if (!invitation) throw new Error('The invitation could not be found.');
        const respondedAt = new Date().toISOString();
        if (state.session?.mode === 'supabase') {
          await respondRemoteInvitation(invitation, status, respondedAt);
        }
        dispatch({ type: 'respond-invitation', invitationId, status, respondedAt });
      }),
    [run, state.invitations, state.session?.mode],
  );

  const joinActivity = useCallback(
    (activityId: string) =>
      run(async () => {
        const userId = state.session?.userId;
        const activity = state.activities.find((candidate) => candidate.id === activityId);
        if (!userId || !activity) throw new Error('The activity could not be found.');
        if (activity.visibility !== 'community') throw new Error('This activity is invite-only.');
        if (activity.attendeeIds.length >= activity.capacity)
          throw new Error('This activity is full.');
        if (state.session?.mode === 'supabase') await joinRemoteActivity(activityId, userId);
        dispatch({ type: 'join-activity', activityId, userId });
      }),
    [run, state.activities, state.session],
  );

  const toggleSavedActivity = useCallback(
    (activityId: string) =>
      run(async () => {
        const userId = state.session?.userId;
        if (!userId) throw new Error('Sign in to save an activity.');
        const willSave = !state.savedActivityIds.includes(activityId);
        if (state.session?.mode === 'supabase') {
          await setRemoteActivitySaved(activityId, userId, willSave);
        }
        dispatch({ type: 'toggle-saved', activityId });
      }),
    [run, state.savedActivityIds, state.session],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      isProductionBackend: isSupabaseConfigured,
      startDemo,
      signIn,
      signUp,
      signOut,
      updateProfile,
      createActivity,
      sendInvitations,
      respondToInvitation,
      joinActivity,
      toggleSavedActivity,
      clearError: () => dispatch({ type: 'set-error', error: null }),
    }),
    [
      state,
      startDemo,
      signIn,
      signUp,
      signOut,
      updateProfile,
      createActivity,
      sendInvitations,
      respondToInvitation,
      joinActivity,
      toggleSavedActivity,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider.');
  return context;
};

export const useCurrentProfile = () => {
  const { state } = useApp();
  return state.profiles.find((profile) => profile.id === state.session?.userId);
};

export const useActivity = (activityId: string | undefined) => {
  const { state } = useApp();
  return state.activities.find((activity) => activity.id === activityId);
};

export const resetLocalApp = async () => {
  await clearPersistedState();
};
