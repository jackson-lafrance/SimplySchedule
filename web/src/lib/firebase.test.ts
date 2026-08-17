import { describe, expect, it } from "vitest";

import { resolveFirebaseRuntimeConfig } from "@/lib/firebase";

const completeEnvironment = {
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "simply-schedule.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "simply-schedule",
  VITE_FIREBASE_STORAGE_BUCKET: "simply-schedule.firebasestorage.app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  VITE_FIREBASE_APP_ID: "1:000000000000:web:simplyschedule",
};

describe("Firebase runtime configuration", () => {
  it("uses explicit preview mode when configuration is incomplete", () => {
    expect(
      resolveFirebaseRuntimeConfig({
        ...completeEnvironment,
        VITE_FIREBASE_API_KEY: "replace-me",
      }),
    ).toBeNull();
  });

  it("resolves a complete production configuration", () => {
    expect(resolveFirebaseRuntimeConfig(completeEnvironment)).toMatchObject({
      options: { projectId: "simply-schedule" },
      useEmulators: false,
      seedEmulator: false,
    });
  });

  it("never enables seed writes without emulator mode", () => {
    expect(
      resolveFirebaseRuntimeConfig({
        ...completeEnvironment,
        VITE_FIREBASE_SEED_EMULATOR: "true",
      }),
    ).toMatchObject({ useEmulators: false, seedEmulator: false });
  });
});
