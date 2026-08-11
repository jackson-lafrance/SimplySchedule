# Simply Schedule implementation design

**Status:** Proposed foundation design
**Date:** 2026-08-09
**Scope:** Tasks, subtasks, calendar projections, single events, repeating events, recurrence termination, and the supporting architecture

> **2026-08-11 implementation note:** the React web and React Native iOS clients now implement the calendar-viewing slice with Firebase initialization, anonymous view-phase auth, platform user-scoped single-event repositories, and month/agenda projections. [`firebase/CALENDAR_EVENT_CONTRACT.md`](./firebase/CALENDAR_EVENT_CONTRACT.md) supersedes this proposal's draft recurrence shape where they differ. Event creation and bounded recurrence expansion remain future work.

This report follows the four foundation steps: documenting SimplyLift's conventions, scaffolding the iPhone app, scaffolding the web app, and scaffolding Firebase. It is intended to stand alone as the implementation brief for the next phase. It distinguishes what exists from what is recommended so that a future implementation does not mistake the Firebase draft for a finished product contract.

## 1. Investigation summary

### 1.1 Simply Schedule as it exists

The repository is still a bootstrap repository with four uncommitted foundation areas on the task branch:

- `mobile/` is an Expo Router/React Native 0.83/React 19 TypeScript app. It currently has one static route, a safe-area shell, and SimplyLift-inspired theme tokens.
- `web/` is a Vite/React 19/TypeScript app. It currently has a responsive schedule preview with Today and Foundation navigation, but no product state or persistence.
- The root Firebase files configure Auth and Firestore emulators, rules, indexes, and the `users/{uid}/tasks` and `users/{uid}/events` boundary.
- `SIMPLYLIFT_STYLE_GUIDE.md` records the observed visual, UX, architecture, persistence, and testing conventions.

The clients do **not** yet initialize Firebase, authenticate users, expose repositories, subscribe to snapshots, expand recurrence, or implement task/event workflows. There is no shared domain package yet.

### 1.2 Verification performed

Verified in this workspace on 2026-08-09:

```text
mobile: npm run typecheck   pass
mobile: npm run lint        pass
web:    npm run typecheck   pass
web:    npm run lint        pass
web:    npm run build       pass
.firebaserc, firebase.json, firestore.indexes.json: valid JSON
```

The handover reports a successful Firebase emulator start. I could not independently repeat that check in this session because the `firebase` CLI is not installed on PATH. The rules and indexes below are therefore treated as inspected configuration, not as a newly executed emulator test.

### 1.3 SimplyLift model and patterns that should carry forward

The reference source was inspected at SimplyLift commit `6defe59`, the same commit cited by the style guide. The important model is deliberately small:

```ts
interface Set {
  reps: number;
  weight: number;
  type?: "warmup" | "failure" | "rir";
  rir?: number;
}

interface Exercise {
  name: string;
  sets?: Set[];
  isUnilateral?: boolean;
}

interface Workout {
  id?: string;
  name: string;
  time: number;
  date: Date;
  exercises: Exercise[];
}
```

The transferable design lessons are more important than the workout fields:

- `AppProvider` owns domain state and mutations; screens do not write to storage or Firestore.
- `workoutRepository.ts` is the persistence boundary and performs document conversion, queries, snapshots, CRUD, migration, and batch operations.
- Current edits are deep-cloned before mutation and replaced immutably.
- Signed-out state is local; signed-in state is user-scoped and observed from Firestore. Legacy local data is migrated once on sign-in.
- Pure logic is kept outside UI components and tested directly.
- Async failures become short, human-readable alerts; destructive operations have explicit confirmation.
- The shell is safe-area aware, uses a fixed action shelf, and keeps normal navigation separate from an active workflow.

Simply Schedule should use the same boundaries, but it should not copy the workout-specific active-session mode. A schedule has several simultaneous projections and needs a query/cache layer that can provide the same canonical data to list, agenda, day, week, and month views.

## 2. Product proposal

### 2.1 Core concepts

1. **Task:** actionable work with a title, optional notes, completion state, optional due date/time, and an ordering position.
2. **Subtask:** a task whose `parentId` points to another task owned by the same user. It is stored in the same collection so the task list and calendar share one source.
3. **Event:** a time-based calendar item. A single event has one occurrence; a repeating event stores one recurrence rule and is expanded only for the visible date range.
4. **Occurrence:** a calculated display item, not a separate canonical document. An occurrence has a stable key derived from its event series and local start.
5. **Exception:** an optional override or cancellation for one occurrence of a repeating series.
6. **Projection:** a view-specific representation of canonical tasks and events. Calendar, agenda, task list, and search must not become independent data stores.

### 2.2 Recommended v1 product behavior

