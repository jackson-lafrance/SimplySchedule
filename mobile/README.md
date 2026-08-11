# Simply Schedule iPhone app

The mobile app is an Expo/React Native iPhone calendar and event creator. It follows SimplyLift's conventions: Expo Router routes live under `src/app`, TypeScript is strict, imports use the `@/*` alias, and UI uses white surfaces, black 2px outlines, 8px cards, uppercase heavy labels, and semantic accents.

The app provides month and agenda projections, previous/next month and Today navigation, selected-day details, loading/error/empty states, and an easy Simply-styled event form. Timed and all-day events can be single or use one of the required recurrence presets:

- First of every month
- Third Friday of every month
- Every other day
- Every three days
- Every five hours

Repeating events can end never, through an inclusive local date, or after an occurrence count. Monthly presets move the first occurrence to the next matching date. Calculated occurrences are bounded to the displayed six-week range and are never persisted.

## Local preview

```bash
npm ci
npm run ios
```

When Firebase variables are absent or still use `replace-me`, the app clearly labels and displays `LOCAL PREVIEW` data. Events created in preview remain for the current app session and are never uploaded.

Dates use `YYYY-MM-DD`; timed fields use 24-hour `HH:MM`. Events use the iPhone's current IANA timezone.

## Firebase and emulator run

Copy `.env.example` to `.env.local` and provide the client configuration for the same project selected in [`../.firebaserc`](../.firebaserc). Enable Anonymous Auth in that Firebase project. The app reads and writes the shared `users/{uid}/events/{eventId}` contract documented in [`../firebase/CALENDAR_EVENT_CONTRACT.md`](../firebase/CALENDAR_EVENT_CONTRACT.md).

For deterministic local Firebase data, start Auth and Firestore from the repository root:

```bash
npx firebase-tools emulators:start --only auth,firestore
```

Then set these values in `mobile/.env.local` before starting Expo:

```text
EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_SEED_EMULATOR=true
```

The iOS Simulator reaches the host emulators at `127.0.0.1`. Seeding occurs only against the emulator and only when the anonymous user's visible event collection is empty. Created documents use generated IDs, exactly the canonical ten fields, and Firestore server values for both lifecycle timestamps.

The repository combines visible-range listeners for point events, overlapping duration/all-day events, and repeating candidates. Recurrence expands locally to at most 2,000 visible occurrences with stable `<eventId>@<ISO-start>` keys.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npx expo install --check
```

Run the Firestore rules, canonical persistence, visible-range query, and recurrence projection integration test from the repository root:

```bash
npx firebase-tools emulators:exec --project simply-schedule \
  --only auth,firestore "cd mobile && npm run test:emulator"
```

## Structure

- `src/app/` — Expo Router composition and calendar/create workflow
- `src/components/` — month, agenda, event, and create-event surfaces
- `src/context/` — visible-range schedule state, creation, and retry behavior
- `src/domain/` — shared-contract types, form normalization, and bounded recurrence projection
- `src/lib/` — Firebase configuration, anonymous auth, and emulator wiring
- `src/services/` — canonical Firestore encoding/decoding, range queries, persistence, and emulator verification
- `src/theme/` — shared color, spacing, radius, and typography tokens
- `.env.example` — Firebase and emulator environment contract
