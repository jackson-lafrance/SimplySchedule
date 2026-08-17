import type {
  CalendarEvent,
  EventOccurrence,
  RepeatingEvent,
  VisibleRange,
} from "@/domain/events";

/** A defensive output cap even when a caller accidentally requests a huge range. */
export const MAX_OCCURRENCES_PER_EXPANSION = 2_000;
const MAX_RECURRENCE_ITERATIONS = 100_000;

type ZonedDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = zonedFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    zonedFormatters.set(timeZone, formatter);
  }
  return formatter;
}

export function zonedDateTimeParts(date: Date, timeZone: string): ZonedDateTime {
  const values = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
    millisecond: date.getMilliseconds(),
  };
}

function wallClockValue(parts: ZonedDateTime) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
}

/**
 * Converts an event-zone wall clock to an instant without relying on the
 * browser's current timezone. Offset refinement also handles DST boundaries
 * deterministically using Intl's timezone database.
 */
export function zonedDateTimeToDate(
  parts: ZonedDateTime,
  timeZone: string,
): Date {
  const desiredWallClock = wallClockValue(parts);
  let instant = desiredWallClock;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedDateTimeParts(new Date(instant), timeZone);
    const adjustment = desiredWallClock - wallClockValue(actual);
    if (adjustment === 0) {
      break;
    }
    instant += adjustment;
  }

  return new Date(instant);
}

function wallDate(parts: ZonedDateTime) {
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond,
    ),
  );
}

function partsFromWallDate(date: Date): ZonedDateTime {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  };
}

function addLocalDays(parts: ZonedDateTime, days: number) {
  const date = wallDate(parts);
  date.setUTCDate(date.getUTCDate() + days);
  return partsFromWallDate(date);
}

function addLocalMonths(parts: ZonedDateTime, months: number) {
  const date = wallDate({ ...parts, day: 1 });
  date.setUTCMonth(date.getUTCMonth() + months);
  return partsFromWallDate(date);
}

