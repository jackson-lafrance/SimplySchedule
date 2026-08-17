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
  return (
    <div className="screen settings-screen">
      <header className="screen-heading">
        <h1>Settings</h1>
      </header>

      <div className="settings-list">
        <div className="setting-card">
          <span>
            <strong>Week start</strong>
            <small>Used by Home, week, and month views.</small>
          </span>
          <div aria-label="Week starts on" className="settings-toggle" role="group">
            {([1, 0] as WeekStart[]).map((value) => (
              <button
                aria-pressed={weekStartsOn === value}
                className={weekStartsOn === value ? "toggle-active" : ""}
                key={value}
                onClick={() => onWeekStartChange(value)}
                type="button"
              >
                {value === 1 ? "Monday" : "Sunday"}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-card">
          <span>
            <strong>Default calendar view</strong>
            <small>Saved in this browser.</small>
          </span>
          <div
            aria-label="Default calendar view"
            className="settings-toggle"
            role="group"
          >
            {(["day", "week", "month"] as CalendarView[]).map((view) => (
              <button
                aria-pressed={calendarView === view}
                className={calendarView === view ? "toggle-active" : ""}
                key={view}
                onClick={() => onCalendarViewChange(view)}
                type="button"
              >
                {view}
              </button>
            ))}
          </div>
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
