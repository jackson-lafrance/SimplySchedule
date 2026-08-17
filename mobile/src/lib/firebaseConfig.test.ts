import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveFirebaseRuntimeConfig,
  type FirebaseEnvironment,
} from "@/lib/firebaseConfig";

const completeEnvironment: FirebaseEnvironment = {
  EXPO_PUBLIC_FIREBASE_API_KEY: "api-key",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "simply-schedule.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "simply-schedule",
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "simply-schedule.firebasestorage.app",
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:123456:ios:abc",
};

test("uses local preview when Firebase configuration is incomplete", () => {
  assert.equal(
    resolveFirebaseRuntimeConfig({
      ...completeEnvironment,
      EXPO_PUBLIC_FIREBASE_API_KEY: "replace-me",
    }),
    null,
  );
});

test("maps the Expo environment to the shared Firebase project", () => {
  const config = resolveFirebaseRuntimeConfig(completeEnvironment);

  assert.equal(config?.options.projectId, "simply-schedule");
  assert.equal(config?.useEmulators, false);
  assert.equal(config?.seedEmulator, false);
});

test("enables seeding only when the emulators are enabled", () => {
  assert.equal(
    resolveFirebaseRuntimeConfig({
      ...completeEnvironment,
      EXPO_PUBLIC_FIREBASE_SEED_EMULATOR: "true",
    })?.seedEmulator,
    false,
  );

  const emulatorConfig = resolveFirebaseRuntimeConfig({
    ...completeEnvironment,
    EXPO_PUBLIC_FIREBASE_USE_EMULATORS: "true",
    EXPO_PUBLIC_FIREBASE_SEED_EMULATOR: "true",
  });

  assert.equal(emulatorConfig?.useEmulators, true);
  assert.equal(emulatorConfig?.seedEmulator, true);
});
