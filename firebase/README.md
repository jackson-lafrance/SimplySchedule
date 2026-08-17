# Simply Schedule Firebase foundation

This directory documents the Firebase boundary for Simply Schedule. The Firebase CLI configuration lives at the repository root so the iPhone and web clients can target the same project:

- [`../firebase.json`](../firebase.json) — Firestore and local emulator configuration.
- [`../.firebaserc`](../.firebaserc) — the default project alias (`simply-schedule`). Change it with `firebase use --add` when the real Firebase project ID is available.
- [`../firestore.rules`](../firestore.rules) — authenticated, per-user access rules and initial document validation.
- [`../firestore.indexes.json`](../firestore.indexes.json) — initial task and event query indexes.

## Local setup

Install the Firebase CLI once, authenticate, and select the project:

```bash
npm install --global firebase-tools
firebase login
firebase use --add
```

Run the local Auth and Firestore emulators from the repository root:

```bash
firebase emulators:start
```

The emulator UI is available at <http://127.0.0.1:4000>. The rules and indexes can be deployed without deploying application code:

```bash
firebase deploy --only firestore
```

No service-account credentials or production secrets belong in this repository. Firebase client configuration is public application configuration, but it should still be supplied through local environment files. Copy the relevant example into the client package that is being developed:

- [`../mobile/.env.example`](../mobile/.env.example) for Expo (`EXPO_PUBLIC_FIREBASE_*`).
- [`../web/.env.example`](../web/.env.example) for Vite (`VITE_FIREBASE_*`).

The React web and React Native iOS clients use this boundary for visible-range calendar reads, canonical event creation, and bounded local recurrence expansion. iOS also creates, lists, and completes canonical due tasks.

## Initial Firestore shape

All application data is owned by the authenticated user:

```text
users/{uid}
  tasks/{taskId}
  events/{eventId}
```

### Tasks and subtasks

A task document has the following fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `title` | string | Required display title, 1–200 characters. |
| `notes` | string | Optional content, stored as an empty string when unused. |
| `status` | `open \| completed` | Current task state. |
| `parentId` | string \| null | Parent task ID for a subtask; `null` means a top-level task. |
| `dueAt` | timestamp \| null | Optional due date/time. |
| `completedAt` | timestamp \| null | Completion timestamp, when applicable. |
| `position` | number | Ordering value within a task list or sibling group. |
| `color` | string (optional) | Shared Neovim-inspired palette key; missing values use the green task default. |
| `createdAt` / `updatedAt` | timestamp | Server-managed lifecycle timestamps. |

Subtasks stay in the same collection so list and calendar queries share one repository. The iOS agenda queries open tasks by the visible `dueAt` range, creates top-level tasks with `parentId: null`, and uses server timestamps when completing them. The rules verify ownership and shape but cannot prove that `parentId` exists or prevent cycles; mutations that alter a hierarchy should use a transaction in the client repository.

### Single and repeating events

The canonical cross-platform event schema, timestamp/all-day semantics, versioned recurrence grammar, required pattern encodings, and platform query shapes are defined in [`CALENDAR_EVENT_CONTRACT.md`](./CALENDAR_EVENT_CONTRACT.md). That contract is shared by the React web and React Native iOS clients.

An event has `title`, `notes`, `kind`, `startsAt`, `endsAt`, `allDay`, `timeZone`, `recurrence`, `createdAt`, and `updatedAt`, plus an optional backward-compatible `color` palette key. Missing color uses the mauve event default. `kind` is `single` or `repeating`; single events use `recurrence: null`. Version 1 recurrence supports hourly, daily, weekly, monthly, and yearly intervals plus numeric-day and ordinal-weekday selectors. It can represent first-of-month, third-Friday, every-other-day, every-three-days, and every-five-hours without materialized occurrence documents.

Calendar, list, and agenda views are projections over these documents and should not become separate sources of truth. The indexes cover sibling ordering, task status/due-date filtering, and event kind/start-date filtering; add an index only when a concrete query requires one.

## Scope of this scaffold

Included:

- Shared Firestore CLI configuration and local Auth/Firestore emulators.
- User ownership rules with initial task/event field validation.
- Initial query indexes and a documented data boundary.

Not included yet:

- Event editing/deletion, account screens, or an offline outbox.
- Occurrence exceptions, task hierarchy mutation logic, reminders, or Cloud Functions.

Both clients initialize Firebase when their platform environment is complete, authenticate an anonymous user, subscribe to user-scoped visible-range tasks and event candidates, write compatible canonical task/event documents with server lifecycle timestamps and shared color keys, and expand recurrence locally. Both support task creation/completion. See [`../web/README.md`](../web/README.md) and [`../mobile/README.md`](../mobile/README.md) for run instructions.
