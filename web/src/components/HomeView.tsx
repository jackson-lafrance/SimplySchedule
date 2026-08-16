import { useEffect, useMemo, useRef } from "react";

import AgendaRows from "@/components/AgendaRows";
import {
  getWeekDays,
  localDateKey,
  tasksForDate,
  type WeekStart,
} from "@/domain/calendar";
import type { EventOccurrence } from "@/domain/events";
import type { ScheduleTask } from "@/domain/tasks";

const sectionFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export default function HomeView({
  occurrences,
  tasks,
  today,
  weekStartsOn,
}: {
  occurrences: EventOccurrence[];
  tasks: ScheduleTask[];
  today: Date;
  weekStartsOn: WeekStart;
}) {
  const days = useMemo(
    () => getWeekDays(today, occurrences, today, weekStartsOn),
    [occurrences, today, weekStartsOn],
  );
  const todayKey = localDateKey(today);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentDayRef = useRef<HTMLElement | null>(null);
  const itemCount = days.reduce(
    (count, { day, events }) =>
      count + events.length + tasksForDate(tasks, day.date).length,
    0,
  );

  useEffect(() => {
    if (!window.matchMedia("(max-width: 720px)").matches) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const scroll = scrollRef.current;
      const currentDay = currentDayRef.current;
      if (scroll && currentDay) {
        scroll.scrollTop = Math.max(
          0,
          currentDay.offsetTop - scroll.offsetTop - 8,
        );
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [todayKey]);

  return (
    <div className="screen weekly-home-screen">
      <header className="screen-heading weekly-home-heading">
        <p className="eyebrow">Current week</p>
        <h1>This week</h1>
        <p className="screen-summary">
          {shortDateFormatter.format(days[0].day.date)}–
          {shortDateFormatter.format(days[days.length - 1].day.date)} · {itemCount}{" "}
          {itemCount === 1 ? "ITEM" : "ITEMS"}
        </p>
      </header>

      <div
        aria-label="Current week agenda"
        className="weekly-agenda-scroll"
        ref={scrollRef}
        role="region"
        tabIndex={0}
      >
        <div className="weekly-agenda-sections">
          {days.map(({ day, events }) => {
            const current = day.key === todayKey;
            const dayTasks = tasksForDate(tasks, day.date);
            return (
              <section
                aria-current={current ? "date" : undefined}
                className={`agenda-date-section ${
                  current ? "agenda-date-current" : ""
                }`}
                data-date={day.key}
                key={day.key}
                ref={current ? currentDayRef : undefined}
              >
                <h2>{sectionFormatter.format(day.date)}</h2>
                <AgendaRows events={events} tasks={dayTasks} />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
