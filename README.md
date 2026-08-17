# Simply Schedule

Simply Schedule is a cross-platform scheduling app with coordinated React web and React Native iOS calendar/event workflows.

## Mobile

The mobile client is an Expo/React Native app modeled on SimplyLift's conventions. See [`mobile/README.md`](./mobile/README.md) for setup and structure, then run:

```bash
cd mobile
npm install
npm run ios
```

The iPhone client uses SimplyLift's shelf, profile, navigation, typography, spacing, and primary-action patterns. Its three tabs provide a minimal selected-day agenda, restrained day/week/month calendars, and three focused preferences. A single quick-add sheet creates canonical tasks or events and exposes arbitrary interval, weekday, numeric-day, ordinal-weekday, yearly, timezone-aware, and bounded recurrence only when requested. Local preview creation remains session-only.

## Web

The web client is a Vite/React/TypeScript app modeled on SimplyLift's conventions. See [`web/README.md`](./web/README.md) for setup and structure, then run:

```bash
cd web
npm install
npm run dev
```

The web client now provides a restrained Simply Lift-inspired Home/Calendar/Settings shell, agenda-focused Home, day/week/month views, progressive event creation, canonical user-scoped Firebase writes, visible-range reads, and expressive bounded recurrence. Local preview creation remains session-only.

## Firebase foundation

The shared Firebase configuration, Firestore rules, indexes, emulator setup, and canonical data model are documented in [`firebase/README.md`](./firebase/README.md). See [`SIMPLY_SCHEDULE_IMPLEMENTATION_DESIGN.md`](./SIMPLY_SCHEDULE_IMPLEMENTATION_DESIGN.md) for the broader task, subtask, synchronization, milestone, risk, and decision plan.
