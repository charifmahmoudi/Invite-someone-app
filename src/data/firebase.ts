import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
// Firebase 12.18's umbrella-package typings currently omit the React Native-only
// getReactNativePersistence export even though Expo Metro resolves that runtime entry.
// @ts-expect-error -- Firebase typings mismatch; remove when firebase/auth exposes the RN export to TypeScript.
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim(),
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  if (Platform.OS === 'web') {
    firebaseAuth = getAuth(firebaseApp);
  } else {
    try {
      firebaseAuth = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      // Fast Refresh may attempt to initialize the same Auth instance twice.
      firebaseAuth = getAuth(firebaseApp);
    }
  }
}

export { firebaseApp, firebaseAuth };

export const googleClientIds = {
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim(),
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim(),
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim(),
} as const;

export const isGoogleSignInConfigured =
  Platform.select({
    android: Boolean(googleClientIds.android),
    ios: Boolean(googleClientIds.ios),
    default: Boolean(googleClientIds.web),
  }) ?? false;
