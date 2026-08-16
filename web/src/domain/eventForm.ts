import type {
  CreateEventInput,
  RecurrenceFrequency,
  RecurrenceRule,
  RecurrenceTerminationType,
} from "@/domain/events";
import { zonedDateTimeToDate } from "@/domain/recurrence";

export type RepeatFrequency = "none" | RecurrenceFrequency;
export type CalendarPattern = "dayOfMonth" | "ordinalWeekday";

export type EventDraft = {
  title: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  repeatFrequency: RepeatFrequency;
  interval: string;
  daysOfWeek: number[];
  calendarPattern: CalendarPattern;
  dayOfMonth: string;
  weekOfMonth: string;
  ordinalWeekday: string;
  monthOfYear: string;
  terminationType: RecurrenceTerminationType;
  untilDate: string;
  occurrenceCount: string;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const ORDINAL_NAMES: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  [-1]: "last",
};

function parseDateKey(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error("CHOOSE A VALID EVENT DATE.");
  }
  const [, year, month, day] = match;
  const result = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
  const check = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (
    check.getUTCFullYear() !== result.year ||
    check.getUTCMonth() + 1 !== result.month ||
    check.getUTCDate() !== result.day
  ) {
    throw new Error("CHOOSE A VALID EVENT DATE.");
  }
  return result;
}

function parseTime(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    throw new Error("CHOOSE A VALID START AND END TIME.");
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new Error("CHOOSE A VALID START AND END TIME.");
  }
  return { hour, minute };
}

function addUtcDays(
  parts: { year: number; month: number; day: number },
  days: number,
) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function dateAt(
  date: { year: number; month: number; day: number },
  time: { hour: number; minute: number },
  timeZone: string,
) {
  return zonedDateTimeToDate(
    { ...date, ...time, second: 0, millisecond: 0 },
    timeZone,
  );
}

function integerField(
  value: string,
  label: string,
  minimum: number,
  maximum: number,
  allowLast = false,
) {
  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    (!((allowLast && parsed === -1) || (parsed >= minimum && parsed <= maximum)))
  ) {
    throw new Error(`${label} IS NOT VALID.`);
  }
  return parsed;
}

function terminationForDraft(
  draft: EventDraft,
  startsAt: Date,
  timeZone: string,
) {
  let until: Date | null = null;
  let count: number | null = null;

  if (draft.terminationType === "onDate") {
    const throughDate = parseDateKey(draft.untilDate);
    const nextDate = addUtcDays(throughDate, 1);
    until = new Date(
      dateAt(nextDate, { hour: 0, minute: 0 }, timeZone).getTime() - 1,
    );
    if (until < startsAt) {
      throw new Error("THE REPEAT END DATE MUST INCLUDE THE START ANCHOR.");
    }
  } else if (draft.terminationType === "afterOccurrences") {
    count = integerField(draft.occurrenceCount, "OCCURRENCE COUNT", 1, 999);
  }

  return { type: draft.terminationType, until, count };
}

function recurrenceRule(
  draft: EventDraft,
  startsAt: Date,
  timeZone: string,
): RecurrenceRule | null {
  if (draft.repeatFrequency === "none") {
    return null;
  }

  const interval = integerField(draft.interval, "REPEAT INTERVAL", 1, 99);
  const common = {
    version: 1 as const,
    frequency: draft.repeatFrequency,
    interval,
    daysOfWeek: null as number[] | null,
    dayOfMonth: null as number | null,
    weekOfMonth: null as number | null,
    monthOfYear: null as number | null,
    termination: terminationForDraft(draft, startsAt, timeZone),
  };

  if (draft.repeatFrequency === "weekly") {
    const daysOfWeek = [...new Set(draft.daysOfWeek)].sort(
      (left, right) => left - right,
    );
    if (
      daysOfWeek.length === 0 ||
      daysOfWeek.some((weekday) => weekday < 0 || weekday > 6)
    ) {
      throw new Error("CHOOSE AT LEAST ONE WEEKDAY.");
    }
    return { ...common, daysOfWeek };
  }

  if (
    draft.repeatFrequency === "monthly" ||
    draft.repeatFrequency === "yearly"
  ) {
    const monthOfYear =
      draft.repeatFrequency === "yearly"
        ? integerField(draft.monthOfYear, "MONTH", 1, 12)
        : null;

    if (draft.calendarPattern === "dayOfMonth") {
      return {
        ...common,
        dayOfMonth: integerField(
          draft.dayOfMonth,
          "DAY OF MONTH",
          1,
          31,
          true,
        ),
        monthOfYear,
      };
    }

    return {
      ...common,
      daysOfWeek: [
        integerField(draft.ordinalWeekday, "WEEKDAY", 0, 6),
      ],
      weekOfMonth: integerField(
        draft.weekOfMonth,
        "WEEK OF MONTH",
        1,
        5,
        true,
      ),
      monthOfYear,
    };
  }

  return common;
}

