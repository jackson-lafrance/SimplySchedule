import { useEffect, useMemo, useState } from "react";

import AgendaRows from "@/components/AgendaRows";
import CreateEventScreen from "@/components/CreateEventScreen";
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
  tasksForDate,
  visibleRangeForDay,
  visibleRangeForMonth,
  visibleRangeForWeek,
  type CalendarDay,
  type WeekStart,
} from "@/domain/calendar";
import type { CalendarView, CreateEventInput } from "@/domain/events";
import type { CreateTaskInput } from "@/domain/tasks";
import { expandEventsInRange } from "@/domain/recurrence";

type AppSection = "home" | "calendar" | "settings";
type IconName = AppSection | "profile";

const CALENDAR_VIEW_STORAGE_KEY = "simplySchedule:calendarView";
const WEEK_START_STORAGE_KEY = "simplySchedule:weekStartsOn";

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

function storedWeekStart(): WeekStart {
  try {
    return window.localStorage.getItem(WEEK_START_STORAGE_KEY) === "0" ? 0 : 1;
  } catch {
    return 1;
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
  return <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-5 4-7 8-7s7 2 8 7" /></>;
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

function titleForRange(
  view: CalendarView,
  selectedDate: Date,
  weekStartsOn: WeekStart,
) {
  if (view === "day") {
    return fullDateFormatter.format(selectedDate);
  }
  if (view === "month") {
    return monthFormatter.format(selectedDate);
  }

  const weekStart = startOfWeek(selectedDate, weekStartsOn);
  const weekEnd = addDays(weekStart, 6);
  return `${shortDateFormatter.format(weekStart)} – ${shortDateFormatter.format(weekEnd)}`;
}

export default function App() {
  const {
    events,
    tasks,
    status,
    source,
    errorMessage,
    lastUpdatedAt,
    completeTask,
    createEvent,
    createTask,
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
  const [weekStartsOn, setWeekStartsOnState] = useState<WeekStart>(
    storedWeekStart,
  );
  const setWeekStartsOn = (value: WeekStart) => {
    setWeekStartsOnState(value);
    try {
      window.localStorage.setItem(WEEK_START_STORAGE_KEY, String(value));
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
      return visibleRangeForWeek(today, weekStartsOn);
    }
    if (calendarView === "day") {
      return visibleRangeForDay(selectedDate);
    }
    if (calendarView === "week") {
      return visibleRangeForWeek(selectedDate, weekStartsOn);
    }
    return visibleRangeForMonth(selectedDate, weekStartsOn);
  }, [activeSection, calendarView, selectedDate, today, weekStartsOn]);

  useEffect(() => setVisibleRange(visibleRange), [setVisibleRange, visibleRange]);

  const occurrences = useMemo(
    () => expandEventsInRange(events, visibleRange),
    [events, visibleRange],
  );
  const selectedEvents = useMemo(
    () => eventsForDate(occurrences, selectedDate),
    [occurrences, selectedDate],
  );
  const selectedTasks = useMemo(
    () => tasksForDate(tasks, selectedDate),
    [selectedDate, tasks],
  );
  const monthDays = useMemo(
    () => getMonthDays(selectedDate, today, weekStartsOn),
    [selectedDate, today, weekStartsOn],
  );
  const weekDays = useMemo(
    () => getWeekDays(selectedDate, occurrences, today, weekStartsOn),
    [occurrences, selectedDate, today, weekStartsOn],
  );

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

  const saveTask = async (input: CreateTaskInput) => {
    await createTask(input);
    setSelectedDate(
      new Date(
        input.dueAt.getFullYear(),
        input.dueAt.getMonth(),
        input.dueAt.getDate(),
        12,
      ),
    );
    setSaveMessage("TASK SAVED.");
    setCreatingEvent(false);
    setActiveSection("home");
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
        </button>
      </header>

      <div className="app-body">
        <aside className="navigation-shelf">
          <button
            aria-label="+ SCHEDULE"
            className="add-event-button"
            onClick={openCreateEvent}
            type="button"
          >
            <span>+ SCHEDULE</span>
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
            <HomeView
              completeTask={completeTask}
              occurrences={occurrences}
              tasks={tasks}
              today={today}
              weekStartsOn={weekStartsOn}
            />
          ) : null}

          {activeSection === "calendar" ? (
            <div className="screen calendar-screen">
              <header className="screen-heading calendar-screen-heading">
                <h1>Calendar</h1>
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
                    <h2>
                      {titleForRange(calendarView, selectedDate, weekStartsOn)}
                    </h2>
                  </div>
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
                    <AgendaRows
                      events={selectedEvents}
                      onCompleteTask={completeTask}
                      tasks={selectedTasks}
                    />
                  </div>
                ) : null}

                {calendarView === "week" ? (
                  <WeekView
                    completeTask={completeTask}
                    days={weekDays}
                    tasks={tasks}
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
                      tasks={tasks}
                      onSelectDay={selectMonthDay}
                      selectedKey={localDateKey(selectedDate)}
                      weekStartsOn={weekStartsOn}
                    />
                    <section className="month-selected-day">
                      <div className="section-heading">
                        <h2>{fullDateFormatter.format(selectedDate)}</h2>
                      </div>
                      <AgendaRows
                        events={selectedEvents}
                        onCompleteTask={completeTask}
                        tasks={selectedTasks}
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
              onWeekStartChange={setWeekStartsOn}
              source={source}
              status={status}
              weekStartsOn={weekStartsOn}
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
          onSaveEvent={saveEvent}
          onSaveTask={saveTask}
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
