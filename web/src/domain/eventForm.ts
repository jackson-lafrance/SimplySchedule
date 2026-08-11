import type {
  CreateEventInput,
  RecurrenceRule,
  RecurrenceTerminationType,
} from "@/domain/events";
import { zonedDateTimeToDate } from "@/domain/recurrence";

export type RecurrencePreset =
  | "none"
  | "firstOfMonth"
  | "thirdFriday"
  | "everyOtherDay"
  | "everyThreeDays"
  | "everyFiveHours";

export type EventDraft = {
  title: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  recurrencePreset: RecurrencePreset;
  terminationType: RecurrenceTerminationType;
  untilDate: string;
  occurrenceCount: string;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

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

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addUtcDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function thirdFriday(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((5 - firstWeekday + 7) % 7) + 14;
}

export function alignDateKeyForPreset(
  value: string,
  preset: RecurrencePreset,
) {
  if (preset !== "firstOfMonth" && preset !== "thirdFriday") {
    return value;
  }

  const selected = parseDateKey(value);
  if (preset === "firstOfMonth") {
    if (selected.day === 1) {
      return value;
    }
    const nextMonth = new Date(Date.UTC(selected.year, selected.month, 1));
    return dateKey(
      nextMonth.getUTCFullYear(),
      nextMonth.getUTCMonth() + 1,
      1,
    );
  }

  let friday = thirdFriday(selected.year, selected.month);
  if (selected.day <= friday) {
    return dateKey(selected.year, selected.month, friday);
  }
  const nextMonth = new Date(Date.UTC(selected.year, selected.month, 1));
  friday = thirdFriday(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1);
  return dateKey(
    nextMonth.getUTCFullYear(),
    nextMonth.getUTCMonth() + 1,
    friday,
  );
}

function dateAt(
  date: { year: number; month: number; day: number },
  time: { hour: number; minute: number },
  timeZone: string,
) {
  return zonedDateTimeToDate(
    {
      ...date,
      ...time,
      second: 0,
      millisecond: 0,
    },
    timeZone,
  );
}

function recurrenceRule(
  draft: EventDraft,
  startsAt: Date,
  timeZone: string,
): RecurrenceRule | null {
  if (draft.recurrencePreset === "none") {
    return null;
  }

  let until: Date | null = null;
  let count: number | null = null;
  if (draft.terminationType === "onDate") {
    const throughDate = parseDateKey(draft.untilDate);
    const nextDate = addUtcDays(throughDate, 1);
    until = new Date(
      dateAt(nextDate, { hour: 0, minute: 0 }, timeZone).getTime() - 1,
    );
    if (until < startsAt) {
      throw new Error("THE REPEAT END DATE MUST INCLUDE THE FIRST EVENT.");
    }
  } else if (draft.terminationType === "afterOccurrences") {
    count = Number(draft.occurrenceCount);
    if (!Number.isInteger(count) || count < 1 || count > 999) {
      throw new Error("OCCURRENCES MUST BE A WHOLE NUMBER FROM 1 TO 999.");
    }
  }

  const common = {
    version: 1 as const,
    daysOfWeek: null,
    dayOfMonth: null,
    weekOfMonth: null,
    monthOfYear: null,
    termination: {
      type: draft.terminationType,
      until,
      count,
    },
  };

  switch (draft.recurrencePreset) {
    case "firstOfMonth":
      return { ...common, frequency: "monthly", interval: 1, dayOfMonth: 1 };
    case "thirdFriday":
      return {
        ...common,
        frequency: "monthly",
        interval: 1,
        daysOfWeek: [5],
        weekOfMonth: 3,
      };
    case "everyOtherDay":
      return { ...common, frequency: "daily", interval: 2 };
    case "everyThreeDays":
      return { ...common, frequency: "daily", interval: 3 };
    case "everyFiveHours":
      return { ...common, frequency: "hourly", interval: 5 };
  }
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

  const alignedDate = alignDateKeyForPreset(
    draft.date,
    draft.recurrencePreset,
  );
  const selectedDate = parseDateKey(alignedDate);
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

export function recurrencePresetSummary(preset: RecurrencePreset) {
  switch (preset) {
    case "none":
      return "DOES NOT REPEAT";
    case "firstOfMonth":
      return "FIRST OF EVERY MONTH";
    case "thirdFriday":
      return "THIRD FRIDAY OF EVERY MONTH";
    case "everyOtherDay":
      return "EVERY OTHER DAY";
    case "everyThreeDays":
      return "EVERY THREE DAYS";
    case "everyFiveHours":
      return "EVERY FIVE HOURS";
  }
}
