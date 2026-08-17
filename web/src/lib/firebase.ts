import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseOptions } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const PLACEHOLDER_VALUES = new Set(["", "replace-me"]);
const emulatorState = globalThis as typeof globalThis & {
  __simplyScheduleEmulatorsConnected?: boolean;
};

export type FirebaseRuntimeConfig = {
  options: FirebaseOptions;
  useEmulators: boolean;
  seedEmulator: boolean;
};

export type FirebaseClient = FirebaseRuntimeConfig & {
  auth: Auth;
  db: Firestore;
};

let client: FirebaseClient | null | undefined;
let anonymousUserPromise: Promise<User> | null = null;

function usable(value: string | undefined): value is string {
  return Boolean(value && !PLACEHOLDER_VALUES.has(value.trim().toLowerCase()));
}

export function resolveFirebaseRuntimeConfig(
  env: Record<string, string | undefined>,
): FirebaseRuntimeConfig | null {
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = env.VITE_FIREBASE_APP_ID;

  if (
    !usable(apiKey) ||
    !usable(authDomain) ||
    !usable(projectId) ||
    !usable(storageBucket) ||
    !usable(messagingSenderId) ||
    !usable(appId)
  ) {
    return null;
  }

  const useEmulators = env.VITE_FIREBASE_USE_EMULATORS === "true";

  return {
    options: {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    },
    useEmulators,
    seedEmulator:
      useEmulators && env.VITE_FIREBASE_SEED_EMULATOR === "true",
  };
}

export function getFirebaseClient(): FirebaseClient | null {
  if (client !== undefined) {
    return client;
  }

  const runtimeConfig = resolveFirebaseRuntimeConfig(import.meta.env);

  if (!runtimeConfig) {
    client = null;
    return client;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(runtimeConfig.options);
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (
    runtimeConfig.useEmulators &&
    !emulatorState.__simplyScheduleEmulatorsConnected
  ) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    emulatorState.__simplyScheduleEmulatorsConnected = true;
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
