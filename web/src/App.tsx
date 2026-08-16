import { useEffect, useMemo, useState } from "react";

import CreateEventScreen from "@/components/CreateEventScreen";
import EventList from "@/components/EventList";
import HomeView from "@/components/HomeView";
import MonthGrid from "@/components/MonthGrid";
import ProfilePanel from "@/components/ProfilePanel";
import SettingsView from "@/components/SettingsView";
import WeekView from "@/components/WeekView";
import { useSchedule } from "@/context/useSchedule";
import {
  addDays,
  addMonths,
  eventsForDate,
  getMonthDays,
  getWeekDays,
  localDateKey,
  startOfMonth,
  startOfWeek,
  visibleRangeForDay,
  visibleRangeForDays,
  visibleRangeForMonth,
  visibleRangeForWeek,
  type CalendarDay,
} from "@/domain/calendar";
import type { CalendarView, CreateEventInput } from "@/domain/events";
import { expandEventsInRange } from "@/domain/recurrence";

type AppSection = "home" | "calendar" | "settings";
type IconName = AppSection | "profile" | "add";

const CALENDAR_VIEW_STORAGE_KEY = "simplySchedule:calendarView";

function storedCalendarView(): CalendarView {
  try {
    const value = window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    return value === "day" || value === "week" || value === "month"
      ? value
      : "week";
  } catch {
    return "week";
  }
}

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function NavigationIcon({ name }: { name: IconName }) {
  if (name === "home") {
    return <path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z" />;
  }
  if (name === "calendar") {
    return <path d="M5 3v3m14-3v3M4 8h16v13H4zM4 12h16" />;
  }
  if (name === "settings") {
    return (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" />
      </>
    );
  }
  if (name === "profile") {
    return <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-5 4-7 8-7s7 2 8 7" /></>;
  }
  return <path d="M12 5v14M5 12h14" />;
}

function Icon({ name }: { name: IconName }) {
  return (
    <svg aria-hidden="true" className="nav-icon" fill="none" viewBox="0 0 24 24">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <NavigationIcon name={name} />
      </g>
    </svg>
  );
}

function titleForRange(view: CalendarView, selectedDate: Date) {
  if (view === "day") {
    return fullDateFormatter.format(selectedDate);
  }
  if (view === "month") {
    return monthFormatter.format(selectedDate);
  }

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  return `${shortDateFormatter.format(weekStart)} – ${shortDateFormatter.format(weekEnd)}`;
}