- The default landing view is **Today**, combining overdue tasks, tasks due today, and today's event occurrences.
- A task may be unscheduled. A task with a date appears in the task list and in the calendar's all-day/due section; a task with a time appears at that time as a point item. Tasks do not have a duration in v1.
- A task can have one level of subtasks in v1. The data shape remains capable of deeper nesting, but the first UI should not expose recursive editing until the hierarchy rules are proven.
- Completing a task records `completedAt`; it does not automatically complete or delete its subtasks. The UI shows parent progress and asks separately whether to complete open children if the user requests that action.
- Events can be all-day or timed. A timed event can have a duration; a point event is allowed if the product wants reminders or appointments without an end.
- A repeating event is one series. It is not copied into one Firestore document per occurrence. The visible range is expanded locally by deterministic pure code.
- Editing a repeating occurrence must offer **This occurrence**, **This and future occurrences**, or **Entire series** only if the corresponding exception/split-series implementation is included. Until then, the UI must limit edits to the entire series rather than silently changing every occurrence.
- v1 supports daily, weekly, monthly, and yearly rules, an interval, explicit weekday/month-day selectors, and one termination condition: never, through a date, or after a count.

These defaults keep the first release useful without turning the initial task into a full iCalendar implementation. The questions in section 11 must be answered before schema and interaction details are frozen.

## 3. Architecture

### 3.1 Proposed layers

```text
Mobile Expo app                 Web React app
  screens/components              routes/components
          \                       /
        platform UI adapters and client state provider
                         |
                 shared domain package
       models · validation · recurrence · selectors · IDs
                         |
              repository and synchronization layer
       Auth adapter · Firestore adapter · local cache/outbox
                         |
              Firebase Auth + Firestore canonical data
```

Recommended future repository layout:

```text
packages/domain/src/
  models.ts                 // Task, Event, RecurrenceRule, occurrence types
  validation.ts             // shared field and cross-field validation
  recurrence.ts             // pure range expansion and occurrence keys
  taskHierarchy.ts          // parent/cycle/order helpers
  calendarProjection.ts     // merge and sort task/event projections
  *.test.ts

mobile/src/
  app/                      // Expo Router screens and SimplyLift-style shell
  context/                  // auth and schedule state providers
  services/                 // mobile repository/local adapter

web/src/
  routes/                   // responsive list, calendar, editor flows
  context/                  // web composition of shared schedule state
  services/                 // web Firebase/local adapter

packages/data/ or client services/
  firebase.ts               // platform initialization
  scheduleRepository.ts     // canonical CRUD, queries, snapshots
  syncEngine.ts             // pending writes and reconciliation
```

The current repository has separate `mobile` and `web` package manifests. Before shared code is introduced, decide whether to convert the root to npm workspaces or use a small root `packages/domain` build consumed through path aliases. The recommendation is npm workspaces because the repository already uses npm lockfiles; the domain package must remain React-free and browser/React Native neutral.

### 3.2 Responsibilities

**Shared domain**

- Owns strict TypeScript types and normalized representations.
- Validates recurrence combinations and task hierarchy invariants.
- Expands a recurrence only for a requested `[rangeStart, rangeEnd)` in the event's IANA timezone.
- Produces stable occurrence keys and calendar projections.
- Contains no Firebase, React, Date.now side effects, navigation, or UI strings other than validation codes.

**Repository**

- Converts Firestore `Timestamp` values to domain dates and back.
- Creates user-scoped documents with client-generated IDs for idempotent retries.
- Reads tasks and event series for a visible range.
- Starts and stops snapshot listeners.
- Uses transactions for parent changes, sibling ordering, and operations that must not lose an existing update.
- Hides Firebase error details from screens while retaining diagnostic errors for logging.

**Schedule provider/store**

- Owns loaded canonical records, visible range, selected view/date, filters, pending mutation state, and alerts.
- Exposes actions such as `createTask`, `completeTask`, `moveTask`, `createEvent`, `updateSeries`, and `deleteOccurrence`.
- Applies optimistic changes and rolls them back or marks them failed when the repository cannot commit.
- Does not duplicate recurrence expansion in a component.

**Screens/components**

- Own temporary draft fields and modal state only.
- Ask for confirmation before destructive actions.
- Render loading, empty, offline/pending, error, and accessibility states.
- Use the existing theme rather than introducing a second visual language.

### 3.3 Query and projection strategy

Tasks and single events can be queried by a visible range. Repeating events require a different query because an old series may have an occurrence inside the current month:

1. Load tasks whose due value intersects the visible range, plus overdue tasks for Today.
2. Load single events whose `startsAt`/`endsAt` can intersect the range.
3. Load repeating series with `startsAt <= rangeEnd`; filter series termination and expand locally. Use a bounded look-back only if a business rule prevents unbounded old series.
4. Expand each series in the event timezone. Clip display results to `[rangeStart, rangeEnd)`.
5. Merge tasks and occurrences into `CalendarItem[]`, preserving canonical IDs and occurrence keys.
6. Apply filters and sort only in the projection layer.