export function createEventInputFromDraft(
  draft: EventDraft,
  timeZone: string,
): CreateEventInput {
  const title = draft.title.trim();
  if (!title) {
    throw new Error("ADD AN EVENT TITLE.");
  }
  if (title.length > 200) {
    throw new Error("KEEP THE TITLE TO 200 CHARACTERS.");
  }
  if (draft.notes.length > 5_000) {
    throw new Error("KEEP NOTES TO 5,000 CHARACTERS.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error("THE EVENT TIMEZONE IS NOT AVAILABLE.");
  }

  const selectedDate = parseDateKey(draft.date);
  let startsAt: Date;
  let endsAt: Date;

  if (draft.allDay) {
    startsAt = dateAt(selectedDate, { hour: 0, minute: 0 }, timeZone);
    endsAt = dateAt(
      addUtcDays(selectedDate, 1),
      { hour: 0, minute: 0 },
      timeZone,
    );
  } else {
    startsAt = dateAt(selectedDate, parseTime(draft.startTime), timeZone);
    endsAt = dateAt(selectedDate, parseTime(draft.endTime), timeZone);
    if (endsAt <= startsAt) {
      throw new Error("END TIME MUST BE AFTER START TIME.");
    }
  }

  const recurrence = recurrenceRule(draft, startsAt, timeZone);
  const base = {
    title,
    notes: draft.notes,
    startsAt,
    endsAt,
    allDay: draft.allDay,
    timeZone,
  };

  return recurrence
    ? { ...base, kind: "repeating", recurrence }
    : { ...base, kind: "single", recurrence: null };
}

function unitName(frequency: RecurrenceFrequency, plural: boolean) {
  const name = frequency === "daily" ? "day" : frequency.replace(/ly$/, "");
  return plural ? `${name}s` : name;
}

export function recurrenceSummary(draft: EventDraft) {
  if (draft.repeatFrequency === "none") {
    return "DOES NOT REPEAT";
  }

  const interval = Number(draft.interval) || 1;
  let summary = `EVERY ${interval === 1 ? "" : `${interval} `}${unitName(
    draft.repeatFrequency,
    interval !== 1,
  ).toUpperCase()}`;

  if (draft.repeatFrequency === "weekly" && draft.daysOfWeek.length > 0) {
    summary += ` ON ${draft.daysOfWeek
      .map((weekday) => WEEKDAY_NAMES[weekday].slice(0, 3).toUpperCase())
      .join(", ")}`;
  }

  if (
    (draft.repeatFrequency === "monthly" ||
      draft.repeatFrequency === "yearly") &&
    draft.calendarPattern === "dayOfMonth"
  ) {
    summary += draft.dayOfMonth === "-1"
      ? " ON THE LAST DAY"
      : ` ON DAY ${draft.dayOfMonth}`;
  }

  if (
    (draft.repeatFrequency === "monthly" ||
      draft.repeatFrequency === "yearly") &&
    draft.calendarPattern === "ordinalWeekday"
  ) {
    const ordinal = ORDINAL_NAMES[Number(draft.weekOfMonth)] ?? "selected";
    const weekday = WEEKDAY_NAMES[Number(draft.ordinalWeekday)] ?? "weekday";
    summary += ` ON THE ${ordinal.toUpperCase()} ${weekday.toUpperCase()}`;
  }

  return summary;
}

export function weekdayForDateKey(value: string) {
  const date = parseDateKey(value);
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}
