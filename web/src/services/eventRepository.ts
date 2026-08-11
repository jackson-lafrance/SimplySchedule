import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import type {
  CalendarEvent,
  CreateEventInput,
  RecurrenceFrequency,
  RecurrenceRule,
  RecurrenceTerminationType,
  SingleEvent,
  VisibleRange,
} from "@/domain/events";

const FREQUENCIES: RecurrenceFrequency[] = [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
];
const TERMINATION_TYPES: RecurrenceTerminationType[] = [
  "never",
  "onDate",
  "afterOccurrences",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(
  data: Record<string, unknown>,
  field: string,
  maximumLength: number,
) {
  const value = data[field];
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maximumLength
  ) {
    throw new Error(`Event ${field} must be a valid non-empty string.`);
  }
  return value.trim();
}

function optionalString(
  data: Record<string, unknown>,
  field: string,
  maximumLength: number,
) {
  const value = data[field];
  if (typeof value !== "string" || value.length > maximumLength) {
    throw new Error(`Event ${field} must be a valid string.`);
  }
  return value;
}

function timeZoneString(data: Record<string, unknown>) {
  const timeZone = requiredString(data, "timeZone", 100);

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error("Event timeZone must be a valid IANA zone.");
  }

  return timeZone;
}

function dateValue(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (isRecord(value) && typeof value.toDate === "function") {
    const date = (value.toDate as () => unknown)();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(`Event ${field} must be a Firestore timestamp.`);
}

function nullableDateValue(value: unknown, field: string) {
  return value === null ? null : dateValue(value, field);
}

function nullableInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
  allowLast = false,
) {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    ((allowLast && value === -1) || (value >= minimum && value <= maximum))
  ) {
    return value;
  }

  throw new Error(`Event recurrence ${field} is invalid.`);
}

function nullableWeekdays(value: unknown) {
  if (value === null) {
    return null;
  }

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 7 ||
    value.some(
      (day) =>
        !Number.isInteger(day) || (day as number) < 0 || (day as number) > 6,
    )
  ) {
    throw new Error("Event recurrence daysOfWeek is invalid.");
  }

  return [...new Set(value as number[])].sort((left, right) => left - right);
}

function validSelectorCombination(rule: RecurrenceRule) {
  const noSelectors =
    rule.daysOfWeek === null &&
    rule.dayOfMonth === null &&
    rule.weekOfMonth === null &&
    rule.monthOfYear === null;

  if (rule.frequency === "hourly" || rule.frequency === "daily") {
    return noSelectors;
  }

  if (rule.frequency === "weekly") {
    return (
      rule.daysOfWeek !== null &&
      rule.dayOfMonth === null &&
      rule.weekOfMonth === null &&
      rule.monthOfYear === null
    );
  }

  const hasNumericDay =
    rule.dayOfMonth !== null &&
    rule.weekOfMonth === null &&
    rule.daysOfWeek === null;
  const hasOrdinalWeekday =
    rule.dayOfMonth === null &&
    rule.weekOfMonth !== null &&
    rule.daysOfWeek !== null;

  if (rule.frequency === "monthly") {
    return rule.monthOfYear === null && (hasNumericDay || hasOrdinalWeekday);
  }

  return rule.monthOfYear !== null && (hasNumericDay || hasOrdinalWeekday);
}

function decodeRecurrence(value: unknown): RecurrenceRule {
  if (!isRecord(value) || !isRecord(value.termination)) {
    throw new Error("Repeating event recurrence is invalid.");
  }

  const frequency = value.frequency;
  const interval = value.interval;
  const terminationType = value.termination.type;

  if (!FREQUENCIES.includes(frequency as RecurrenceFrequency)) {
    throw new Error("Event recurrence frequency is invalid.");
  }
  if (
    typeof interval !== "number" ||
    !Number.isInteger(interval) ||
    interval < 1 ||
    interval > 99
  ) {
    throw new Error("Event recurrence interval is invalid.");
  }
  if (
    !TERMINATION_TYPES.includes(terminationType as RecurrenceTerminationType)
  ) {
    throw new Error("Event recurrence termination is invalid.");
  }
  if (value.version !== 1) {
    throw new Error("Event recurrence version is not supported.");
  }

  const until = nullableDateValue(
    value.termination.until,
    "recurrence termination until",
  );
  const count = value.termination.count;

  if (
    (terminationType === "never" && (until !== null || count !== null)) ||
    (terminationType === "onDate" && (until === null || count !== null)) ||
    (terminationType === "afterOccurrences" &&
      (until !== null ||
        typeof count !== "number" ||
        !Number.isInteger(count) ||
        count < 1))
  ) {
    throw new Error("Event recurrence termination fields are invalid.");
  }

  const rule: RecurrenceRule = {
    version: 1,
    frequency: frequency as RecurrenceFrequency,
    interval,
    daysOfWeek: nullableWeekdays(value.daysOfWeek),
    dayOfMonth: nullableInteger(value.dayOfMonth, "dayOfMonth", 1, 31, true),
    weekOfMonth: nullableInteger(value.weekOfMonth, "weekOfMonth", 1, 5, true),
    monthOfYear: nullableInteger(value.monthOfYear, "monthOfYear", 1, 12),
    termination: {
      type: terminationType as RecurrenceTerminationType,
      until,
      count: typeof count === "number" ? count : null,
    },
  };

  if (!validSelectorCombination(rule)) {
    throw new Error("Event recurrence selectors do not match its frequency.");
  }

  return rule;
}