export default function App() {
  const {
    events,
    status,
    source,
    errorMessage,
    lastUpdatedAt,
    createEvent,
    setVisibleRange,
    retry,
  } = useSchedule();
  const [today] = useState(() => new Date());
  const [activeSection, setActiveSection] = useState<AppSection>("home");
  const [calendarView, setCalendarViewState] = useState<CalendarView>(
    storedCalendarView,
  );
  const setCalendarView = (view: CalendarView) => {
    setCalendarViewState(view);
    try {
      window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, view);
    } catch {
      // The current session still works when browser storage is unavailable.
    }
  };
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12),
  );
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const visibleRange = useMemo(() => {
    if (activeSection !== "calendar") {
      return visibleRangeForDays(today, 8);
    }
    if (calendarView === "day") {
      return visibleRangeForDay(selectedDate);
    }
    if (calendarView === "week") {
      return visibleRangeForWeek(selectedDate);
    }
    return visibleRangeForMonth(selectedDate);
  }, [activeSection, calendarView, selectedDate, today]);

  useEffect(() => setVisibleRange(visibleRange), [setVisibleRange, visibleRange]);

  const occurrences = useMemo(
    () => expandEventsInRange(events, visibleRange),
    [events, visibleRange],
  );
  const selectedEvents = useMemo(
    () => eventsForDate(occurrences, selectedDate),
    [occurrences, selectedDate],
  );
  const monthDays = useMemo(
    () => getMonthDays(selectedDate, today),
    [selectedDate, today],
  );
  const weekDays = useMemo(
    () => getWeekDays(selectedDate, occurrences, today),
    [occurrences, selectedDate, today],
  );

  const goToToday = () => {
    const now = new Date();
    setSelectedDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12),
    );
  };

  const moveCalendar = (amount: number) => {
    if (calendarView === "day") {
      setSelectedDate((date) => addDays(date, amount));
    } else if (calendarView === "week") {
      setSelectedDate((date) => addDays(date, amount * 7));
    } else {
      setSelectedDate((date) => addMonths(startOfMonth(date), amount));
    }
  };

  const selectMonthDay = (day: CalendarDay) => setSelectedDate(day.date);

  const saveEvent = async (input: CreateEventInput) => {
    await createEvent(input);
    const eventDate = new Date(
      input.startsAt.getFullYear(),
      input.startsAt.getMonth(),
      input.startsAt.getDate(),
      12,
    );
    setSelectedDate(eventDate);
    setSaveMessage(input.kind === "repeating" ? "REPEATING EVENT SAVED." : "EVENT SAVED.");
    setCreatingEvent(false);
  };

  const openCreateEvent = () => {
    setSaveMessage(null);
    setCreatingEvent(true);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          aria-label="Simply Schedule home"
          className="wordmark"
          onClick={() => setActiveSection("home")}
          type="button"
        >
          SimplySchedule
        </button>
        <button
          aria-label="Open profile"
          className="profile-control"
          onClick={() => setProfileOpen(true)}
          type="button"
        >
          <Icon name="profile" />
          <span>Profile</span>
          <i className={`sync-dot sync-dot-${status}`} aria-hidden="true" />
        </button>
      </header>

      <div className="app-body">
        <aside className="navigation-shelf">
          <button className="add-event-button" onClick={openCreateEvent} type="button">
            <Icon name="add" />
            <span>Add event</span>
          </button>
          <nav className="section-tabs" aria-label="Primary navigation">
            {(["home", "calendar", "settings"] as AppSection[]).map((section) => (
              <button
                aria-current={activeSection === section ? "page" : undefined}
                className={activeSection === section ? "tab-active" : ""}
                key={section}
                onClick={() => setActiveSection(section)}
                type="button"
              >
                <Icon name={section} />
                <span>{section}</span>
              </button>
            ))}
          </nav>
          <p className="shelf-source">
            <span className={`sync-dot sync-dot-${status}`} aria-hidden="true" />
            {source === "firebase" ? "FIREBASE" : "LOCAL PREVIEW"}
          </p>
        </aside>

        <main className="main-content">
          {saveMessage ? (
            <div className="save-toast" role="status">{saveMessage}</div>
          ) : null}
          {status === "error" ? (
            <div className="notice notice-error" role="alert">
              <span>{errorMessage}</span>
              <button onClick={retry} type="button">Retry</button>
            </div>
          ) : null}

          {activeSection === "home" ? (
            <HomeView occurrences={occurrences} today={today} />
          ) : null}

          {activeSection === "calendar" ? (
            <div className="screen calendar-screen">
              <header className="screen-heading calendar-screen-heading">
                <div>
                  <p className="eyebrow">Your schedule</p>
                  <h1>Calendar</h1>
                  <p className="screen-summary">DAY, WEEK, OR MONTH. NOTHING EXTRA.</p>
                </div>
                <div
                  aria-label="Calendar view"
                  className="view-switcher"
                  role="group"
                >
                  {(["day", "week", "month"] as CalendarView[]).map((view) => (
                    <button
                      aria-pressed={calendarView === view}
                      className={calendarView === view ? "view-active" : ""}
                      key={view}
                      onClick={() => setCalendarView(view)}
                      type="button"
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </header>

              <section className="calendar-surface" aria-label="Schedule calendar">
                <div className="calendar-toolbar">
                  <button
                    aria-label={`Previous ${calendarView}`}
                    className="icon-button"
                    onClick={() => moveCalendar(-1)}
                    type="button"
                  >
                    ←
                  </button>
                  <div>
                    <p className="eyebrow">Viewing</p>
                    <h2>{titleForRange(calendarView, selectedDate)}</h2>
                  </div>
                  <button className="today-button" onClick={goToToday} type="button">
                    Today
                  </button>
                  <button
                    aria-label={`Next ${calendarView}`}
                    className="icon-button"
                    onClick={() => moveCalendar(1)}
                    type="button"
                  >
                    →
                  </button>
                </div>

                {status === "loading" ? (
                  <div className="loading-rule" role="status"><span /> Loading schedule…</div>
                ) : null}

                {calendarView === "day" ? (
                  <div className="day-view">
                    <div className="section-heading">
                      <div>
                        <p className="eyebrow">Agenda</p>
                        <h2>{fullDateFormatter.format(selectedDate)}</h2>
                      </div>
                      <span className="section-count">{selectedEvents.length}</span>
                    </div>
                    <EventList
                      emptyMessage="NO EVENTS SCHEDULED."
                      events={selectedEvents}
                      showNotes
                    />
                  </div>
                ) : null}

                {calendarView === "week" ? (
                  <WeekView
                    days={weekDays}
                    onSelectDay={(date) => {
                      setSelectedDate(date);
                      setCalendarView("day");
                    }}
                  />
                ) : null}

                {calendarView === "month" ? (
                  <div className="month-view">
                    <MonthGrid
                      days={monthDays}
                      events={occurrences}
                      onSelectDay={selectMonthDay}
                      selectedKey={localDateKey(selectedDate)}
                    />
                    <section className="month-selected-day">
                      <div className="section-heading">
                        <div>
                          <p className="eyebrow">Selected day</p>
                          <h2>{fullDateFormatter.format(selectedDate)}</h2>
                        </div>
                        <span className="section-count">{selectedEvents.length}</span>
                      </div>
                      <EventList
                        emptyMessage="NO EVENTS SCHEDULED."
                        events={selectedEvents}
                      />
                    </section>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}

          {activeSection === "settings" ? (
            <SettingsView
              calendarView={calendarView}
              onCalendarViewChange={setCalendarView}
              source={source}
              status={status}
            />
          ) : null}
        </main>
      </div>

      {creatingEvent ? (
        <CreateEventScreen
          initialDate={localDateKey(
            activeSection === "calendar" ? selectedDate : today,
          )}
          onCancel={() => setCreatingEvent(false)}
          onSave={saveEvent}
        />
      ) : null}

      {profileOpen ? (
        <ProfilePanel
          lastUpdatedAt={lastUpdatedAt}
          onClose={() => setProfileOpen(false)}
          source={source}
          status={status}
        />
      ) : null}
    </div>
  );
}
