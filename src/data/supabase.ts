import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session as SupabaseSession } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import type { Activity, AppData, Invitation, InvitationStatus, Profile } from '@/types/domain';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

interface ProfileRow {
  id: string;
  name: string;
  handle: string;
  email?: string | null;
  headline: string;
  bio: string;
  city: string;
  initials: string;
  avatar_color: string;
  interests: Profile['interests'];
  availability: string[];
  connection_goals: string[];
  joined_at: string;
  completed_activities: number;
  reliability_score: number;
  is_verified: boolean;
}

interface ActivityRow {
  id: string;
  host_id: string;
  title: string;
  description: string;
  category: Activity['category'];
  start_at: string;
  end_at: string | null;
  location: string;
  city: string;
  capacity: number;
  visibility: Activity['visibility'];
  vibe: Activity['vibe'];
  created_at: string;
}

interface InvitationRow {
  id: string;
  activity_id: string;
  sender_id: string;
  receiver_id: string;
  status: InvitationStatus;
  message: string;
  created_at: string;
  responded_at: string | null;
}

interface AttendeeRow {
  activity_id: string;
  user_id: string;
}

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

const profileFromRow = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  handle: row.handle,
  email: row.email ?? undefined,
  headline: row.headline,
  bio: row.bio,
  city: row.city,
  initials: row.initials,
  avatarColor: row.avatar_color,
  interests: row.interests,
  availability: row.availability,
  connectionGoals: row.connection_goals,
  joinedAt: row.joined_at,
  completedActivities: row.completed_activities,
  reliabilityScore: row.reliability_score,
  isVerified: row.is_verified,
});

const activityToRow = (activity: Activity) => ({
  id: activity.id,
  host_id: activity.hostId,
  title: activity.title,
  description: activity.description,
  category: activity.category,
  start_at: activity.startAt,
  end_at: activity.endAt ?? null,
  location: activity.location,
  city: activity.city,
  capacity: activity.capacity,
  visibility: activity.visibility,
  vibe: activity.vibe,
  created_at: activity.createdAt,
});

const profileToRow = (profile: Profile) => ({
  name: profile.name,
  handle: profile.handle,
  headline: profile.headline,
  bio: profile.bio,
  city: profile.city,
  initials: profile.initials,
  avatar_color: profile.avatarColor,
  interests: profile.interests,
  availability: profile.availability,
  connection_goals: profile.connectionGoals,
});

const invitationFromRow = (row: InvitationRow): Invitation => ({
  id: row.id,
  activityId: row.activity_id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  status: row.status,
  message: row.message,
  createdAt: row.created_at,
  respondedAt: row.responded_at ?? undefined,
});

const throwOnError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const getRemoteSession = async (): Promise<SupabaseSession | null> => {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  throwOnError(error);
  return data.session;
};

export const signInRemote = async (email: string, password: string) => {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  throwOnError(error);
  if (!data.user || !data.session) throw new Error('Unable to start a session.');
  return data;
};

export const signUpRemote = async (
  email: string,
  password: string,
  metadata: {
    name: string;
    city: string;
    interests: string[];
    availability: string[];
    connectionGoals: string[];
  },
) => {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata.name,
        city: metadata.city,
        interests: metadata.interests,
        availability: metadata.availability,
        connection_goals: metadata.connectionGoals,
      },
    },
  });
  throwOnError(error);
  return data;
};

export const signOutRemote = async () => {
  const { error } = await requireClient().auth.signOut();
  throwOnError(error);
};

export const loadRemoteData = async (userId: string): Promise<AppData> => {
  const client = requireClient();
  const [profilesResult, activitiesResult, attendeesResult, invitationsResult, savedResult] =
    await Promise.all([
      client.from('profiles').select('*').order('name'),
      client.from('activities').select('*').order('start_at'),
      client.from('activity_attendees').select('activity_id,user_id'),
      client
        .from('invitations')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
      client.from('saved_activities').select('activity_id').eq('user_id', userId),
    ]);

  [profilesResult, activitiesResult, attendeesResult, invitationsResult, savedResult].forEach(
    (result) => throwOnError(result.error),
  );

  const invitations = (invitationsResult.data as InvitationRow[]).map(invitationFromRow);
  const attendees = attendeesResult.data as AttendeeRow[];

  return {
    profiles: (profilesResult.data as ProfileRow[]).map(profileFromRow),
    activities: (activitiesResult.data as ActivityRow[]).map((row) => ({
      id: row.id,
      hostId: row.host_id,
      title: row.title,
      description: row.description,
      category: row.category,
      startAt: row.start_at,
      endAt: row.end_at ?? undefined,
      location: row.location,
      city: row.city,
      capacity: row.capacity,
      attendeeIds: attendees
        .filter((attendee) => attendee.activity_id === row.id)
        .map((attendee) => attendee.user_id),
      invitedIds: invitations
        .filter((invitation) => invitation.activityId === row.id)
        .map((invitation) => invitation.receiverId),
      visibility: row.visibility,
      vibe: row.vibe,
      createdAt: row.created_at,
    })),
    invitations,
    savedActivityIds: (savedResult.data as { activity_id: string }[]).map((row) => row.activity_id),
  };
};

export const updateRemoteProfile = async (profile: Profile) => {
  const { error } = await requireClient()
    .from('profiles')
    .update(profileToRow(profile))
    .eq('id', profile.id);
  throwOnError(error);
};

export const createRemoteActivity = async (activity: Activity) => {
  const { error } = await requireClient().from('activities').insert(activityToRow(activity));
  throwOnError(error);
};

export const createRemoteInvitations = async (invitations: Invitation[]) => {
  const rows = invitations.map((invitation) => ({
    id: invitation.id,
    activity_id: invitation.activityId,
    sender_id: invitation.senderId,
    receiver_id: invitation.receiverId,
    status: invitation.status,
    message: invitation.message,
    created_at: invitation.createdAt,
  }));
  const { error } = await requireClient().from('invitations').insert(rows);
  throwOnError(error);
};

export const respondRemoteInvitation = async (
  invitation: Invitation,
  status: Exclude<InvitationStatus, 'pending'>,
  respondedAt: string,
) => {
  const client = requireClient();
  const { error } = await client
    .from('invitations')
    .update({ status, responded_at: respondedAt })
    .eq('id', invitation.id);
  throwOnError(error);
};

export const joinRemoteActivity = async (activityId: string, userId: string) => {
  const { error } = await requireClient()
    .from('activity_attendees')
    .insert({ activity_id: activityId, user_id: userId });
  throwOnError(error);
};

export const setRemoteActivitySaved = async (
  activityId: string,
  userId: string,
  saved: boolean,
) => {
  const query = requireClient().from('saved_activities');
  const result = saved
    ? await query.upsert({ activity_id: activityId, user_id: userId })
    : await query.delete().eq('activity_id', activityId).eq('user_id', userId);
  throwOnError(result.error);
};
