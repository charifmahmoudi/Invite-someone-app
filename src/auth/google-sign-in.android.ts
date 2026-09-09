import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
} from 'react-native-nitro-google-signin';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleOneTapSignIn.configure({ webClientId: 'autoDetect' });
  configured = true;
}

export const isGoogleSignInAvailable = true;

export async function getGoogleIdToken(): Promise<string | null> {
  ensureConfigured();
  await GoogleOneTapSignIn.checkPlayServices();

  let response = await GoogleOneTapSignIn.createAccount();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.presentExplicitSignIn();
  }

  if (isCancelledResponse(response)) return null;
  if (!isSuccessResponse(response)) {
    throw new Error('Google sign-in did not complete.');
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }
  return idToken;
}

export async function signOutGoogle(): Promise<void> {
  ensureConfigured();
  await GoogleOneTapSignIn.signOut();
}