The existing `events` index on `kind` and `startsAt` is a starting point, not proof that all queries will be served. Expect to add indexes after actual Firestore query shapes are written. Avoid a materialized occurrence collection in v1: it creates duplicate truth, has a repair burden, and makes termination edits expensive.

## 4. Proposed canonical data model

The current Firebase README is a useful draft. The following is the target model to implement after the open decisions are answered. All documents are under the authenticated user's namespace:

```text
users/{uid}
  tasks/{taskId}
  events/{eventId}
    exceptions/{occurrenceKey}       // only when occurrence editing is supported
```

All client/server timestamps should be stored as Firestore timestamps. The document ID is the stable entity ID; it must not be used as a display order.

### 4.1 Task

```ts
type TaskStatus = "open" | "completed";

type Task = {
  id: string;
  title: string;                 // trimmed, 1–200 UTF-16 code units
  notes: string;                 // empty string when unused
  status: TaskStatus;
  parentId: string | null;
  position: number;              // sibling ordering key
  dueAt: Timestamp | null;       // actual instant for timed due items
  dueAllDay: boolean;            // date is interpreted in timeZone
  timeZone: string;              // IANA zone; required when dueAt != null
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

**Date semantics:** for an all-day task, `dueAt` represents local midnight in `timeZone` and `dueAllDay` is true. For a timed task, `dueAt` is the actual instant and `dueAllDay` is false. This preserves the existing `dueAt` idea while eliminating the common bug where a date-only due task moves to the previous/next day for users in another timezone. If the product needs a date independent of timezones, use a `dueDate: "YYYY-MM-DD"` field instead; that is a decision in section 11.

**Hierarchy invariants:**

- `parentId` is null for top-level tasks.
- A parent must be owned by the same user, must not be the task itself, and must not be completed/deleted in a way that leaves an invalid child.
- v1 UI allows one subtask level. The repository rejects cycles and can enforce a maximum depth before any write.
- `position` is ordered among siblings only. Use fractional/rank values for ordinary inserts and renumber a sibling group in a transaction when precision becomes unsafe.
- A completion mutation sets `status` and `completedAt` together. Reopening clears `completedAt`.

The current scaffold requires exactly the original fields and cannot validate parent existence or cycles in rules. The implementation must update rules and use repository transactions before shipping hierarchy mutations. If soft deletion is wanted, add `deletedAt` and adjust every query; do not hide deleted records by convention alone.

### 4.2 Event and event series

```ts
type EventKind = "single" | "repeating";