function addLocalYears(parts: ZonedDateTime, years: number) {
  return { ...parts, year: parts.year + years };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function ordinalWeekday(
  year: number,
  month: number,
  weekday: number,
  ordinal: number,
) {
  const monthDays = daysInMonth(year, month);
  if (ordinal === -1) {
    const lastWeekday = weekdayOf(year, month, monthDays);
    return monthDays - ((lastWeekday - weekday + 7) % 7);
  }

  const firstWeekday = weekdayOf(year, month, 1);
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (ordinal - 1) * 7;
  return day <= monthDays ? day : null;
}

function compareStarts(left: Date, right: Date) {
  return left.getTime() - right.getTime();
}

function intersectsRange(
  startsAt: Date,
  endsAt: Date | null,
  range: VisibleRange,
) {
  if (!endsAt) {
    return startsAt >= range.start && startsAt < range.end;
  }
  return startsAt < range.end && endsAt > range.start;
}

function occurrenceKey(eventId: string, startsAt: Date) {
  return `${eventId}@${startsAt.toISOString()}`;
}

function occurrenceFromStart(
  event: CalendarEvent,
  startsAt: Date,
): EventOccurrence {
  let endsAt: Date | null = null;
  if (event.endsAt) {
    if (event.allDay) {
      const seedStart = zonedDateTimeParts(event.startsAt, event.timeZone);
      const seedEnd = zonedDateTimeParts(event.endsAt, event.timeZone);
      const durationDays = Math.max(
        1,
        Math.round(
          (Date.UTC(seedEnd.year, seedEnd.month - 1, seedEnd.day) -
            Date.UTC(seedStart.year, seedStart.month - 1, seedStart.day)) /
            86_400_000,
        ),
      );
      endsAt = zonedDateTimeToDate(
        addLocalDays(zonedDateTimeParts(startsAt, event.timeZone), durationDays),
        event.timeZone,
      );
    } else {
      endsAt = new Date(
        startsAt.getTime() +
          (event.endsAt.getTime() - event.startsAt.getTime()),
      );
    }
  }
  const repeating = event.kind === "repeating";
  const key = repeating ? occurrenceKey(event.id, startsAt) : event.id;

  return {
    id: key,
    eventId: event.id,
    occurrenceKey: key,
    title: event.title,
    notes: event.notes,
    color: event.color,
    startsAt,
    endsAt,
    allDay: event.allDay,
    timeZone: event.timeZone,
    isRepeating: repeating,
  };
}

function validRange(range: VisibleRange) {
  return (
    Number.isFinite(range.start.getTime()) &&
    Number.isFinite(range.end.getTime()) &&
    range.start < range.end
  );
}

function terminationAllows(
  event: RepeatingEvent,
  startsAt: Date,
  occurrenceNumber: number,
) {
  const termination = event.recurrence.termination;
  if (termination.type === "afterOccurrences") {
    return occurrenceNumber <= (termination.count ?? 0);
  }
  if (termination.type === "onDate") {
    return termination.until !== null && startsAt <= termination.until;
  }
  return true;
}

function terminationFinished(
  event: RepeatingEvent,
  startsAt: Date,
  occurrenceNumber: number,
) {
  const termination = event.recurrence.termination;
  return (
    (termination.type === "afterOccurrences" &&
      occurrenceNumber > (termination.count ?? 0)) ||
    (termination.type === "onDate" &&
      termination.until !== null &&
      startsAt > termination.until)
  );
}

type CandidateCollector = {
  add: (startsAt: Date, occurrenceNumber: number) => boolean;
  occurrences: EventOccurrence[];
};

function candidateCollector(
  event: RepeatingEvent,
  range: VisibleRange,
  maximum: number,
): CandidateCollector {
  const occurrences: EventOccurrence[] = [];

  return {
    occurrences,
    add(startsAt, occurrenceNumber) {
      if (terminationFinished(event, startsAt, occurrenceNumber)) {
        return false;
      }
      const occurrence = occurrenceFromStart(event, startsAt);
      if (
        terminationAllows(event, startsAt, occurrenceNumber) &&
        intersectsRange(occurrence.startsAt, occurrence.endsAt, range)
      ) {
        occurrences.push(occurrence);
      }
      return occurrences.length < maximum && startsAt < range.end;
    },
  };
}

function expandHourly(
  event: RepeatingEvent,
  range: VisibleRange,
  collector: CandidateCollector,
) {
  const intervalMs = event.recurrence.interval * 60 * 60 * 1_000;
  const durationMs = event.endsAt
    ? event.endsAt.getTime() - event.startsAt.getTime()
    : 0;
  const earliestRelevantStart = range.start.getTime() - durationMs;
  let index = Math.max(
    0,
    Math.floor(
      (earliestRelevantStart - event.startsAt.getTime()) / intervalMs,
    ),
  );

  for (let iteration = 0; iteration < MAX_RECURRENCE_ITERATIONS; iteration += 1) {
    const startsAt = new Date(event.startsAt.getTime() + index * intervalMs);
    if (!collector.add(startsAt, index + 1)) {
      break;
    }
    index += 1;
  }
}

function localDayNumber(parts: ZonedDateTime) {
  return Date.UTC(parts.year, parts.month - 1, parts.day) / 86_400_000;
}

function expandDaily(
  event: RepeatingEvent,
  range: VisibleRange,
  collector: CandidateCollector,
) {
  const seed = zonedDateTimeParts(event.startsAt, event.timeZone);
  const rangeStart = zonedDateTimeParts(range.start, event.timeZone);
  const durationDays = event.endsAt
    ? Math.ceil((event.endsAt.getTime() - event.startsAt.getTime()) / 86_400_000)
    : 0;
  const dayDifference = localDayNumber(rangeStart) - localDayNumber(seed);
  let index = Math.max(
    0,
    Math.floor(
      (dayDifference - durationDays - 1) / event.recurrence.interval,
    ),
  );

  for (let iteration = 0; iteration < MAX_RECURRENCE_ITERATIONS; iteration += 1) {
    const localStart = addLocalDays(seed, index * event.recurrence.interval);
    const startsAt = zonedDateTimeToDate(localStart, event.timeZone);
    if (!collector.add(startsAt, index + 1)) {
      break;
    }
    index += 1;
  }
}

function startOfLocalWeek(parts: ZonedDateTime) {
  return addLocalDays(parts, -weekdayOf(parts.year, parts.month, parts.day));
}

function expandWeekly(
  event: RepeatingEvent,
  range: VisibleRange,
  collector: CandidateCollector,
) {
  const seed = zonedDateTimeParts(event.startsAt, event.timeZone);
  const weekStart = startOfLocalWeek(seed);
  const weekdays = event.recurrence.daysOfWeek ?? [];
  let occurrenceNumber = 0;

  for (let period = 0; period < MAX_RECURRENCE_ITERATIONS; period += 1) {
    const periodStart = addLocalDays(
      weekStart,
      period * event.recurrence.interval * 7,
    );
    let periodPastRange = false;

    for (const weekday of weekdays) {
      const startsAt = zonedDateTimeToDate(
        addLocalDays(periodStart, weekday),
        event.timeZone,
      );
      if (startsAt < event.startsAt) {
        continue;
      }
      occurrenceNumber += 1;
      if (!collector.add(startsAt, occurrenceNumber)) {
        periodPastRange = true;
        break;
      }
    }

    if (periodPastRange) {
      break;
    }
  }
}

function monthlyCandidates(event: RepeatingEvent, period: number) {
  const seed = zonedDateTimeParts(event.startsAt, event.timeZone);
  const month = addLocalMonths(seed, period * event.recurrence.interval);
  const monthDays = daysInMonth(month.year, month.month);
  const candidateDays: number[] = [];

  if (event.recurrence.dayOfMonth !== null) {
    const selectedDay = event.recurrence.dayOfMonth === -1
      ? monthDays
      : event.recurrence.dayOfMonth;
    if (selectedDay <= monthDays) {
      candidateDays.push(selectedDay);
    }
  } else {
    for (const weekday of event.recurrence.daysOfWeek ?? []) {
      const selectedDay = ordinalWeekday(
        month.year,
        month.month,
        weekday,
        event.recurrence.weekOfMonth ?? 1,
      );
      if (selectedDay !== null) {
        candidateDays.push(selectedDay);
      }
    }
  }

  return [...new Set(candidateDays)]
    .sort((left, right) => left - right)
    .map((day) => zonedDateTimeToDate({ ...month, day }, event.timeZone));
}

function expandMonthly(
  event: RepeatingEvent,
  range: VisibleRange,
  collector: CandidateCollector,
) {
  let occurrenceNumber = 0;

  for (let period = 0; period < MAX_RECURRENCE_ITERATIONS; period += 1) {
    let periodPastRange = false;
    for (const startsAt of monthlyCandidates(event, period)) {
      if (startsAt < event.startsAt) {
        continue;
      }
      occurrenceNumber += 1;
      if (!collector.add(startsAt, occurrenceNumber)) {
        periodPastRange = true;
        break;
      }
    }
    if (periodPastRange) {
      break;
    }
  }
}

function yearlyCandidates(event: RepeatingEvent, period: number) {
  const seed = zonedDateTimeParts(event.startsAt, event.timeZone);
  const year = addLocalYears(seed, period * event.recurrence.interval).year;
  const month = event.recurrence.monthOfYear ?? seed.month;
  const monthDays = daysInMonth(year, month);
  const candidateDays: number[] = [];

  if (event.recurrence.dayOfMonth !== null) {
    const selectedDay = event.recurrence.dayOfMonth === -1
      ? monthDays
      : event.recurrence.dayOfMonth;
    if (selectedDay <= monthDays) {
      candidateDays.push(selectedDay);
    }
  } else {
    for (const weekday of event.recurrence.daysOfWeek ?? []) {
      const selectedDay = ordinalWeekday(
        year,
        month,
        weekday,
        event.recurrence.weekOfMonth ?? 1,
      );
      if (selectedDay !== null) {
        candidateDays.push(selectedDay);
      }
    }
  }

  return [...new Set(candidateDays)]
    .sort((left, right) => left - right)
    .map((day) =>
      zonedDateTimeToDate({ ...seed, year, month, day }, event.timeZone),
    );
}

function expandYearly(
  event: RepeatingEvent,
  range: VisibleRange,
  collector: CandidateCollector,
) {
  let occurrenceNumber = 0;

  for (let period = 0; period < MAX_RECURRENCE_ITERATIONS; period += 1) {
    let periodPastRange = false;
    for (const startsAt of yearlyCandidates(event, period)) {
      if (startsAt < event.startsAt) {
        continue;
      }
      occurrenceNumber += 1;
      if (!collector.add(startsAt, occurrenceNumber)) {
        periodPastRange = true;
        break;
      }
    }
    if (periodPastRange) {
      break;
    }
  }
}

export function expandEventInRange(
  event: CalendarEvent,
  range: VisibleRange,
  maximum = MAX_OCCURRENCES_PER_EXPANSION,
): EventOccurrence[] {
  if (!validRange(range) || maximum < 1) {
    return [];
  }

  if (event.kind === "single") {
    const occurrence = occurrenceFromStart(event, event.startsAt);
    return intersectsRange(occurrence.startsAt, occurrence.endsAt, range)
      ? [occurrence]
      : [];
  }

  if (event.startsAt >= range.end) {
    return [];
  }

  const collector = candidateCollector(event, range, maximum);
  switch (event.recurrence.frequency) {
    case "hourly":
      expandHourly(event, range, collector);
      break;
    case "daily":
      expandDaily(event, range, collector);
      break;
    case "weekly":
      expandWeekly(event, range, collector);
      break;
    case "monthly":
      expandMonthly(event, range, collector);
      break;
    case "yearly":
      expandYearly(event, range, collector);
      break;
  }

  return collector.occurrences.sort((left, right) =>
    compareStarts(left.startsAt, right.startsAt),
  );
}

export function expandEventsInRange(
  events: CalendarEvent[],
  range: VisibleRange,
  maximum = MAX_OCCURRENCES_PER_EXPANSION,
) {
  const occurrences: EventOccurrence[] = [];

  for (const event of events) {
    const remaining = maximum - occurrences.length;
    if (remaining <= 0) {
      break;
    }
    occurrences.push(...expandEventInRange(event, range, remaining));
  }

  return occurrences.sort((left, right) => {
    const startDifference = compareStarts(left.startsAt, right.startsAt);
    return startDifference || left.title.localeCompare(right.title);
  });
}
