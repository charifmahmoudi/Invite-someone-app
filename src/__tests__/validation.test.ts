import {
  activityDraftSchema,
  profileUpdateSchema,
  signUpCredentialsSchema,
  signUpIntroductionSchema,
  signUpSchema,
} from '@/domain/validation';

const validSignUp = {
  name: 'Taylor Reed',
  email: 'taylor@example.com',
  password: 'safe-password',
  city: 'Berlin',
  headline: 'Coffee walks and gallery afternoons',
  bio: 'I enjoy relaxed plans, thoughtful conversation, and discovering new places together.',
  interests: ['Coffee', 'Arts'] as const,
  availability: ['Saturday'],
  connectionGoals: ['New friends'],
};

describe('profile and activity validation', () => {
  it('US-01 accepts a complete member registration', () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it('US-01 rejects a weak password and incomplete preferences', () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      password: 'short',
      interests: ['Coffee'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['password', 'interests']),
      );
    }
  });

  it('US-01 requires password confirmation before registration', () => {
    const result = signUpCredentialsSchema.safeParse({
      name: validSignUp.name,
      email: validSignUp.email,
      password: validSignUp.password,
      confirmPassword: 'different-password',
      city: validSignUp.city,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Passwords do not match.');
    }
  });

  it('US-01 requires a useful public introduction', () => {
    expect(signUpIntroductionSchema.safeParse({ headline: 'Hi', bio: 'Too short' }).success).toBe(
      false,
    );
  });

  it('US-02 requires a useful bio and at least two interests', () => {
    const result = profileUpdateSchema.safeParse({
      name: 'Taylor Reed',
      headline: 'Coffee and gallery fan',
      bio: 'Too short',
      city: 'Berlin',
      interests: ['Coffee'],
      availability: ['Saturday'],
      connectionGoals: ['New friends'],
    });
    expect(result.success).toBe(false);
  });

  it('US-13 accepts only HTTPS profile photo URLs', () => {
    const result = profileUpdateSchema.safeParse({
      name: 'Taylor Reed',
      avatarUrl: 'http://images.example.com/taylor.jpg',
      headline: 'Coffee and gallery fan',
      bio: 'I like relaxed plans, galleries, and thoughtful conversations over coffee.',
      city: 'Berlin',
      interests: ['Coffee', 'Arts'],
      availability: ['Saturday'],
      connectionGoals: ['New friends'],
    });
    expect(result.success).toBe(false);
  });

  it('US-04 accepts a specific, future activity', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(
      activityDraftSchema.safeParse({
        title: 'Coffee after work',
        description: 'A relaxed hour at a quiet café. Come solo and meet a few neighbours.',
        category: 'Coffee',
        startAt: future,
        location: 'Northside Café',
        city: 'Berlin',
        capacity: 5,
        visibility: 'community',
        vibe: 'Easygoing',
      }).success,
    ).toBe(true);
  });

  it('US-04 rejects past activities and unsafe group limits', () => {
    const result = activityDraftSchema.safeParse({
      title: 'Old plan',
      description: 'This description is long enough, but its date and capacity are invalid.',
      category: 'Coffee',
      startAt: new Date(Date.now() - 60_000).toISOString(),
      location: 'Somewhere',
      city: 'Berlin',
      capacity: 80,
      visibility: 'community',
      vibe: 'Easygoing',
    });
    expect(result.success).toBe(false);
  });
});
