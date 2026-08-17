# Simply Schedule iPhone app

The mobile app is an Expo/React Native agenda, task, and calendar client designed as a sibling to SimplyLift. It faithfully ports SimplyLift's system-sans logo treatment, 80px ruled top shelf, labeled profile control, fixed bottom action shelf, three-icon tab navigation, spring sheets, 2px black controls, compact spacing, and green pressed state.

## Product structure

- **Home** — the current week as vertically scrolling date sections, positioned on today when opened.
- **Calendar** — restrained day, week, and month selection followed by the selected day's schedule.
- **Settings** — only week start, default calendar view, and 12/24-hour display.
- **+ schedule** — the single full-width primary action, matching SimplyLift's Start Workout placement and behavior.

Task and event rows expose only a name plus essential timing, with a selectable Neovim-inspired color persisted as a stable Firebase palette ID. Tasks can be completed directly from the weekly agenda. Tapping the row opens its details card. Quick task creation needs a title and due time. Quick event creation needs a title, date, and time. Notes, all-day behavior, and recurrence stay behind **More Options**, while repeating events retain a compact preview of upcoming dates.

The recurrence builder supports arbitrary 1–99 intervals across hours, days, weeks, months, and years; multiple weekdays; numeric month days; first through fifth or last ordinal weekdays; yearly month selectors; inclusive through-date and occurrence-count bounds; and never-ending rules. Canonical seeds align to the first matching occurrence. Calendar units preserve local wall time through DST; hourly rules use elapsed time.

## Local preview

```bash
npm ci
npm run ios
```

When Firebase variables are absent or use `replace-me`, the profile sheet identifies `LOCAL PREVIEW`. Created tasks and events remain for the current app session and are never uploaded. Display preferences persist locally with AsyncStorage.

Dates use `YYYY-MM-DD`; time entry uses 24-hour `HH:MM` regardless of the selected display preference. New items use the iPhone's current IANA timezone.

## Firebase and emulator run

Copy `.env.example` to `.env.local` and provide client configuration for the project selected in [`../.firebaserc`](../.firebaserc). Enable Anonymous Auth. The app uses:

```text
users/{uid}/tasks/{taskId}
users/{uid}/events/{eventId}
```

The event contract is documented in [`../firebase/CALENDAR_EVENT_CONTRACT.md`](../firebase/CALENDAR_EVENT_CONTRACT.md). Task documents use the canonical fields documented in [`../firebase/README.md`](../firebase/README.md).

Start Auth and Firestore from the repository root:

```bash
npx firebase-tools emulators:start --only auth,firestore
```

Then set in `mobile/.env.local`:

```text
EXPO_PUBLIC_FIREBASE_USE_EMULATORS=true
EXPO_PUBLIC_FIREBASE_SEED_EMULATOR=true
```

The Simulator reaches host emulators at `127.0.0.1`. Event and task creation use generated document IDs, canonical shared fields, validated color IDs, and Firestore server timestamps. Completing a task preserves `createdAt` and sets server values for `completedAt` and `updatedAt`. Legacy/web documents without color remain readable with semantic defaults.

Visible-range subscriptions cover open due tasks, point events, overlapping duration/all-day events, and repeating candidates. Recurrence expansion remains local, emits stable `<eventId>@<ISO-start>` keys, and is capped at 2,000 visible occurrences.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npx expo install --check
```

Run Firestore rules, task/event persistence, visible queries, completion, and recurrence integration from the repository root:

```bash
npx firebase-tools emulators:exec --project simply-schedule \
  --only auth,firestore "cd mobile && npm run test:emulator"
```

## Structure

- `src/app/` — Expo Router root composition
- `src/screens/` — focused Home, Calendar, and Settings screens
- `src/components/` — Lift-family shelves, profile/add sheets, agenda, controls, and month grid
- `src/context/` — visible-range schedule state and persisted preferences
- `src/domain/` — canonical types, quick forms, flexible recurrence, date projection, and tests
- `src/lib/` — Firebase configuration, anonymous auth, and emulator wiring
- `src/services/` — canonical task/event encoding, persistence, range subscriptions, and emulator verification
- `src/theme/` — shared color, spacing, radius, and typography tokens