export function decodeEventDocument(
  id: string,
  value: unknown,
): CalendarEvent {
  if (!isRecord(value)) {
    throw new Error(`Event ${id} is not a document.`);
  }

  const kind = value.kind;
  if (kind !== "single" && kind !== "repeating") {
    throw new Error(`Event ${id} has an invalid kind.`);
  }

  const allDay = value.allDay;
  if (typeof allDay !== "boolean") {
    throw new Error(`Event ${id} allDay must be a boolean.`);
  }

  const base = {
    id,
    title: requiredString(value, "title", 200),
    notes: optionalString(value, "notes", 5_000),
    startsAt: dateValue(value.startsAt, "startsAt"),
    endsAt: nullableDateValue(value.endsAt, "endsAt"),
    allDay,
    timeZone: timeZoneString(value),
    createdAt: dateValue(value.createdAt, "createdAt"),
    updatedAt: dateValue(value.updatedAt, "updatedAt"),
  };
  if (base.allDay && !base.endsAt) {
    throw new Error(`All-day event ${id} must have an exclusive end.`);
  }
  if (base.endsAt && base.endsAt <= base.startsAt) {
    throw new Error(`Event ${id} must end after it starts.`);
  }

  if (kind === "single") {
    if (value.recurrence !== null) {
      throw new Error(`Single event ${id} cannot have recurrence.`);
    }
    return { ...base, kind, recurrence: null };
  }

  return { ...base, kind, recurrence: decodeRecurrence(value.recurrence) };
}

function decodeSnapshot(document: QueryDocumentSnapshot<DocumentData>) {
  return decodeEventDocument(
    document.id,
    document.data({ serverTimestamps: "estimate" }),
  );
}

/**
 * Keeps canonical reads tied to the displayed range. Point and duration events
 * are queried separately so cross-boundary events remain visible; old repeating
 * seeds are included only when they can still expand before range end.
 */
export function subscribeToEventsInRange(
  db: Firestore,
  userId: string,
  range: VisibleRange,
  onEvents: (events: CalendarEvent[]) => void,
  onError: (error: Error) => void,
) {
  const events = collection(db, "users", userId, "events");
  const subscriptions = [
    query(
      events,
      where("kind", "==", "single"),
      where("endsAt", "==", null),
      where("startsAt", ">=", Timestamp.fromDate(range.start)),
      where("startsAt", "<", Timestamp.fromDate(range.end)),
      orderBy("startsAt", "asc"),
    ),
    query(
      events,
      where("kind", "==", "single"),
      where("startsAt", "<", Timestamp.fromDate(range.end)),
      where("endsAt", ">", Timestamp.fromDate(range.start)),
      orderBy("startsAt", "asc"),
      orderBy("endsAt", "asc"),
    ),
    query(
      events,
      where("kind", "==", "repeating"),
      where("startsAt", "<", Timestamp.fromDate(range.end)),
      orderBy("startsAt", "asc"),
    ),
  ];
  const snapshots = new Map<number, CalendarEvent[]>();
  let failed = false;

  const unsubscribes = subscriptions.map((eventsQuery, index) =>
    onSnapshot(
      eventsQuery,
      (snapshot) => {
        if (failed) {
          return;
        }
        try {
          snapshots.set(index, snapshot.docs.map(decodeSnapshot));
          if (snapshots.size === subscriptions.length) {
            const merged = [...snapshots.values()].flat();
            const unique = new Map(
              merged.map((event) => [event.id, event] as const),
            );
            onEvents(
              [...unique.values()].sort(
                (left, right) =>
                  left.startsAt.getTime() - right.startsAt.getTime(),
              ),
            );
          }
        } catch (error) {
          failed = true;
          onError(
            error instanceof Error
              ? error
              : new Error("The schedule data could not be read."),
          );
        }
      },
      (error) => {
        if (!failed) {
          failed = true;
          onError(error);
        }
      },
    ),
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

function encodeRecurrence(recurrence: RecurrenceRule | null) {
  if (!recurrence) {
    return null;
  }
  return {
    ...recurrence,
    daysOfWeek: recurrence.daysOfWeek ? [...recurrence.daysOfWeek] : null,
    termination: {
      ...recurrence.termination,
      until: recurrence.termination.until
        ? Timestamp.fromDate(recurrence.termination.until)
        : null,
    },
  };
}

export function encodeCreateEventDocument(
  input: CreateEventInput,
  lifecycleTimestamp: unknown,
) {
  return {
    title: input.title.trim(),
    notes: input.notes,
    kind: input.kind,
    startsAt: Timestamp.fromDate(input.startsAt),
    endsAt: input.endsAt ? Timestamp.fromDate(input.endsAt) : null,
    allDay: input.allDay,
    timeZone: input.timeZone,
    recurrence: encodeRecurrence(input.recurrence),
    createdAt: lifecycleTimestamp,
    updatedAt: lifecycleTimestamp,
  };
}

export async function createEvent(
  db: Firestore,
  userId: string,
  input: CreateEventInput,
) {
  const now = new Date();
  decodeEventDocument("new-event", {
    ...input,
    createdAt: now,
    updatedAt: now,
  });

  const eventReference = doc(collection(db, "users", userId, "events"));
  const lifecycleTimestamp = serverTimestamp();
  await setDoc(
    eventReference,
    encodeCreateEventDocument(input, lifecycleTimestamp),
  );
  return eventReference.id;
}

export async function seedEmulatorEvents(
  db: Firestore,
  userId: string,
  events: SingleEvent[],
) {
  const batch = writeBatch(db);

  events.forEach((event) => {
    const document = encodeCreateEventDocument(event, Timestamp.fromDate(event.createdAt));
    document.updatedAt = Timestamp.fromDate(event.updatedAt);
    batch.set(doc(db, "users", userId, "events", event.id), document);
  });

  await batch.commit();
}
