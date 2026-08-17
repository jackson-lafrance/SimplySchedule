import type { ScheduleColor } from "@/domain/colors";

export type EventKind = "single" | "repeating";
export type RecurrenceFrequency =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";
export type RecurrenceTerminationType =
  | "never"
  | "onDate"
  | "afterOccurrences";

export type RecurrenceTermination = {
  type: RecurrenceTerminationType;
  until: Date | null;
  count: number | null;
};

/**
 * Version 1 of the shared web/iOS recurrence contract.
 *
 * Selectors that do not apply to a frequency are stored as null so Firestore
 * rules and both clients can reject ambiguous combinations.
 */
export type RecurrenceRule = {
  version: 1;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: number[] | null;
  dayOfMonth: number | null;
  weekOfMonth: number | null;
  monthOfYear: number | null;
  termination: RecurrenceTermination;
};

type EventBase = {
  id: string;
  title: string;
  notes: string;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  timeZone: string;
  color?: ScheduleColor;
  createdAt: Date;
  updatedAt: Date;
};

export type SingleEvent = EventBase & {
  kind: "single";
  recurrence: null;
};

export type RepeatingEvent = EventBase & {
  kind: "repeating";
  recurrence: RecurrenceRule;
};

export type CalendarEvent = SingleEvent | RepeatingEvent;

/**
 * A display-only projection of a canonical event. Repeating occurrences are
 * never written to Firestore as independent event documents.
 */
export type EventOccurrence = {
  id: string;
  eventId: string;
  occurrenceKey: string;
  title: string;
  notes: string;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  timeZone: string;
  color?: ScheduleColor;
  isRepeating: boolean;
};

type CreateEventBase = {
  title: string;
  notes: string;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  timeZone: string;
  color?: ScheduleColor;
};

export type CreateEventInput = CreateEventBase &
  (
    | { kind: "single"; recurrence: null }
    | { kind: "repeating"; recurrence: RecurrenceRule }
  );

export type VisibleRange = {
  start: Date;
  end: Date;
};

export type CalendarView = "day" | "week" | "month";
