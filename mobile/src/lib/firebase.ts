import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

import {
  resolveFirebaseRuntimeConfig,
  type FirebaseEnvironment,
  type FirebaseRuntimeConfig,
} from "@/lib/firebaseConfig";

const emulatorState = globalThis as typeof globalThis & {
  __simplyScheduleMobileEmulatorsConnected?: boolean;
};

export type FirebaseClient = FirebaseRuntimeConfig & {
  auth: Auth;
  db: Firestore;
};

let client: FirebaseClient | null | undefined;
let anonymousUserPromise: Promise<User> | null = null;

function expoEnvironment(): FirebaseEnvironment {
  return {
    EXPO_PUBLIC_FIREBASE_API_KEY:
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID:
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_FIREBASE_USE_EMULATORS:
      process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS,
    EXPO_PUBLIC_FIREBASE_SEED_EMULATOR:
      process.env.EXPO_PUBLIC_FIREBASE_SEED_EMULATOR,
  };
}

function getPersistentAuth(app: ReturnType<typeof initializeApp>) {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Expo fast refresh can evaluate this module after Auth is initialized.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "auth/already-initialized"
    ) {
      return getAuth(app);
    }
    throw error;
  }
}

export function getFirebaseClient(): FirebaseClient | null {
  if (client !== undefined) {
    return client;
  }

  const runtimeConfig = resolveFirebaseRuntimeConfig(expoEnvironment());

  if (!runtimeConfig) {
    client = null;
    return client;
  }

  const existingApp = getApps().length > 0;
  const app = existingApp ? getApp() : initializeApp(runtimeConfig.options);
  const auth = existingApp ? getAuth(app) : getPersistentAuth(app);
  const db = getFirestore(app);

  if (
    runtimeConfig.useEmulators &&
    !emulatorState.__simplyScheduleMobileEmulatorsConnected
  ) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    emulatorState.__simplyScheduleMobileEmulatorsConnected = true;
  }

  client = { ...runtimeConfig, auth, db };
  return client;
}

export async function getOrCreateScheduleUser(auth: Auth) {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (!anonymousUserPromise) {
    anonymousUserPromise = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        anonymousUserPromise = null;
      });
  }

  return anonymousUserPromise;
}
