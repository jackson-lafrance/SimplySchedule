import type { FirebaseOptions } from "firebase/app";

const PLACEHOLDER_VALUES = new Set(["", "replace-me"]);

export type FirebaseEnvironment = {
  EXPO_PUBLIC_FIREBASE_API_KEY?: string;
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string;
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
  EXPO_PUBLIC_FIREBASE_APP_ID?: string;
  EXPO_PUBLIC_FIREBASE_USE_EMULATORS?: string;
  EXPO_PUBLIC_FIREBASE_SEED_EMULATOR?: string;
};

export type FirebaseRuntimeConfig = {
  options: FirebaseOptions;
  useEmulators: boolean;
  seedEmulator: boolean;
};

function usable(value: string | undefined): value is string {
  return Boolean(value && !PLACEHOLDER_VALUES.has(value.trim().toLowerCase()));
}

export function resolveFirebaseRuntimeConfig(
  env: FirebaseEnvironment,
): FirebaseRuntimeConfig | null {
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = env.EXPO_PUBLIC_FIREBASE_APP_ID;

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

  const useEmulators = env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === "true";

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
      useEmulators && env.EXPO_PUBLIC_FIREBASE_SEED_EMULATOR === "true",
  };
}
