export const ACTIVITY_CATEGORIES = [
  'Coffee',
  'Food',
  'Outdoors',
  'Sports',
  'Arts',
  'Games',
  'Learning',
  'Wellness',
] as const;

export const AVAILABILITY_OPTIONS = [
  'Weekday mornings',
  'Weekday evenings',
  'Saturday',
  'Sunday',
] as const;

export const CONNECTION_GOALS = [
  'New friends',
  'Activity buddies',
  'Local community',
  'Learn together',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export type ActivityVisibility = 'community' | 'invite-only';
export type ActivityVibe = 'Easygoing' | 'Active' | 'Focused';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type SessionMode = 'demo' | 'local' | 'supabase';

export interface Profile {
  id: string;
  name: string;
  handle: string;
  email?: string;
  headline: string;
  bio: string;
  city: string;
  initials: string;
  avatarColor: string;
  interests: ActivityCategory[];
  availability: string[];
  connectionGoals: string[];
  joinedAt: string;
  completedActivities: number;
  reliabilityScore: number;
  isVerified?: boolean;
}

export interface Activity {
  id: string;
  hostId: string;
  title: string;
  description: string;
  category: ActivityCategory;
  startAt: string;
  endAt?: string;
  location: string;
  city: string;
  capacity: number;
  attendeeIds: string[];
  invitedIds: string[];
  visibility: ActivityVisibility;
  vibe: ActivityVibe;
  createdAt: string;
}

export interface Invitation {
  id: string;
  activityId: string;
  senderId: string;
  receiverId: string;
  status: InvitationStatus;
  message: string;
  createdAt: string;
  respondedAt?: string;
}

export interface Session {
  userId: string;
  mode: SessionMode;
}

export interface AppData {
  profiles: Profile[];
  activities: Activity[];
  invitations: Invitation[];
  savedActivityIds: string[];
}

export interface AppState extends AppData {
  hydrated: boolean;
  busy: boolean;
  session: Session | null;
  error: string | null;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  city: string;
  interests: ActivityCategory[];
  availability: string[];
  connectionGoals: string[];
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface ProfileUpdateInput {
  name: string;
  headline: string;
  bio: string;
  city: string;
  interests: ActivityCategory[];
  availability: string[];
  connectionGoals: string[];
}

export interface ActivityDraft {
  title: string;
  description: string;
  category: ActivityCategory;
  startAt: string;
  location: string;
  city: string;
  capacity: number;
  visibility: ActivityVisibility;
  vibe: ActivityVibe;
}

export interface InvitationDraft {
  activityId: string;
  receiverIds: string[];
  message: string;
}
