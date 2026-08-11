# Simply Schedule

Simply Schedule is a cross-platform scheduling app. The repository currently contains the first runnable foundation for the iPhone app in [`mobile/`](./mobile).

## Mobile

The mobile client is an Expo/React Native app modeled on SimplyLift's conventions. See [`mobile/README.md`](./mobile/README.md) for setup and structure, then run:

```bash
cd mobile
npm install
npm run ios
```

The initial screen is a deliberately small visual shell. Tasks, subtasks, calendar views, and events will be added in subsequent work.

## Web

The web client is a Vite/React/TypeScript app modeled on SimplyLift's conventions. See [`web/README.md`](./web/README.md) for setup and structure, then run:

```bash
cd web
npm install
npm run dev
```

The web client now provides responsive month and agenda calendar viewing with Firebase-backed, user-scoped single-event snapshots and an explicit local preview mode. Event creation and recurrence expansion remain for the next web phase.

## Firebase foundation

The shared Firebase configuration, Firestore rules, indexes, emulator setup, and initial data model are documented in [`firebase/README.md`](./firebase/README.md). The backend scaffold is intentionally not wired into either client yet. See [`SIMPLY_SCHEDULE_IMPLEMENTATION_DESIGN.md`](./SIMPLY_SCHEDULE_IMPLEMENTATION_DESIGN.md) for the proposed task, subtask, calendar, event, recurrence, synchronization, milestone, risk, and decision plan.
