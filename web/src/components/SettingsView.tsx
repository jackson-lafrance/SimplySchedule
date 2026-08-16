import type { WeekStart } from "@/domain/calendar";
import type {
  CalendarView,
} from "@/domain/events";
import type {
  ScheduleSource,
  ScheduleStatus,
} from "@/context/scheduleContextValue";

export default function SettingsView({
  calendarView,
  onCalendarViewChange,
  onWeekStartChange,
  source,
  status,
  weekStartsOn,
}: {
  calendarView: CalendarView;
  onCalendarViewChange: (view: CalendarView) => void;
  onWeekStartChange: (value: WeekStart) => void;
  source: ScheduleSource;
  status: ScheduleStatus;
  weekStartsOn: WeekStart;
}) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return (
    <div className="screen settings-screen">
      <header className="screen-heading">
        <p className="eyebrow">Simply Schedule</p>
        <h1>Settings</h1>
        <p className="screen-summary">A FEW USEFUL DEFAULTS.</p>
      </header>

      <div className="settings-list">
        <label className="setting-card">
          <span>
            <strong>Week start</strong>
            <small>Used by Home, week, and month views.</small>
          </span>
          <select
            aria-label="Week starts on"
            onChange={(event) =>
              onWeekStartChange(event.target.value === "0" ? 0 : 1)
            }
            value={weekStartsOn}
          >
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </select>
        </label>

        <label className="setting-card">
          <span>
            <strong>Default calendar view</strong>
            <small>Saved in this browser for the next time you open Calendar.</small>
          </span>
          <select
            aria-label="Default calendar view"
            onChange={(event) =>
              onCalendarViewChange(event.target.value as CalendarView)
            }
            value={calendarView}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>

        <div className="setting-card">
          <span>
            <strong>Calendar timezone</strong>
            <small>Recurrence follows this local wall clock across DST.</small>
          </span>
          <code>{timeZone}</code>
        </div>

        <div className="setting-card">
          <span>
            <strong>Schedule data</strong>
            <small>
              {source === "firebase"
                ? "Anonymous Firebase account"
                : "This browser session only"}
            </small>
          </span>
          <span className={`status-word status-word-${status}`}>
            {status === "loading" ? "Syncing" : status === "error" ? "Error" : "Ready"}
          </span>
        </div>
      </div>

      <p className="settings-version">SIMPLY SCHEDULE · WEB 0.1.0</p>
    </div>
  );
}
