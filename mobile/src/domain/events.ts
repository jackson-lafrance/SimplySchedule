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

/** Version 1 of the shared web/iOS recurrence contract. */
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
export type CalendarView = "month" | "agenda";
