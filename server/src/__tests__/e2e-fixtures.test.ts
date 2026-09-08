import { assertSafeE2EFixtureConfig, isE2EFixtureTokenValid } from '../e2e-fixtures';

describe('E2E fixture safety boundary', () => {
  const token = 'fixture-token-with-at-least-32-characters';

  it('accepts an explicit isolated E2E database and strong token', () => {
    expect(() =>
      assertSafeE2EFixtureConfig({
        databaseName: 'invite_firebase_e2e',
        enabled: true,
        token,
      }),
    ).not.toThrow();
  });

  it.each([
    { databaseName: 'invite_someone', enabled: true, token },
    { databaseName: 'invite_firebase_e2e', enabled: false, token },
    { databaseName: 'invite_firebase_e2e', enabled: true, token: 'too-short' },
  ])('rejects unsafe configuration %#', (input) => {
    expect(() => assertSafeE2EFixtureConfig(input)).toThrow();
  });

  it('requires an exact fixture bearer token', () => {
    expect(isE2EFixtureTokenValid(token, token)).toBe(true);
    expect(isE2EFixtureTokenValid(token, `${token}-wrong`)).toBe(false);
    expect(isE2EFixtureTokenValid(token)).toBe(false);
  });
});
