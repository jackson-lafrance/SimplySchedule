import type { EventOccurrence, VisibleRange } from "@/domain/events";

export const WEEK_STARTS_ON = 0;
export const DAYS_IN_MONTH_GRID = 42;

export type CalendarDay = {
  date: Date;
  key: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type AgendaDay = {
  day: CalendarDay;
  events: EventOccurrence[];
};

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function addDateKeyDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function dateKeyInTimeZone(date: Date, timeZone: string) {
  let formatter = dateFormatters.get(timeZone);

  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        timeZone,
        year: "numeric",
      });
      dateFormatters.set(timeZone, formatter);
    } catch {
      return localDateKey(date);
    }
  }

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day
    ? `${year}-${month}-${day}`
    : localDateKey(date);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + amount,
    12,
  );
}

export function startOfWeek(date: Date, weekStartsOn = WEEK_STARTS_ON) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const offset = (day.getDay() - weekStartsOn + 7) % 7;
  return addDays(day, -offset);
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function visibleRangeForDay(date: Date): VisibleRange {
  const start = startOfDay(date);
  return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) };
}

export function visibleRangeForWeek(date: Date): VisibleRange {
  const weekStart = startOfWeek(date);
  return {
    start: startOfDay(weekStart),
    end: startOfDay(addDays(weekStart, 7)),
  };
}

export function visibleRangeForDays(date: Date, dayCount: number): VisibleRange {
  const start = startOfDay(date);
  return {
    start,
    end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + dayCount),
  };
}

export function visibleRangeForMonth(anchorDate: Date): VisibleRange {
  const days = getMonthDays(anchorDate);
  const first = days[0].date;
  const last = days[days.length - 1].date;

  return {
    start: new Date(first.getFullYear(), first.getMonth(), first.getDate()),
    end: new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() + 1,
    ),
  };
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

export function getMonthDays(
  anchorDate: Date,
  today = new Date(),
  weekStartsOn = WEEK_STARTS_ON,
): CalendarDay[] {
  const monthStart = startOfMonth(anchorDate);
  const leadingDays = (monthStart.getDay() - weekStartsOn + 7) % 7;
  const gridStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 - leadingDays,
    12,
  );
  const todayKey = localDateKey(today);

  return Array.from({ length: DAYS_IN_MONTH_GRID }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
      12,
    );
    const key = localDateKey(date);

    return {
      date,
      key,
      dayNumber: date.getDate(),
      isCurrentMonth:
        date.getFullYear() === monthStart.getFullYear() &&
        date.getMonth() === monthStart.getMonth(),
      isToday: key === todayKey,
    };
  });
}

export function eventOccursOnDate(event: EventOccurrence, date: Date) {
  if (event.allDay) {
    const selectedKey = localDateKey(date);
    const startKey = dateKeyInTimeZone(event.startsAt, event.timeZone);
    const providedEndKey = event.endsAt
      ? dateKeyInTimeZone(event.endsAt, event.timeZone)
      : null;
    const endKey =
      providedEndKey && providedEndKey > startKey
        ? providedEndKey
        : addDateKeyDays(startKey, 1);

    return selectedKey >= startKey && selectedKey < endKey;
  }

  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayEnd = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  );

  if (!event.endsAt) {
    return event.startsAt >= dayStart && event.startsAt < dayEnd;
  }

  return event.startsAt < dayEnd && event.endsAt > dayStart;
}

export function sortEvents(events: EventOccurrence[]) {
  return [...events].sort((left, right) => {
    if (left.allDay !== right.allDay) {
      return left.allDay ? -1 : 1;
    }

    const startDifference = left.startsAt.getTime() - right.startsAt.getTime();
    return startDifference || left.title.localeCompare(right.title);
  });
}

export function eventsForDate(events: EventOccurrence[], date: Date) {
  return sortEvents(events.filter((event) => eventOccursOnDate(event, date)));
}

export function getAgendaForDays(
  startDate: Date,
  dayCount: number,
  events: EventOccurrence[],
  today = new Date(),
  includeEmpty = false,
): AgendaDay[] {
  const todayKey = localDateKey(today);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(startDate, index);
    const key = localDateKey(date);

    return {
      day: {
        date,
        key,
        dayNumber: date.getDate(),
        isCurrentMonth: true,
        isToday: key === todayKey,
      },
      events: eventsForDate(events, date),
    };
  }).filter((agendaDay) => includeEmpty || agendaDay.events.length > 0);
}

export function getWeekDays(
  anchorDate: Date,
  events: EventOccurrence[],
  today = new Date(),
) {
  return getAgendaForDays(startOfWeek(anchorDate), 7, events, today, true);
}

export function getMonthAgenda(
  anchorDate: Date,
  events: EventOccurrence[],
  today = new Date(),
): AgendaDay[] {
  const monthStart = startOfMonth(anchorDate);
  const dayCount = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();
  return getAgendaForDays(monthStart, dayCount, events, today);
}

export function countEventsInMonth(anchorDate: Date, events: EventOccurrence[]) {
  return getMonthAgenda(anchorDate, events).reduce(
    (count, day) => count + day.events.length,
    0,
  );
}
