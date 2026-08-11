# Simply Schedule iPhone app

The mobile app is an Expo/React Native iPhone calendar. It follows SimplyLift's conventions: Expo Router routes live under `src/app`, TypeScript is strict, imports use the `@/*` alias, and UI uses white surfaces, black 2px outlines, 8px cards, uppercase heavy labels, and semantic accents.

This view-only pass provides month and agenda projections, previous/next month and Today navigation, selected-day event details, loading/error/empty states, local preview data, and Firebase-backed user-scoped snapshots. Event creation and recurrence expansion intentionally remain for the later iOS phase.

## Local preview

```bash
npm ci
npm run ios
```

When Firebase variables are absent or still use `replace-me`, the app clearly labels and displays `LOCAL PREVIEW` data. The preview is in-memory and is never uploaded.

## Firebase and emulator run

Copy `.env.example` to `.env.local` and provide the client configuration for the same project selected in [`../.firebaserc`](../.firebaserc). Enable Anonymous Auth in that Firebase project. The app reads the shared `users/{uid}/events` contract documented in [`../firebase/CALENDAR_EVENT_CONTRACT.md`](../firebase/CALENDAR_EVENT_CONTRACT.md).

For deterministic local Firebase data, start Auth and Firestore from the repository root:

```bash
npx firebase-tools emulators:start --only auth,firestore
```

Then set these values in `mobile/.env.local` before starting Expo:

```text
EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_SEED_EMULATOR=true
```

The iOS Simulator reaches the host emulators at `127.0.0.1`. Seeding only occurs against the emulator and only when the anonymous user's event collection is empty.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npx expo install --check
```

## Structure

- `src/app/` — Expo Router composition and the calendar screen
- `src/components/` — month, agenda, and event projections
- `src/context/` — schedule snapshot state and retry behavior
- `src/domain/` — shared-contract types and pure date projection logic
- `src/lib/` — Firebase configuration, anonymous auth, and emulator wiring
- `src/services/` — Firestore decoding, query, snapshot, and emulator seed boundary
- `src/theme/` — shared color, spacing, radius, and typography tokens
- `.env.example` — Firebase and emulator environment contract
