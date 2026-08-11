# Simply Schedule web calendar

The web client is a Vite/React/TypeScript calendar viewer in the Simply visual language. This pass supports month and agenda views, previous/next/today navigation, selected-day schedules, responsive layouts, loading/empty/error states, and a live user-scoped Firebase subscription. Event creation, editing, deletion, and recurrence expansion remain for the next phase.

The canonical web/iOS data model is [`../firebase/CALENDAR_EVENT_CONTRACT.md`](../firebase/CALENDAR_EVENT_CONTRACT.md).

## Run in a browser

```bash
cd web
npm ci
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173>). With no complete Firebase environment, the app clearly labels itself `LOCAL PREVIEW` and uses four in-memory single events. Preview data is view-only and is never written remotely.

## Run against Firebase

Copy the environment contract and provide the web app values for the Firebase project selected at the repository root:

```bash
cd web
cp .env.example .env.local
npm run dev
```

Enable Firebase **Anonymous Auth** for this viewing phase. The app signs in (or reuses the browser's anonymous session) and subscribes to:

```text
users/{uid}/events
  where kind == "single"
  order by startsAt ascending
```

A configured app shows `FIREBASE LIVE`. Authentication and Firestore failures preserve the calendar shell and expose a readable retry state rather than silently switching to preview data.

## Run against the local Firebase emulators

Use syntactically valid local Firebase values in `.env.local` (the emulators do not require production secrets) and set:

```dotenv
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=simply-schedule.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=simply-schedule
VITE_FIREBASE_STORAGE_BUCKET=simply-schedule.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:simplyschedule
VITE_FIREBASE_USE_EMULATORS=true
VITE_FIREBASE_SEED_EMULATOR=true
```

From the repository root, start Auth and Firestore:

```bash
npx firebase-tools emulators:start --only auth,firestore
```

Then run `npm run dev` from `web/`. When the anonymous emulator user's collection is empty, `VITE_FIREBASE_SEED_EMULATOR=true` writes the same four minimal single events used by preview mode. Seeding is guarded by emulator mode and is intended only for browser proof.

## Verification

```bash
cd web
npm test
npm run typecheck
npm run lint
npm run build

# Installs Chromium once on a new machine, then runs the real browser flow.
npx playwright install chromium
npm run test:e2e
```

## Structure

- `src/domain/` — strict event types, date-grid navigation, range intersection, sorting, agenda projection, and focused tests.
- `src/lib/firebase.ts` — Vite environment validation, shared Firebase initialization, emulator connections, and anonymous view-phase auth.
- `src/services/eventRepository.ts` — Firestore timestamp conversion, runtime contract validation, snapshot query, and emulator-only seed writes.
- `src/context/` — schedule loading/source/error state and subscription lifecycle.
- `src/components/` — month grid, agenda, and event-list presentation.
- `src/App.tsx` — responsive calendar shell and navigation state.
- `e2e/calendar.spec.ts` — Chromium navigation/view-switch acceptance flow.

## Deliberate phase boundary

The repository type and Firestore rule contract already reserve versioned recurrence fields for first-of-month, third-Friday, every-other-day, every-three-days, and every-five-hours. This calendar pass queries and renders only canonical single events. It does not show a repeating series seed as though it were the full series. The next phase should add one bounded recurrence expander, consume it from the same projections, and then add event-creation UI without moving persistence into components.
