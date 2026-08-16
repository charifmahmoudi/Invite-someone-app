import type {
  Activity,
  AppData,
  AppState,
  Invitation,
  InvitationStatus,
  Profile,
  Session,
} from '@/types/domain';

export type AppAction =
  | { type: 'hydrate'; data: AppData; session: Session | null }
  | { type: 'set-busy'; busy: boolean }
  | { type: 'set-error'; error: string | null }
  | { type: 'start-session'; session: Session; data?: AppData }
  | { type: 'end-session' }
  | { type: 'add-profile'; profile: Profile; session: Session }
  | { type: 'update-profile'; profile: Profile }
  | { type: 'create-activity'; activity: Activity }
  | { type: 'send-invitations'; invitations: Invitation[] }
  | {
      type: 'respond-invitation';
      invitationId: string;
      status: Exclude<InvitationStatus, 'pending'>;
      respondedAt: string;
    }
  | { type: 'join-activity'; activityId: string; userId: string }
  | { type: 'toggle-saved'; activityId: string };

export const createInitialState = (data: AppData): AppState => ({
  ...data,
  hydrated: false,
  busy: false,
  session: null,
  error: null,
});

const addUnique = (values: string[], value: string) =>
  values.includes(value) ? values : [...values, value];

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ...action.data,
        session: action.session,
        hydrated: true,
        busy: false,
        error: null,
      };
    case 'set-busy':
      return { ...state, busy: action.busy };
    case 'set-error':
      return { ...state, error: action.error };
    case 'start-session':
      return {
        ...state,
        ...(action.data ?? {}),
        session: action.session,
        busy: false,
        error: null,
      };
    case 'end-session':
      return { ...state, session: null, busy: false, error: null };
    case 'add-profile':
      return {
        ...state,
        profiles: [...state.profiles, action.profile],
        session: action.session,
        busy: false,
        error: null,
      };
    case 'update-profile':
      return {
        ...state,
        profiles: state.profiles.map((profile) =>
          profile.id === action.profile.id ? action.profile : profile,
        ),
        busy: false,
        error: null,
      };
    case 'create-activity':
      return {
        ...state,
        activities: [action.activity, ...state.activities],
        busy: false,
        error: null,
      };
    case 'send-invitations': {
      const invitationIds = new Set(action.invitations.map((invitation) => invitation.receiverId));
      const activityId = action.invitations.at(0)?.activityId;
      return {
        ...state,
        invitations: [...action.invitations, ...state.invitations],
        activities: state.activities.map((activity) =>
          activity.id === activityId
            ? {
                ...activity,
                invitedIds: [
                  ...activity.invitedIds,
                  ...[...invitationIds].filter((id) => !activity.invitedIds.includes(id)),
                ],
              }
            : activity,
        ),
        busy: false,
        error: null,
      };
    }
    case 'respond-invitation': {
      const invitation = state.invitations.find((item) => item.id === action.invitationId);
      if (!invitation) return state;

      return {
        ...state,
        invitations: state.invitations.map((item) =>
          item.id === action.invitationId
            ? { ...item, status: action.status, respondedAt: action.respondedAt }
            : item,
        ),
        activities: state.activities.map((activity) =>
          activity.id === invitation.activityId && action.status === 'accepted'
            ? { ...activity, attendeeIds: addUnique(activity.attendeeIds, invitation.receiverId) }
            : activity,
        ),
        busy: false,
        error: null,
      };
    }
    case 'join-activity':
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.activityId
            ? { ...activity, attendeeIds: addUnique(activity.attendeeIds, action.userId) }
            : activity,
        ),
        busy: false,
        error: null,
      };
    case 'toggle-saved':
      return {
        ...state,
        savedActivityIds: state.savedActivityIds.includes(action.activityId)
          ? state.savedActivityIds.filter((id) => id !== action.activityId)
          : [...state.savedActivityIds, action.activityId],
      };
    default:
      return state;
  }
};
