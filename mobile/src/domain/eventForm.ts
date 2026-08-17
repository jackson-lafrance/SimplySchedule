import type {
  CreateEventInput,
  RecurrenceFrequency,
  RecurrenceRule,
  RecurrenceTerminationType,
} from "@/domain/events";
import type { ScheduleColor } from "@/domain/scheduleColors";
import {
  expandEventInRange,
  zonedDateTimeToDate,
} from "@/domain/recurrence";

export type CalendarSelectorMode = "dayOfMonth" | "ordinalWeekday";

export type EventDraft = {
  title: string;
  notes: string;
  color: ScheduleColor;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  recurrenceEnabled: boolean;
  frequency: RecurrenceFrequency;
  interval: string;
  weekdays: number[];
  calendarSelectorMode: CalendarSelectorMode;
  dayOfMonth: string;
  weekOfMonth: number | -1;
  ordinalWeekday: number;
  monthOfYear: string;
  terminationType: RecurrenceTerminationType;
  untilDate: string;
  occurrenceCount: string;
};

export type DateParts = { year: number; month: number; day: number };
export type TimeParts = { hour: number; minute: number };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const WEEKDAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const ORDINAL_NAMES = new Map<number, string>([
  [1, "FIRST"],
  [2, "SECOND"],
  [3, "THIRD"],
  [4, "FOURTH"],
  [5, "FIFTH"],
  [-1, "LAST"],
]);

export function parseDateKey(
  value: string,
  subject: "EVENT" | "TASK" = "EVENT",
): DateParts {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`CHOOSE A VALID ${subject} DATE.`);
  }
  const result = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const check = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (
    check.getUTCFullYear() !== result.year ||
    check.getUTCMonth() + 1 !== result.month ||
    check.getUTCDate() !== result.day
  ) {
    throw new Error(`CHOOSE A VALID ${subject} DATE.`);
  }
  return result;
}

export function parseTime(
  value: string,
  subject: "EVENT" | "TASK" = "EVENT",
): TimeParts {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error(`CHOOSE A VALID ${subject} TIME.`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new Error(`CHOOSE A VALID ${subject} TIME.`);
  }
  return { hour, minute };
}

