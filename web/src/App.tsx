import { useMemo, useState } from "react";

import AgendaView from "@/components/AgendaView";
import EventList from "@/components/EventList";
import MonthGrid from "@/components/MonthGrid";
import {
  addMonths,
  countEventsInMonth,
  eventsForDate,
  getMonthAgenda,
  getMonthDays,
  localDateKey,
  startOfMonth,
  type CalendarDay,
} from "@/domain/calendar";
import type { CalendarView } from "@/domain/events";
import { useSchedule } from "@/context/useSchedule";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const selectedDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric",
});

export default function App() {
  const {
    events,
    status,
    source,
    errorMessage,
    lastUpdatedAt,
    retry,
  } = useSchedule();
  const [today] = useState(() => new Date());
  const [anchorDate, setAnchorDate] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12),
  );
  const [view, setView] = useState<CalendarView>("month");

  const monthDays = useMemo(
    () => getMonthDays(anchorDate, today),
    [anchorDate, today],
  );
  const selectedEvents = useMemo(
    () => eventsForDate(events, selectedDate),
    [events, selectedDate],
  );
  const agenda = useMemo(
    () => getMonthAgenda(anchorDate, events, today),
    [anchorDate, events, today],
  );
  const scheduledEntryCount = useMemo(
    () => countEventsInMonth(anchorDate, events),
    [anchorDate, events],
  );

  const moveMonth = (amount: number) => {
    const nextMonth = addMonths(anchorDate, amount);
    setAnchorDate(nextMonth);
    setSelectedDate(nextMonth);
  };

  const goToToday = () => {
    const now = new Date();
    setAnchorDate(startOfMonth(now));
    setSelectedDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12),
    );
  };

  const selectDay = (day: CalendarDay) => {
    setSelectedDate(day.date);
    if (!day.isCurrentMonth) {
      setAnchorDate(startOfMonth(day.date));
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={goToToday}
          type="button"
          aria-label="Simply Schedule home"
        >
          <span className="brand-mark" aria-hidden="true">
            SS
          </span>
          <span className="brand-name">Simply Schedule</span>
        </button>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button
            className="nav-link nav-link-active"
            onClick={() => setView("month")}
            type="button"
          >
            Calendar
          </button>
          <button className="nav-link" onClick={goToToday} type="button">
            Today
          </button>
        </nav>

        <div
          className={`source-badge source-badge-${source} source-badge-${status}`}
          aria-live="polite"
        >
          <span aria-hidden="true" />
          {status === "loading"
            ? "SYNCING"
            : status === "error"
              ? "SYNC ERROR"
              : source === "firebase"
                ? "FIREBASE LIVE"
                : "LOCAL PREVIEW"}
        </div>
      </header>

      <main className="page-content">
        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Your schedule</p>
            <h1 id="page-title">{monthFormatter.format(anchorDate)}</h1>
            <p className="intro-copy">
              {scheduledEntryCount} scheduled {scheduledEntryCount === 1 ? "entry" : "entries"}
            </p>
          </div>
          <button className="primary-button" onClick={goToToday} type="button">
            Today
          </button>
        </section>

        {source === "preview" ? (
          <div className="notice notice-preview" role="status">
            <strong>LOCAL PREVIEW</strong>
            <span>
              Add the Vite Firebase environment values to view the shared schedule.
            </span>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="notice notice-error" role="alert">
            <span>{errorMessage}</span>
            <button onClick={retry} type="button">
              Retry
            </button>
          </div>
        ) : null}

        <section className="calendar-surface" aria-label="Schedule calendar">
          <div className="calendar-toolbar">
            <div className="month-navigation" aria-label="Month navigation">
              <button
                aria-label="Previous month"
                className="icon-button"
                onClick={() => moveMonth(-1)}
                type="button"
              >
                <span aria-hidden="true">←</span>
              </button>
              <div>
                <p className="eyebrow">Viewing</p>
                <h2>{monthFormatter.format(anchorDate)}</h2>
              </div>
              <button
                aria-label="Next month"
                className="icon-button"
                onClick={() => moveMonth(1)}
                type="button"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="view-switcher" aria-label="Calendar view">
              <button
                aria-pressed={view === "month"}
                className={view === "month" ? "view-active" : ""}
                onClick={() => setView("month")}
                type="button"
              >
                Month
              </button>
              <button
                aria-pressed={view === "agenda"}
                className={view === "agenda" ? "view-active" : ""}
                onClick={() => setView("agenda")}
                type="button"
              >
                Agenda
              </button>
            </div>
          </div>

          {status === "loading" ? (
            <div className="loading-rule" role="status">
              <span />
              Loading schedule…
            </div>
          ) : null}

          {view === "month" ? (
            <div className="month-layout">
              <MonthGrid
                days={monthDays}
                events={events}
                onSelectDay={selectDay}
                selectedKey={localDateKey(selectedDate)}
              />
              <aside className="selected-day" aria-labelledby="selected-day-title">
                <div className="selected-day-heading">
                  <p className="eyebrow">
                    {localDateKey(selectedDate) === localDateKey(today)
                      ? "Today"
                      : "Selected day"}
                  </p>
                  <h2 id="selected-day-title">
                    {selectedDateFormatter.format(selectedDate)}
                  </h2>
                  <span>
                    {selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}
                  </span>
                </div>
                <EventList
                  emptyMessage="NO EVENTS SCHEDULED."
                  events={selectedEvents}
                  showNotes
                />
              </aside>
            </div>
          ) : (
            <AgendaView agenda={agenda} />
          )}
        </section>

        <div className="data-note">
          <div>
            <p className="eyebrow">Calendar data</p>
            <p>
              {source === "firebase"
                ? "READING USER-SCOPED SINGLE EVENTS FROM FIRESTORE."
                : "SHOWING LOCAL VIEW-ONLY SAMPLE EVENTS."}
            </p>
          </div>
          <span>
            {lastUpdatedAt
              ? `UPDATED ${lastUpdatedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : fullDateFormatter.format(today)}
          </span>
        </div>
      </main>

      <footer className="site-footer">
        <span>Simply Schedule</span>
        <span>Calendar viewing pass · 0.2.0</span>
      </footer>
    </div>
  );
}
