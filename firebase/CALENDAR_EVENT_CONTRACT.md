# Simply Schedule calendar/event contract

**Contract version:** 1

**Clients:** React web and React Native iOS
**Canonical store:** Cloud Firestore in the Firebase project selected by `.firebaserc`

This document is the cross-platform contract for calendar viewing and the later event-creation/recurrence phase. Firestore stores canonical event documents; month, agenda, day, and week displays are client projections and are never written as separate documents.

## Ownership and path

```text
users/{uid}/events/{eventId}
```

`uid` must equal the authenticated Firebase user's UID. The document ID is the stable event/series ID. Clients must not add an `id` field to the document.

Both calendar clients use Firebase Anonymous Auth when their platform Firebase configuration is present. Anonymous auth is a view-phase identity mechanism, not a cross-device sharing model; production account/linking behavior can replace it without changing event paths.

## Event document

Every event has exactly these fields:

| Field | Firestore type | Contract |
| --- | --- | --- |
| `title` | string | Trimmed display title, 1–200 characters. |
| `notes` | string | Plain text, empty when unused, at most 5,000 characters. |
| `kind` | string | `single` or `repeating`. |
| `startsAt` | timestamp | Timed start instant, or local midnight in `timeZone` for an all-day event. For a series, this is the seed/first occurrence. |
| `endsAt` | timestamp or null | Exclusive end. Must be after `startsAt` when present. Required for all-day events; null means a timed point event. For a series, `endsAt - startsAt` is each occurrence's duration. |
| `allDay` | boolean | Whether the item uses all-day date boundaries. |
| `timeZone` | string | IANA zone used for all-day boundaries and recurrence, such as `America/Los_Angeles`. |
| `recurrence` | map or null | Null for `single`; the versioned rule below for `repeating`. |
| `createdAt` | timestamp | Lifecycle timestamp. Event-creation clients should set this with a server timestamp and preserve it on updates. |
| `updatedAt` | timestamp | Lifecycle timestamp. Event-creation clients should refresh it with a server timestamp on mutation. |

### Date semantics

- Calendar ranges are half-open: `[rangeStart, rangeEnd)`.
- Timed events are absolute instants and display in the viewer's calendar zone.
- All-day starts/ends are interpreted in the event's IANA `timeZone`; `endsAt` is exclusive. A one-day all-day event starts at local midnight and ends at the next local midnight.
- A timed event with `endsAt: null` is a point event.
- A timed event intersects a day when `startsAt < dayEnd` and `endsAt > dayStart`; a point event belongs to the day containing `startsAt`.
- The current calendar-view pass projects `kind == "single"` only on both platforms. Neither client renders a repeating series seed as if it were the complete series. Bounded recurrence expansion is part of the later recurrence phase.

## Recurrence map, version 1

Every recurrence map has all fields below. Non-applicable selectors are explicitly `null` so web, iOS, and Firestore rules reject ambiguous data.

```ts
type RecurrenceRuleV1 = {
  version: 1;
  frequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly";
  interval: number;                 // integer 1–99
  daysOfWeek: number[] | null;      // 0 Sunday … 6 Saturday
  dayOfMonth: number | -1 | null;   // 1–31; -1 means last day
  weekOfMonth: number | -1 | null;  // 1–5; -1 means last
  monthOfYear: number | null;       // 1–12
  termination: {
    type: "never" | "onDate" | "afterOccurrences";
    until: Timestamp | null;
    count: number | null;
  };
};
```

Legal selector combinations:

| Frequency | Required | Must be null |
| --- | --- | --- |
| `hourly` / `daily` | no selectors | `daysOfWeek`, `dayOfMonth`, `weekOfMonth`, `monthOfYear` |
| `weekly` | one or more `daysOfWeek` | `dayOfMonth`, `weekOfMonth`, `monthOfYear` |
| `monthly` numeric day | `dayOfMonth` | `daysOfWeek`, `weekOfMonth`, `monthOfYear` |
| `monthly` ordinal weekday | `weekOfMonth` and one or more `daysOfWeek` | `dayOfMonth`, `monthOfYear` |
| `yearly` numeric day | `monthOfYear` and `dayOfMonth` | `daysOfWeek`, `weekOfMonth` |
| `yearly` ordinal weekday | `monthOfYear`, `weekOfMonth`, and one or more `daysOfWeek` | `dayOfMonth` |

Termination semantics:

- `never`: `until` and `count` are null. Expansion is still bounded to the visible client range.
- `onDate`: `until` is non-null and inclusive by occurrence start (`occurrence.startsAt <= until`); `count` is null.
- `afterOccurrences`: positive integer `count`, including the seed/first occurrence; `until` is null.
- Missing monthly days (for example day 31 in April) are skipped, not clamped.
- Calendar arithmetic happens in `timeZone`; elapsed UTC hours must not replace local calendar arithmetic for daily/monthly/yearly rules.

### Required later-phase pattern encodings

```ts
// First of every month
{ frequency: "monthly", interval: 1, dayOfMonth: 1,
  daysOfWeek: null, weekOfMonth: null, monthOfYear: null }

// Third Friday of every month
{ frequency: "monthly", interval: 1, daysOfWeek: [5], weekOfMonth: 3,
  dayOfMonth: null, monthOfYear: null }

// Every other day / every three days
{ frequency: "daily", interval: 2 /* or 3 */, daysOfWeek: null,
  dayOfMonth: null, weekOfMonth: null, monthOfYear: null }

// Every five hours
{ frequency: "hourly", interval: 5, daysOfWeek: null,
  dayOfMonth: null, weekOfMonth: null, monthOfYear: null }
```

Each example also includes `version: 1` and a complete `termination` map in Firestore.

## Query and projection contract

Each platform's view-only event repository subscribes to:

```text
users/{uid}/events
  where kind == "single"
  order by startsAt ascending
```

The existing `kind + startsAt` index supports this query. The client converts every Firestore timestamp at the repository boundary, validates kind/recurrence invariants, and keeps Firestore details out of calendar components.

This initial all-single-events subscription favors a simple correct snapshot listener. Before large-data release, replace it on both platforms with visible-range single-event queries plus a bounded repeating-series query/expander. Preserve event IDs throughout projections so later details/editors address the canonical document.

## View-phase seed behavior

- Missing/incomplete platform Firebase configuration selects an explicit `LOCAL PREVIEW` with the same in-memory single-event fixtures. Preview events are never uploaded.
- Web uses `VITE_FIREBASE_*`; iOS uses `EXPO_PUBLIC_FIREBASE_*`. Both target the Firebase project selected by `.firebaserc` and the emulator ports in `firebase.json`.
- When each platform's `*_FIREBASE_USE_EMULATORS=true` and `*_FIREBASE_SEED_EMULATOR=true`, an empty anonymous user's event collection receives the same minimal preview events. This is development-only proof data.
- Production Firebase data is read-only in this pass on both clients. There is no event-creation, edit, delete, or recurrence UI yet.