type Event = {
  id: string;
  title: string;                 // trimmed, 1–200
  notes: string;                 // <= 5000
  kind: EventKind;
  startsAt: Timestamp;           // first start for a series
  endsAt: Timestamp | null;      // exclusive for all-day; optional point event
  allDay: boolean;
  timeZone: string;              // IANA zone used for display and expansion
  recurrence: RecurrenceRule | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

For a repeating event, `startsAt` is the first occurrence and `endsAt - startsAt` is the duration for each occurrence. The recurrence rule controls local calendar starts; it does not add elapsed UTC hours. This distinction is required for daylight-saving transitions. For all-day events, use local date boundaries and define `endsAt` as an exclusive boundary (one-day event: start of the following local day).

A future exception document is:

```ts
type EventException = {
  occurrenceKey: string;         // stable original local occurrence key
  action: "cancel" | "override";
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  allDay: boolean | null;
  title: string | null;
  notes: string | null;
  timeZone: string | null;
  updatedAt: Timestamp;
};
```

Only fields with a non-null override are applied. A cancelled occurrence contains no replacement fields. An exception is addressed by the series ID and occurrence key, not by a generated random occurrence document ID.

### 4.3 Recurrence rule

The existing draft is:

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

It is sufficient for a first demo, but not fully flexible: it cannot express the last weekday of a month, a yearly month, or a clear local-date termination. The proposed normalized v1 rule is:

```ts
type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type RecurrenceRule = {
  version: 1;
  frequency: Frequency;
  interval: number;                    // 1–99
  daysOfWeek: number[] | null;         // 0 Sunday … 6 Saturday
  dayOfMonth: number | -1 | null;      // -1 means last calendar day
  monthOfYear: number | null;          // 1–12; used by yearly rules
  weekOfMonth: number | -1 | null;     // 1–5 or -1 (last), paired with daysOfWeek
  termination: {
    type: "never" | "onDate" | "afterOccurrences";
    untilDate: string | null;          // YYYY-MM-DD in event timeZone
    count: number | null;               // includes the first occurrence
  };
};
```

Normalization rejects ambiguous combinations instead of guessing:

- Daily: every `interval` days; weekday and month selectors are null.
- Weekly: one or more `daysOfWeek`; `weekOfMonth`, `dayOfMonth`, and `monthOfYear` are null. `interval` means every N weeks.
- Monthly: either a `dayOfMonth` (1–31 or -1) or `weekOfMonth` plus one or more weekdays, never both. A day such as the 31st that does not exist in a month is skipped, not silently clamped, unless the user selects another behavior.
- Yearly: `monthOfYear` plus `dayOfMonth`, or `monthOfYear` plus `weekOfMonth` and weekdays.
- `never` has both termination values null; `onDate` has only `untilDate`; `afterOccurrences` has only a positive `count`.
- `untilDate` is inclusive in the event timezone. `count` includes the seed/first occurrence.

This structured representation is preferable to storing a raw RRULE string because both clients can validate and explain it, and Firestore rules can constrain its shape. The domain expander may translate it internally to a well-tested recurrence algorithm. If a future import/export requirement demands full RFC 5545 support, add a versioned parser rather than weakening the v1 model.

The existing Firebase rule currently permits only positive `dayOfMonth` and a timestamp `until`. Before writing production data, either adopt the target fields and migrate the draft or explicitly freeze the simpler rule. Do not allow the clients and rules to accept different recurrence semantics.

### 4.4 Calendar projection types

```ts
type CalendarItem =
  | {
      type: "task";
      id: string;
      taskId: string;
      title: string;
      startsAt: Date | null;
      allDay: boolean;
      completed: boolean;
      parentId: string | null;
    }
  | {
      type: "event";
      id: string;
      eventId: string;
      occurrenceKey: string;          // event ID for single events
      title: string;
      startsAt: Date;
      endsAt: Date | null;
      allDay: boolean;
      isRepeating: boolean;
    };
```

The projection must retain canonical IDs so a tap can open the correct editor. It must never make a calculated occurrence look like an independently persisted event.

## 5. Synchronization and data consistency

### 5.1 Source of truth and local-first behavior

Follow SimplyLift's optional-account model unless the user decides that Schedule must require authentication:

- Signed out: keep tasks, event series, exceptions, and drafts in a local store. AsyncStorage is acceptable for a small first prototype, but a SQLite-backed store is safer once range queries, ordering, and an outbox are required.
- Signed in: use Firestore as the canonical shared store, enable the platform's offline cache where supported, and keep a local draft/outbox so an edit is not lost while offline.
- On sign-in: offer a clear merge of local guest data into the account. Use stable client IDs and an import marker so retries are idempotent. Do not silently discard guest records.
- On sign-out: stop listeners, clear user-scoped in-memory data, and restore only the signed-out local account. Never let a previous user's tasks flash in the next user's shell.

The existing Firebase foundation is authenticated-only. That is appropriate for Firestore security, but it does not by itself implement the signed-out local mode.

### 5.2 Mutation protocol

1. Validate and normalize the draft in shared domain code.
2. Generate an ID client-side and add an optimistic local record with `syncState: pending` in memory/local cache.
3. Write with `setDoc`/transaction and server timestamps. Use the same ID on retry.
4. Let the snapshot listener reconcile the acknowledged record. Do not append a second copy from the write response.
5. On failure, retain the draft/outbox entry, mark it failed, and offer Retry/Discard with a readable error.
6. For deletes, use a tombstone or an explicit outbox delete until the server acknowledges it; otherwise a stale snapshot can resurrect the item.

The provider should expose pending state to the UI (`Saving`, `Saved`, `Offline`, or `Retry`) without making every component understand Firestore metadata.

### 5.3 Conflict policy

Use field-level last-write-wins for ordinary title/notes edits initially, but use transactions for:

- changing `parentId` or sibling `position`;
- completing/reopening a task when a parent summary is calculated from children;
- creating an exception or splitting a series;
- deleting a series while an occurrence edit is pending.

A later phase may add revision numbers or a conflict sheet. A Firestore `updatedAt` alone cannot explain which user's edit won. Every conflict policy should be visible in a test fixture with two clients.

### 5.4 Recurrence synchronization

Only the event series and exception documents synchronize. Occurrence expansion is deterministic and local. Given the same series, timezone, range, and exceptions, mobile and web must return the same occurrence keys and dates. Add cross-platform fixture tests for:

- daylight-saving start and end;
- monthly 29/30/31 rules;
- last weekday rules;
- yearly leap-day behavior;
- `untilDate` inclusion;
- count including the first occurrence;
- an exception moved outside the visible range.

Do not use device local time as the recurrence authority. Store the event's IANA `timeZone` and pass an explicit clock/range into expansion tests.

### 5.5 Security and operational boundaries

The current rules correctly scope reads/writes to `request.auth.uid == userId`, validate title lengths and enum values, and reject unknown fields. They do not currently validate parent ownership, cycles, exception documents, or the proposed recurrence extensions. Before client wiring:

- add rules for `events/{eventId}/exceptions/{occurrenceKey}`;
- decide whether users can create/update their own `users/{uid}` profile fields;
- prevent clients from changing immutable `createdAt` and identity fields;
- test rules with the emulator, including cross-user reads/writes and malformed recurrence combinations;
- add indexes only from observed queries;
- make reminders, invitations, sharing, and server-side materialization separate security designs.

## 6. UI and interaction flows

### 6.1 Shared visual and interaction language

Use the captured SimplyLift language rather than inventing a calendar-specific design system:

- white canvas and surfaces, black ink, 2 px black outlines, 8 px cards/controls;
- uppercase heavy labels, system sans, monospace for times and durations;
- `#34C759` for positive/complete/pressed states, `#FF3B30` for destructive/error, `#5856D6` for selected/accent state, `#F2F2F7` for secondary fields;
- direct labels such as `ADD TASK`, `SAVE`, `DONE`, `REPEAT`, `DELETE`;
- bottom sheets/alerts on mobile and outlined panels/dialogs on web;
- safe-area-aware fixed action shelf on iPhone and responsive sticky action areas on web;
- every async action has loading/disabled behavior and a human-readable failure path.

A task checkmark and event marker should use semantic color sparingly. Color must not be the only distinction; use text, icons, and accessible state labels too.

### 6.2 Today and task list

1. App opens to Today with the current local date and a clear `ADD TASK` action.
2. Today shows overdue tasks first, then due tasks, then timed events in chronological order. Unscheduled tasks remain available from the task list, not hidden in an empty calendar.
3. Tapping the task row checks/unchecks it optimistically. Undo is available briefly; a full destructive confirmation is not needed for completion.
4. Tapping the title opens a task sheet/editor with title, notes, due date/time, parent, and save/cancel.
5. `ADD SUBTASK` is available from a parent detail view. The editor displays the parent context and does not permit a task to select itself.
6. Reordering is explicit drag/reorder on web and a move action or drag gesture on iPhone. Save ordering only after local validation.
7. Swipe/delete or overflow/delete requires confirmation and states whether subtasks will be deleted, detached, or preserved.
8. Empty states are factual: `NO TASKS DUE TODAY.` with a single next action.

### 6.3 Calendar views

Provide one shared projection with platform-appropriate interaction:

- **Agenda:** default mobile view; grouped by date with all-day/due items first and timed events below.
- **Day:** mobile option and web option; vertical time grid with an all-day section.
- **Week:** web primary view; seven columns, timed event blocks, all-day row, and current-time indicator.
- **Month:** web and mobile option; compact dots/counts with a selected-day agenda rather than unreadable tiny event text.

Navigation uses previous/next and `TODAY`. The selected date/range is part of client state and is not persisted to Firestore. Filters can include tasks/events, completed/open tasks, and a future color/category filter only if categories are added to the model.

Selecting an event opens a detail sheet. Selecting a task opens task detail. Selecting an empty time slot starts a timed event draft with that local date/time. Dragging/resizing is a web enhancement and should call the same validated mutation actions as the form.

### 6.4 Single event flow

1. Tap `ADD EVENT` from Today, a calendar slot, or the global action shelf.
2. Enter title; optionally enter notes.
3. Choose all-day or timed. For timed events, choose start and end/duration; reject an end before start.
4. Select timezone only when the product supports a choice; otherwise show the device/account timezone and make the rule explicit.
5. Choose `DOES NOT REPEAT` or `REPEAT`.
6. Review a compact summary and tap `SAVE`.
7. Return to the originating view and select the new event by canonical ID.

Canceling a dirty form uses SimplyLift's explicit `Keep Editing` / `Discard` pattern.

### 6.5 Repeating event flow

The repeat builder should be progressive rather than a raw rules editor:

- frequency: daily, weekly, monthly, yearly;
- every: interval number;
- frequency-specific selector: weekdays, day of month, last day, or ordinal weekday;
- termination: never, on date, after N occurrences;
- a short human-readable summary (`EVERY 2 WEEKS ON MONDAY AND FRIDAY, UNTIL 2026-10-01`);
- a preview of the next five occurrences before save.

Validation must explain why a rule is invalid (`Choose at least one weekday`, `This yearly rule needs a month`, `The end date must not precede the first occurrence`). A never-ending series is expanded only for the visible window and must never be materialized without a cap.

For an existing series:

- `Edit series` changes the canonical rule and re-expands future ranges.
- `Edit this occurrence` creates an override exception.
- `Skip this occurrence` creates a cancellation exception.
- `Edit this and future` splits the series at the selected occurrence: the old series receives an end boundary and a new series begins at the occurrence with a new rule. This is a later milestone if not required for v1.
- Deleting a series confirms `Delete entire series`; deleting one occurrence confirms `Skip this occurrence`.

### 6.6 Auth, offline, and failure flows

- Keep the main schedule usable while auth state resolves with a clear loading state, following SimplyLift's centered loading treatment.
- If signed out, label data as `ON THIS DEVICE` and offer sign-in for sync.
- If offline, allow local edits and show pending status; do not show a false `Saved` state.
- If a remote write fails, preserve the draft and provide Retry/Discard. Never clear the form before the repository acknowledges success.
- If a snapshot listener fails, retain the last good data, show a non-blocking sync error, and permit retry.

## 7. Implementation milestones

### Milestone 0 — Decide and freeze the contract

- Answer the blocking questions in section 11.
- Choose guest/local behavior, default calendar views, timezone/all-day semantics, recurrence scope, and deletion policy.
- Update `firebase/README.md`, Firestore rules, indexes, and example fixtures to the selected target schema.
- Add a schema/version note and migration plan for the current scaffold fields.

**Exit:** a written schema and rule test plan with no unresolved blocking ambiguity.

### Milestone 1 — Shared domain foundation

- Add the shared workspace/package and strict models.
- Implement normalization and validation for tasks, hierarchy, events, and recurrence.
- Implement deterministic range expansion and occurrence keys.
- Implement calendar projection and sort/filter selectors.
- Add unit/property tests for edge dates, DST fixtures, malformed rules, task cycles, and position updates.

**Exit:** domain tests pass in Node without React Native, browser, or Firebase.

### Milestone 2 — Firebase/auth/repository/sync

- Add platform Firebase initialization from the existing env contracts.
- Add auth provider and user-scoped repositories.
- Implement snapshot subscriptions, visible-range queries, local cache/outbox, optimistic writes, retry state, and sign-in migration.
- Add emulator rule tests for ownership, malformed data, immutable fields, and exceptions.

**Exit:** two clients can sign in to the emulator, create/edit/delete a task and event, and observe the change on the other client without duplicate records.

### Milestone 3 — Tasks and subtasks

- Build Today/task list, task editor, completion/reopen, subtask creation, parent detail, ordering, and deletion flows.
- Add mobile sheets and safe-area action shelf; add web responsive panels and keyboard behavior.
- Test loading, empty, optimistic, failure, offline, confirmation, and accessibility states.

**Exit:** a user can create an unscheduled task, schedule it, create a subtask, complete/reopen both, reorder siblings, and recover from a failed write.

### Milestone 4 — Single events and calendar projections

- Build agenda/day/week/month projection against real repository data.
- Build single event editor/detail/delete.
- Implement all-day/timed rendering, timezone display, overlap layout, date navigation, and task/event filters.
- Add responsive web keyboard interactions and mobile date/time controls.

**Exit:** a single event created on either client appears correctly in all supported views and survives timezone/DST fixture tests.

### Milestone 5 — Repeating events and exceptions

- Build progressive repeat builder and summary/preview.
- Implement daily/weekly/monthly/yearly expansion and all three termination conditions.
- Add series edit/delete; add occurrence cancellation/override and series splitting only if selected in Milestone 0.
- Update rules, indexes, and emulator fixtures for exception subcollections.

**Exit:** recurrence fixtures produce identical mobile/web occurrence keys and dates; an edited occurrence does not mutate unrelated occurrences.

### Milestone 6 — Product hardening and release readiness

- Add analytics only if approved, accessibility audit, performance checks, large-data pagination, and offline recovery tests.
- Review copy against SimplyLift's direct voice.
- Validate iPhone safe-area/keyboard behavior and web breakpoints.
- Document backup/export, account deletion, monitoring, and migration rollback.

**Exit:** release checklist is green on physical iPhone, current Safari/Chrome, and Firebase emulator/selected project.

## 8. Risks and mitigations

| Risk | Consequence | Mitigation |
| --- | --- | --- |
| Timezone and DST mistakes | Events shift dates or durations | Store IANA zone, expand in that zone, use local calendar arithmetic, test DST boundaries. |
| Monthly/yearly ambiguity | Users get missing or surprising occurrences | Use explicit rule combinations, preview next occurrences, decide skip/clamp/leap-day behavior. |
| Series occurrence editing | A simple update changes every occurrence | Model exceptions/split series before exposing per-occurrence edit. |
| Firestore query limits/cost | Calendar becomes slow or reads too many series | Query bounded ranges, paginate tasks/events, cache expanded windows, measure read counts. |
| Snapshot overwrites optimistic edits | User thinks a change vanished | Track pending writes/outbox entries and reconcile acknowledged IDs rather than replacing blindly. |
| Task cycles and ordering conflicts | Broken hierarchy or unstable lists | Transactional parent changes, cycle/depth validation, sibling-only rank keys. |
| Guest-to-account migration | Duplicate or lost local records | Client IDs, idempotent import marker, explicit merge summary, retryable migration. |
| Divergent mobile/web implementations | Same rule renders differently | One shared domain package and cross-platform fixtures. |
| Scope creep into a calendar suite | Core task/event flows remain unfinished | Keep reminders, sharing, invitations, imports, and materialized occurrences out of v1 unless explicitly selected. |
| Existing scaffold schema becomes production data | Later migration is disruptive | Freeze target schema before client writes and version any migration. |
| Accessibility is treated as polish | Calendar is unusable without pointer/color | Keyboard navigation, screen-reader labels, non-color state, and alternate agenda view are acceptance criteria. |
| Library choice dominates delivery | Platform-specific calendar bugs/blocking upgrades | Start with simple custom agenda/list and a narrow web time grid; evaluate libraries only against the required interactions. |

## 9. Testing strategy

### Pure domain tests

- Task title/notes normalization and bounds.
- Parent ownership, self-parent, cycle, depth, and sibling order.
- Completion/reopen timestamp semantics.
- Single event range intersection and all-day boundaries.
- Every recurrence frequency and interval.
- Weekly multiple weekdays and week boundaries.
- Monthly 29/30/31, last day, ordinal weekday, and skipped invalid dates.
- Yearly month/day, leap day, and ordinal weekday.
- Never/on-date/after-count termination, including inclusive date and count semantics.
- DST spring-forward/fall-back and zones with non-hour offsets.
- Stable occurrence key generation and exception application.
- Identical fixtures consumed by both app builds.

### Repository/rules tests

- Authenticated owner can create/read/update/delete their own data.
- Another user cannot read/write a task, event, or exception by guessing IDs.
- Unknown fields, invalid enums, invalid timestamps, invalid recurrence combinations, and immutable timestamps are rejected.
- Parent ownership/cycle protections are enforced by repository transaction and tested in race scenarios.
- Retry of a timed-out client write does not duplicate a record.
- Snapshot plus pending local mutation converges to one visible record.

### UI/acceptance tests

At minimum, test each flow's populated, empty, loading, disabled, error, offline, keyboard, modal dismissal, and destructive-confirmation states. The reference has strong pure utility tests but no component/integration suite; Simply Schedule should add a small cross-platform behavior suite before calendar complexity grows.

## 10. Explicit non-goals for this design

Unless the user selects them in the questions below, do not implement these as hidden assumptions:

- shared calendars, invitations, permissions, or multi-user task ownership;
- reminders, push notifications, alarms, or background recurrence materialization;
- task recurrence (the current request only requires flexible repeating events);
- natural-language date parsing;
- import/export to Google Calendar, iCalendar, or external task systems;
- attachments, comments, labels, priorities, estimates, or time tracking;
- dark mode or a new brand system;
- a server-side occurrence collection.

## 11. Specific questions requiring user decisions

The following questions are intentionally concrete. Defaults are recommendations, not silent product decisions. Questions marked **blocking** should be answered before Milestone 0 exits.

### Account, ownership, and data lifecycle

1. **[Blocking] Must a user sign in before using Schedule, or should it inherit SimplyLift's signed-out local mode plus optional sync?** Recommended default: local guest mode with explicit `ON THIS DEVICE` labeling.
2. **[Blocking] Is each account strictly private, or will shared calendars/tasks be part of the first data model?** Recommended default: private per-user data; do not add sharing fields until needed.
3. Which Firebase Auth providers are required first: email/password, Apple, Google, anonymous auth, or another provider?
4. When a guest signs in, should local data be merged automatically, selected item-by-item, or discarded after confirmation? What wins on an apparent duplicate?
5. Should account deletion permanently delete all tasks, events, exceptions, and local cache immediately, or provide an export/grace period?
6. Are multiple profiles/accounts on one iPhone required, or is one active account per installation enough?

### Task and subtask semantics

7. **[Blocking] Is a task only due (a point/date), or does it need a scheduled start, duration, or time block?** Recommended v1: due date/time only; events represent blocks.
8. **[Blocking] Should subtasks be limited to one level, or can subtasks contain subtasks?** Recommended v1: one level, with a repository depth guard.
9. When a parent task is completed, should open subtasks remain open, be completed automatically, or prompt the user? Recommended default: remain open; offer an explicit prompt/action.
10. When a parent is deleted, should subtasks be deleted, detached as top-level tasks, or block deletion until handled?
11. Can a subtask have a different due date/time from its parent? If both have dates, which appears first or controls parent display?
12. Should completed tasks remain in Today/calendar, move to a completed section, or disappear immediately?
13. Does reopening a task clear `completedAt`, and should completion history/audit be retained?
14. Is task ordering manual only, or should the product support sorting by due date, title, or completion? If both, is sort a view preference or persisted per user?
15. Are notes plain text, Markdown, or rich text? Is 5,000 characters an acceptable limit?
16. Do tasks need priority, labels, projects, estimates, or color in the first release? If yes, which are required for the calendar projection?
17. Should an unscheduled task appear in a separate inbox, the Today view, or both?

### Calendar and timezone behavior

18. **[Blocking] What is the default view on iPhone and web?** Recommended default: mobile agenda, web week, with Today as the shared landing route.
19. Which calendar views are required for launch: agenda, day, week, month? Is a year view unnecessary?
20. **[Blocking] What day starts the week: Sunday, Monday, locale-specific, or user-configured?**
21. **[Blocking] Which timezone governs all-day dates and recurrence: device timezone, account timezone, or a per-event timezone?** Recommended default: per-event IANA timezone initialized from the device; show it in advanced settings.
22. Should a timed event retain its original timezone when the user travels, or float with the device timezone?
23. For all-day events, is the end date inclusive or exclusive? Recommended implementation: exclusive internal end boundary, inclusive user-facing date range.
24. Are all-day tasks and due-date tasks visually equivalent to all-day events, or should they have a distinct section/marker?
25. If a task has a due time but no duration, should it render as a dot/point, a default-height block, or only in agenda/list views?
26. How should overlapping timed events render: side-by-side, stacked, or with a maximum lane count and overflow?
27. Should past events and completed tasks be visible by default in day/week/month views?
28. Are filters required at launch (tasks/events, open/completed, selected categories), and should filter state persist per device/account?
29. Is drag-to-create, drag-to-move, or resize required on web launch, or are forms sufficient?
30. Should keyboard shortcuts and full keyboard calendar navigation be acceptance requirements for web?

### Event fields and recurrence

31. **[Blocking] Is an event end time required, or are point events valid?** Recommended default: allow a point event, but require `endsAt > startsAt` when an end is supplied.
32. Should an event support a separate duration field, or should duration always be derived from start/end?
33. **[Blocking] Which recurring patterns are required at launch?** Confirm whether daily, weekly multi-day, monthly day-of-month, monthly ordinal weekday, and yearly rules are all needed.
34. For a weekly rule, should `interval = 2` mean every two weeks from the first occurrence while retaining selected weekdays? Recommended default: yes.
35. For a monthly day 29/30/31 that does not exist, should the occurrence be skipped, clamped to the last day, or offer a choice? Recommended default: skip, with a preview warning.
36. Should monthly rules support `last day`, `first/second/third/fourth/last weekday`, or only a numeric day? Recommended default for flexible v1: both numeric day and ordinal weekday.
37. For yearly rules, are leap-day events allowed, and if so should they run only in leap years or on February 28/last day in other years?
38. **[Blocking] Does an `onDate` termination include that date?** Recommended default: inclusive in the event timezone.
39. **[Blocking] Does `afterOccurrences` count the first occurrence?** Recommended default: yes.
40. Should `never` be genuinely unbounded, or should the UI require a maximum horizon such as two years while keeping the rule open-ended? Recommended default: unbounded rule, bounded range expansion.
41. Can a repeating event change timezone after creation? If yes, are existing occurrence exceptions interpreted in the old or new zone?
42. **[Blocking] Must users edit or delete one occurrence independently?** If yes, approve the exception subcollection and the `this / this and future / entire series` flow before launch.
43. If `this and future` is supported, should the implementation split into two series or store a range-aware exception? Recommended default: split series for simpler deterministic expansion.
44. When an entire series is edited, do prior exceptions remain attached, get discarded with a warning, or migrate where possible?
45. Should a repeated event whose first occurrence is in the past be shown in future ranges when its termination permits it? Recommended default: yes.
46. Are reminders, notifications, event colors, locations, URLs, attendees, or attachments required now? If any are, specify their fields and privacy rules rather than adding them opportunistically.

### Sync, storage, and engineering choices

47. **[Blocking] Is Firestore offline persistence sufficient, or is a durable local outbox/SQLite cache a release requirement?** Recommended default: durable pending writes for user-entered drafts, Firestore cache for synced records.
48. On two-device conflict, should last write win, should the app show a conflict, or should fields merge? Recommended v1: last write wins for text, transactions for hierarchy/series operations, with telemetry/logging.
49. Should deletes be hard deletes or recoverable archive/tombstones? This changes query rules, storage cost, and undo behavior.
50. Should `createdAt` and `updatedAt` be server-only, and is a client-visible revision number required for conflict diagnostics?
51. Should the current draft Firebase schema be migrated before any client writes, or is compatibility with the existing `until` timestamp/limited recurrence shape required?
52. Is npm workspaces the desired shared-package setup, or should mobile/web remain independent packages with duplicated type imports?
53. Is a third-party calendar component/library allowed, and if so what platforms/license/interaction constraints apply? Recommended default: shared domain plus simple custom agenda first.
54. What browser and iOS versions must be supported, and are physical-device offline tests part of release acceptance?
55. What test level is required before product review: domain/unit only, repository emulator tests, or automated mobile/web interaction tests as well?
56. Should analytics/crash reporting be added, and are there privacy or data-retention requirements for titles and notes?

## 12. Recommended immediate next action

Answer the **blocking** questions, then update the draft Firebase schema/rules before wiring either client. The safest implementation sequence is:

1. freeze timezone, task due semantics, recurrence grammar, and occurrence-edit scope;
2. add the shared pure domain package and exhaustive recurrence fixtures;
3. add repository/auth/sync against the emulator;
4. implement tasks/subtasks;
5. implement single events and agenda/day/week/month projections;
6. add repeating events and exceptions only to the extent approved.

This sequence preserves SimplyLift's proven separation of UI, provider, repository, and pure logic while addressing the new product's hardest correctness problems—timezones, recurrence, hierarchy, and offline convergence—before they are hidden inside screen components.
