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

The client SDKs and auth/data repositories are intentionally not wired in by this foundation scaffold.

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
| `createdAt` / `updatedAt` | timestamp | Server-managed lifecycle timestamps. |

Subtasks stay in the same collection so list and calendar queries share one repository. The initial rules verify ownership and shape but cannot prove that `parentId` exists or prevent cycles; mutations that alter a hierarchy should use a transaction in the client repository.

### Single and repeating events

An event has `title`, `notes`, `kind`, `startsAt`, `endsAt`, `allDay`, `timeZone`, `recurrence`, `createdAt`, and `updatedAt`. `endsAt` and `recurrence` are `null` for an event that does not use them. `timeZone` stores the IANA zone used when the event was created or edited.

`kind` is either `single` or `repeating`. A repeating event stores:

```ts
{
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: number,
  daysOfWeek: number[] | null,
  dayOfMonth: number | null,
  termination: {
    type: "never" | "onDate" | "afterOccurrences",
    until: Timestamp | null,
    count: number | null
  }
}
```

`daysOfWeek` and `dayOfMonth` are intentionally explicit nullable fields. Weekly recurrences require `daysOfWeek`; monthly recurrences require `dayOfMonth`. The termination object supports an open-ended series, a final timestamp, or a maximum occurrence count. The backend stores the rule rather than materializing occurrences; a later calendar repository should expand a bounded window for display and avoid writing duplicate occurrences.

Calendar, list, and agenda views are projections over these documents and should not become separate sources of truth. The indexes cover sibling ordering, task status/due-date filtering, and event kind/start-date filtering; add an index only when a concrete query requires one.

## Scope of this scaffold

Included:

- Shared Firestore CLI configuration and local Auth/Firestore emulators.
- User ownership rules with initial task/event field validation.
- Initial query indexes and a documented data boundary.

Not included yet:

- Firebase client SDK initialization in either app.
- Sign-in screens, repositories, CRUD actions, or offline synchronization.
- Recurrence expansion, task hierarchy mutation logic, reminders, or Cloud Functions.
