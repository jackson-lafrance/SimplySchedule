# Simply Schedule web calendar and event workflows

The web client is a Vite/React/TypeScript schedule in Simply Lift's restrained visual language. Its information architecture is deliberately small:

- **Home** — today's agenda and the next seven populated days;
- **Calendar** — uncluttered day, week, and month views;
- **Settings** — the default view, event timezone, and data status;
- one persistent **Add event** action and a compact profile/data panel.

The create sheet starts with title/date/time. Notes and timezone details are progressively disclosed. Recurrence supports arbitrary 1–99 intervals over hours, days, weeks, months, or years; weekday sets; numeric or last month dates; ordinal weekdays such as first Friday; yearly month selectors; independent start anchors; and never, inclusive through-date, or bounded occurrence-count termination.

The canonical web/iOS data model is [`../firebase/CALENDAR_EVENT_CONTRACT.md`](../firebase/CALENDAR_EVENT_CONTRACT.md).

## Run in a browser

```bash
cd web
npm ci
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173>). Without a complete Firebase environment, the app clearly labels itself `LOCAL PREVIEW`. Sample events and newly created events remain in memory for that browser session and are never uploaded.

## Run against Firebase

Copy the environment contract and provide the web app values for the Firebase project selected at the repository root:

```bash
cd web
cp .env.example .env.local
npm run dev
```

Enable Firebase **Anonymous Auth**. The app signs in (or reuses the browser's anonymous session), reads only event candidates for the active Home/day/week/month range, and writes canonical documents under:

```text
users/{uid}/events/{eventId}
```

Point events, duration events that overlap a range boundary, and repeating seeds use separate snapshot queries. Calculated occurrences are local projections and are never stored as documents. A configured app shows `FIREBASE LIVE`; authentication, query, and write failures remain visible instead of silently falling back to preview data.

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

Then run `npm run dev` from `web/`. When the initial anonymous user's visible collection is empty, `VITE_FIREBASE_SEED_EMULATOR=true` writes the four minimal preview events. Seeding is guarded by emulator mode and happens at most once per app session.

## Verification

```bash
cd web
npm test
npm run typecheck
npm run lint
npm run build

# Installs Chromium once on a new machine, then runs browser creation/expansion.
npx playwright install chromium
npm run test:e2e
```

Set the `VITE_FIREBASE_*` values above and `FIREBASE_E2E=true` while running Playwright inside `firebase emulators:exec` to include authenticated create, rules, snapshot, recurrence, reload, and persistence coverage.

## Structure

- `src/domain/events.ts` — canonical event, recurrence, occurrence, and visible-range types.
- `src/domain/eventForm.ts` — expressive rule normalization, summaries, anchor semantics, and validation.
- `src/domain/recurrence.ts` — timezone-aware, capped range expansion and stable occurrence keys.
- `src/domain/calendar.ts` — date-grid navigation, sorting, day intersection, and agenda projection.
- `src/lib/firebase.ts` — Vite environment validation, Firebase initialization, emulator connections, and anonymous auth.
- `src/services/eventRepository.ts` — Firestore conversion, strict runtime decoding, visible-range listeners, canonical writes, and emulator seeding.
- `src/context/` — canonical schedule state, visible-range subscription lifecycle, and create actions.
- `src/components/` — Home, day/week/month projections, Settings, profile panel, event list, and progressive create sheet.
- `e2e/calendar.spec.ts` — Chromium navigation plus create/expand/persist acceptance flows.

## Semantics

Calendar ranges are half-open: Home uses seven days, day uses one, week uses seven from Sunday, and month uses the full six-week grid. Daily/weekly/monthly/yearly rules preserve the event timezone's wall clock across offset changes; hourly rules use elapsed-hour intervals. `startsAt` is the recurrence anchor/lower bound, selector-based rules begin at their first match on or after it, `onDate` includes the selected local day, and `afterOccurrences` includes the first matching occurrence. Expansion emits at most 2,000 occurrences per projection and keeps each calculated occurrence out of Firestore.
