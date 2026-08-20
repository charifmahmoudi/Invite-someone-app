import { z } from 'zod';

import {
  ACTIVITY_CATEGORIES,
  type ActivityDraft,
  type ProfileUpdateInput,
  type SignInInput,
  type SignUpInput,
} from '@/types/domain';

const requiredText = (label: string, minimum = 2) =>
  z.string().trim().min(minimum, `${label} must be at least ${minimum} characters.`);

export const signInSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
}) satisfies z.ZodType<SignInInput>;

export const signUpBasicsSchema = z.object({
  name: requiredText('Name'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  city: requiredText('City'),
});

export const signUpCredentialsSchema = signUpBasicsSchema
  .extend({
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const signUpIntroductionSchema = z.object({
  headline: requiredText('Headline', 4).max(80, 'Keep your headline under 80 characters.'),
  bio: requiredText('Bio', 20).max(320, 'Keep your bio under 320 characters.'),
});

export const signUpSchema = signUpBasicsSchema.extend({
  ...signUpIntroductionSchema.shape,
  interests: z.array(z.enum(ACTIVITY_CATEGORIES)).min(2, 'Choose at least two interests.'),
  availability: z.array(z.string()).min(1, 'Choose when you are usually free.'),
  connectionGoals: z.array(z.string()).min(1, 'Choose what you are looking for.'),
}) satisfies z.ZodType<SignUpInput>;

export const profileUpdateSchema = z.object({
  name: requiredText('Name'),
  avatarUrl: z
    .url('Enter a complete https:// photo URL.')
    .refine((value) => value.startsWith('https://'), 'Profile photos must use HTTPS.')
    .optional(),
  headline: requiredText('Headline', 4).max(80, 'Keep your headline under 80 characters.'),
  bio: requiredText('Bio', 20).max(320, 'Keep your bio under 320 characters.'),
  city: requiredText('City'),
  interests: z.array(z.enum(ACTIVITY_CATEGORIES)).min(2, 'Choose at least two interests.'),
  availability: z.array(z.string()).min(1, 'Choose at least one time.'),
  connectionGoals: z.array(z.string()).min(1, 'Choose at least one goal.'),
}) satisfies z.ZodType<ProfileUpdateInput>;

export const activityDraftSchema = z
  .object({
    title: requiredText('Title', 4).max(70, 'Keep the title under 70 characters.'),
    description: requiredText('Description', 20).max(
      500,
      'Keep the description under 500 characters.',
    ),
    category: z.enum(ACTIVITY_CATEGORIES),
    startAt: z.iso.datetime('Choose a valid date and time.'),
    location: requiredText('Location', 3),
    city: requiredText('City'),
    capacity: z
      .number()
      .int()
      .min(2, 'Invite at least one other person.')
      .max(30, 'Keep the group at 30 people or fewer.'),
    visibility: z.enum(['community', 'invite-only']),
    vibe: z.enum(['Easygoing', 'Active', 'Focused']),
  })
  .refine((activity) => new Date(activity.startAt).getTime() > Date.now(), {
    path: ['startAt'],
    message: 'Choose a time in the future.',
  }) satisfies z.ZodType<ActivityDraft>;

export const firstValidationMessage = (error: z.ZodError) =>
  error.issues.at(0)?.message ?? 'Check the information and try again.';