export function dateKey(parts: DateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

export function addDatePartsDays(parts: DateParts, amount: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function dateAt(
  date: DateParts,
  time: TimeParts,
  timeZone: string,
) {
  return zonedDateTimeToDate(
    { ...date, ...time, second: 0, millisecond: 0 },
    timeZone,
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekday(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function ordinalWeekday(
  year: number,
  month: number,
  selectedWeekday: number,
  ordinal: number,
) {
  const monthDays = daysInMonth(year, month);
  if (ordinal === -1) {
    const lastWeekday = weekday(year, month, monthDays);
    return monthDays - ((lastWeekday - selectedWeekday + 7) % 7);
  }
  const firstWeekday = weekday(year, month, 1);
  const day =
    1 + ((selectedWeekday - firstWeekday + 7) % 7) + (ordinal - 1) * 7;
  return day <= monthDays ? day : null;
}

function integerField(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
  allowLast = false,
) {
  const number = Number(value);
  if (
    !Number.isInteger(number) ||
    (!allowLast || number !== -1) && (number < minimum || number > maximum)
  ) {
    throw new Error(`${label} MUST BE A WHOLE NUMBER FROM ${minimum} TO ${maximum}.`);
  }
  return number;
}

function selectorsFromDraft(draft: EventDraft) {
  const interval = integerField(draft.interval, "INTERVAL", 1, 99);
  const common = {
    version: 1 as const,
    frequency: draft.frequency,
    interval,
    daysOfWeek: null as number[] | null,
    dayOfMonth: null as number | null,
    weekOfMonth: null as number | null,
    monthOfYear: null as number | null,
    termination: {
      type: "never" as const,
      until: null,
      count: null,
    },
  };

  if (draft.frequency === "weekly") {
    const daysOfWeek = [...new Set(draft.weekdays)].sort((a, b) => a - b);
    if (!daysOfWeek.length || daysOfWeek.some((day) => day < 0 || day > 6)) {
      throw new Error("CHOOSE AT LEAST ONE WEEKDAY.");
    }
    return { ...common, daysOfWeek };
  }

  if (draft.frequency === "monthly" || draft.frequency === "yearly") {
    const monthOfYear =
      draft.frequency === "yearly"
        ? integerField(draft.monthOfYear, "MONTH", 1, 12)
        : null;
    if (draft.calendarSelectorMode === "dayOfMonth") {
      return {
        ...common,
        monthOfYear,
        dayOfMonth: integerField(
          draft.dayOfMonth,
          "DAY OF MONTH",
          1,
          31,
          true,
        ),
      };
    }
    if (
      ![1, 2, 3, 4, 5, -1].includes(draft.weekOfMonth) ||
      draft.ordinalWeekday < 0 ||
      draft.ordinalWeekday > 6
    ) {
      throw new Error("CHOOSE A VALID ORDINAL WEEKDAY.");
    }
    return {
      ...common,
      monthOfYear,
      daysOfWeek: [draft.ordinalWeekday],
      weekOfMonth: draft.weekOfMonth,
    };
  }

  return common;
}

function compareDateParts(left: DateParts, right: DateParts) {
  return (
    Date.UTC(left.year, left.month - 1, left.day) -
    Date.UTC(right.year, right.month - 1, right.day)
  );
}

export function alignDateForRecurrence(
  anchor: DateParts,
  recurrence: RecurrenceRule,
): DateParts {
  if (recurrence.frequency === "hourly" || recurrence.frequency === "daily") {
    return anchor;
  }

  if (recurrence.frequency === "weekly") {
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDatePartsDays(anchor, offset);
      if (recurrence.daysOfWeek?.includes(weekday(
        candidate.year,
        candidate.month,
        candidate.day,
      ))) {
        return candidate;
      }
    }
  }

  if (recurrence.frequency === "monthly") {
    for (let offset = 0; offset < 240; offset += 1) {
      const monthDate = new Date(
        Date.UTC(anchor.year, anchor.month - 1 + offset, 1),
      );
      const year = monthDate.getUTCFullYear();
      const month = monthDate.getUTCMonth() + 1;
      const monthDays = daysInMonth(year, month);
      const selectedDay = recurrence.dayOfMonth !== null
        ? recurrence.dayOfMonth === -1
          ? monthDays
          : recurrence.dayOfMonth
        : ordinalWeekday(
            year,
            month,
            recurrence.daysOfWeek?.[0] ?? 0,
            recurrence.weekOfMonth ?? 1,
          );
      if (selectedDay !== null && selectedDay <= monthDays) {
        const candidate = { year, month, day: selectedDay };
        if (compareDateParts(candidate, anchor) >= 0) {
          return candidate;
        }
      }
    }
  }

  if (recurrence.frequency === "yearly") {
    for (let offset = 0; offset < 400; offset += 1) {
      const year = anchor.year + offset;
      const month = recurrence.monthOfYear ?? anchor.month;
      const monthDays = daysInMonth(year, month);
      const selectedDay = recurrence.dayOfMonth !== null
        ? recurrence.dayOfMonth === -1
          ? monthDays
          : recurrence.dayOfMonth
        : ordinalWeekday(
            year,
            month,
            recurrence.daysOfWeek?.[0] ?? 0,
            recurrence.weekOfMonth ?? 1,
          );
      if (selectedDay !== null && selectedDay <= monthDays) {
        const candidate = { year, month, day: selectedDay };
        if (compareDateParts(candidate, anchor) >= 0) {
          return candidate;
        }
      }
    }
  }

  throw new Error("THE REPEAT RULE HAS NO VALID START DATE.");
}

function recurrenceFromDraft(
  draft: EventDraft,
  anchor: DateParts,
  timeZone: string,
) {
  if (!draft.recurrenceEnabled) {
    return { recurrence: null, alignedDate: anchor } as const;
  }

  const selectorRule = selectorsFromDraft(draft);
  const alignedDate = alignDateForRecurrence(anchor, selectorRule);
  const startsAt = dateAt(
    alignedDate,
    draft.allDay ? { hour: 0, minute: 0 } : parseTime(draft.startTime),
    timeZone,
  );

  let until: Date | null = null;
  let count: number | null = null;
  if (draft.terminationType === "onDate") {
    const throughDate = parseDateKey(draft.untilDate);
    until = new Date(
      dateAt(addDatePartsDays(throughDate, 1), { hour: 0, minute: 0 }, timeZone)
        .getTime() - 1,
    );
    if (until < startsAt) {
      throw new Error("THE REPEAT END DATE MUST INCLUDE THE FIRST EVENT.");
    }
  } else if (draft.terminationType === "afterOccurrences") {
    count = integerField(draft.occurrenceCount, "OCCURRENCES", 1, 999);
  }

  return {
    alignedDate,
    recurrence: {
      ...selectorRule,
      termination: { type: draft.terminationType, until, count },
    } as RecurrenceRule,
  };
}

export function createEventInputFromDraft(
  draft: EventDraft,
  timeZone: string,
): CreateEventInput {
  const title = draft.title.trim();
  if (!title) throw new Error("ADD AN EVENT TITLE.");
  if (title.length > 200) throw new Error("KEEP THE TITLE TO 200 CHARACTERS.");
  if (draft.notes.length > 5_000) {
    throw new Error("KEEP NOTES TO 5,000 CHARACTERS.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error("THE EVENT TIMEZONE IS NOT AVAILABLE.");
  }

  const anchor = parseDateKey(draft.date);
  const { recurrence, alignedDate } = recurrenceFromDraft(
    draft,
    anchor,
    timeZone,
  );
  const startsAt = dateAt(
    alignedDate,
    draft.allDay ? { hour: 0, minute: 0 } : parseTime(draft.startTime),
    timeZone,
  );
  const endsAt = draft.allDay
    ? dateAt(addDatePartsDays(alignedDate, 1), { hour: 0, minute: 0 }, timeZone)
    : dateAt(alignedDate, parseTime(draft.endTime), timeZone);

  if (endsAt <= startsAt) {
    throw new Error("END TIME MUST BE AFTER START TIME.");
  }

  const base = {
    title,
    notes: draft.notes,
    color: draft.color,
    startsAt,
    endsAt,
    allDay: draft.allDay,
    timeZone,
  };
  return recurrence
    ? { ...base, kind: "repeating", recurrence }
    : { ...base, kind: "single", recurrence: null };
}

export function previewEventOccurrences(
  input: CreateEventInput,
  maximum = 5,
) {
  if (input.kind !== "repeating" || maximum < 1) return [];
  const previewEnd = new Date(input.startsAt);
  previewEnd.setUTCFullYear(previewEnd.getUTCFullYear() + 500);
  const lifecycleDate = new Date(input.startsAt);

  return expandEventInRange(
    {
      ...input,
      id: "recurrence-preview",
      createdAt: lifecycleDate,
      updatedAt: lifecycleDate,
    },
    {
      start: new Date(input.startsAt.getTime() - 1),
      end: previewEnd,
    },
    maximum,
  ).map((occurrence) => occurrence.startsAt);
}

export function recurrenceDraftSummary(draft: EventDraft) {
  if (!draft.recurrenceEnabled) return "DOES NOT REPEAT";
  const interval = Number(draft.interval) || 1;
  const unit = {
    hourly: "HOUR",
    daily: "DAY",
    weekly: "WEEK",
    monthly: "MONTH",
    yearly: "YEAR",
  }[draft.frequency];
  const every = interval === 1 ? `EVERY ${unit}` : `EVERY ${interval} ${unit}S`;

  if (draft.frequency === "weekly") {
    const days = [...draft.weekdays]
      .sort((a, b) => a - b)
      .map((day) => WEEKDAY_NAMES[day])
      .join(", ");
    return `${every} · ${days || "CHOOSE DAYS"}`;
  }
  if (draft.frequency === "monthly" || draft.frequency === "yearly") {
    const selector = draft.calendarSelectorMode === "dayOfMonth"
      ? draft.dayOfMonth === "-1"
        ? "LAST DAY"
        : `DAY ${draft.dayOfMonth}`
      : `${ORDINAL_NAMES.get(draft.weekOfMonth) ?? "FIRST"} ${
          WEEKDAY_NAMES[draft.ordinalWeekday]
        }`;
    const month = draft.frequency === "yearly"
      ? `${MONTH_NAMES[Number(draft.monthOfYear) - 1] ?? "CHOOSE MONTH"} · `
      : "";
    return `${every} · ${month}${selector}`;
  }
  return every;
}
