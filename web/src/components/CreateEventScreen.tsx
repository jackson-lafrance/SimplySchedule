import { useMemo, useState, type FormEvent } from "react";

import { useModalDialog } from "@/components/useModalDialog";
import {
  DEFAULT_EVENT_COLOR,
  DEFAULT_TASK_COLOR,
  SCHEDULE_COLORS,
  type ScheduleColor,
} from "@/domain/colors";
import {
  createEventInputFromDraft,
  previewEventOccurrences,
  recurrenceSummary,
  weekdayForDateKey,
  type CalendarPattern,
  type EventDraft,
  type RepeatFrequency,
} from "@/domain/eventForm";
import type { CreateEventInput, RecurrenceTerminationType } from "@/domain/events";
import { createTaskInputFromDraft } from "@/domain/taskForm";
import type { CreateTaskInput } from "@/domain/tasks";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function initialDraft(date: string): EventDraft {
  const [, month, day] = date.split("-").map(Number);
  return {
    title: "",
    notes: "",
    date,
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    color: DEFAULT_EVENT_COLOR,
    repeatFrequency: "none",
    interval: "1",
    daysOfWeek: [weekdayForDateKey(date)],
    calendarPattern: "dayOfMonth",
    dayOfMonth: String(day),
    weekOfMonth: "1",
    ordinalWeekday: String(weekdayForDateKey(date)),
    monthOfYear: String(month),
    terminationType: "never",
    untilDate: date,
    occurrenceCount: "10",
  };
}

function ColorPicker({
  value,
  onChange,
}: {
  value: ScheduleColor;
  onChange: (value: ScheduleColor) => void;
}) {
  return (
    <fieldset className="color-picker">
      <legend>Color</legend>
      <div>
        {SCHEDULE_COLORS.map((color) => (
          <label key={color.key} title={color.label}>
            <input
              aria-label={color.label}
              checked={value === color.key}
              name="schedule-color"
              onChange={() => onChange(color.key)}
              type="radio"
            />
            <span style={{ backgroundColor: color.value }}>
              {value === color.key ? "✓" : ""}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DiscardChangesDialog({
  onDiscard,
  onKeepEditing,
}: {
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  const dialogRef = useModalDialog(onKeepEditing);

  return (
    <div
      className="discard-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onKeepEditing();
        }
      }}
      role="presentation"
    >
      <section
        aria-describedby="discard-description"
        aria-labelledby="discard-title"
        aria-modal="true"
        className="discard-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <p className="eyebrow">Unsaved changes</p>
        <h2 id="discard-title">Discard changes?</h2>
        <p id="discard-description">
          Your schedule item has not been saved.
        </p>
        <div className="discard-actions">
          <button
            className="primary-button"
            data-initial-focus
            onClick={onKeepEditing}
            type="button"
          >
            Keep editing
          </button>
          <button
            className="destructive-button"
            onClick={onDiscard}
            type="button"
          >
            Discard
          </button>
        </div>
      </section>
    </div>
  );
}

export default function CreateEventScreen({
  initialDate,
  onCancel,
  onSaveEvent,
  onSaveTask,
}: {
  initialDate: string;
  onCancel: () => void;
  onSaveEvent: (event: CreateEventInput) => Promise<void>;
  onSaveTask: (task: CreateTaskInput) => Promise<void>;
}) {
  const [initialValues] = useState(() => initialDraft(initialDate));
  const [mode, setMode] = useState<"event" | "task">("event");
  const [draft, setDraft] = useState(initialValues);
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeZone = browserTimeZone();
  const dirty =
    mode !== "event" || JSON.stringify(draft) !== JSON.stringify(initialValues);
  const requestCancel = () => {
    if (saving) {
      return;
    }
    if (dirty) {
      setDiscarding(true);
    } else {
      onCancel();
    }
  };
  const dialogRef = useModalDialog(requestCancel);

  const update = <Field extends keyof EventDraft>(
    field: Field,
    value: EventDraft[Field],
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const selectMode = (nextMode: "event" | "task") => {
    setMode(nextMode);
    update(
      "color",
      nextMode === "task" ? DEFAULT_TASK_COLOR : DEFAULT_EVENT_COLOR,
    );
  };

  const selectDate = (date: string) => {
    setDraft((current) => {
      const next = {
        ...current,
        date,
        untilDate: current.untilDate < date ? date : current.untilDate,
      };

      // Keep untouched defaults aligned with the anchor. Once recurrence is
      // enabled, selectors stay independent so users can intentionally anchor
      // before the first matching weekday/date.
      if (current.repeatFrequency === "none") {
        const [, month, day] = date.split("-").map(Number);
        try {
          const weekday = weekdayForDateKey(date);
          return {
            ...next,
            daysOfWeek: [weekday],
            dayOfMonth: String(day),
            ordinalWeekday: String(weekday),
            monthOfYear: String(month),
          };
        } catch {
          // Native date inputs can briefly emit an empty value while editing.
        }
      }

      return next;
    });
  };

  const toggleWeekday = (weekday: number) => {
    setDraft((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(weekday)
        ? current.daysOfWeek.filter((item) => item !== weekday)
        : [...current.daysOfWeek, weekday].sort((left, right) => left - right),
    }));
  };

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setErrorMessage(null);

    try {
      setSaving(true);
      if (mode === "task") {
        await onSaveTask(
          createTaskInputFromDraft({
            title: draft.title,
            notes: draft.notes,
            date: draft.date,
            time: draft.startTime,
            color: draft.color,
          }),
        );
      } else {
        await onSaveEvent(createEventInputFromDraft(draft, timeZone));
      }
    } catch (error) {
      setSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "THE SCHEDULE ITEM COULD NOT BE SAVED. TRY AGAIN.",
      );
    }
  };

  const repeats = mode === "event" && draft.repeatFrequency !== "none";
  const usesCalendarPattern =
    draft.repeatFrequency === "monthly" ||
    draft.repeatFrequency === "yearly";
  const previewDates = useMemo(() => {
    if (mode !== "event" || !repeats) {
      return [];
    }
    try {
      const input = createEventInputFromDraft(
        { ...draft, title: draft.title.trim() || "Event preview" },
        timeZone,
      );
      return previewEventOccurrences(input);
    } catch {
      return [];
    }
  }, [draft, mode, repeats, timeZone]);
  const previewFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: draft.allDay ? undefined : "numeric",
        minute: draft.allDay ? undefined : "2-digit",
        timeZone,
      }),
    [draft.allDay, timeZone],
  );

  return (
    <div
      className="sheet-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestCancel();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby="create-schedule-title"
        aria-modal="true"
        className="create-event-sheet"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="sheet-header">
          <h2 id="create-schedule-title">New schedule</h2>
          <button
            aria-label="Close schedule editor"
            className="plain-icon-button"
            disabled={saving}
            onClick={requestCancel}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="event-form" onSubmit={submit}>
          <div className="form-scroll">
            <div aria-label="Schedule type" className="mode-switcher" role="group">
              {(["event", "task"] as const).map((option) => (
                <button
                  aria-pressed={mode === option}
                  className={mode === option ? "mode-active" : ""}
                  key={option}
                  onClick={() => selectMode(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>

            <label className="form-field form-field-wide title-field">
              <span>Title</span>
              <input
                data-initial-focus
                maxLength={200}
                onChange={(event) => update("title", event.target.value)}
                placeholder={mode === "task" ? "WHAT NEEDS DOING?" : "WHAT IS HAPPENING?"}
                required
                type="text"
                value={draft.title}
              />
            </label>

            <div className="quick-fields">
              <label className="form-field">
                <span>{mode === "task" ? "Due date" : "Start date"}</span>
                <input
                  onChange={(event) => selectDate(event.target.value)}
                  required
                  type="date"
                  value={draft.date}
                />
              </label>
              {mode === "event" ? (
                <label className="toggle-field">
                  <input
                    checked={draft.allDay}
                    onChange={(event) => update("allDay", event.target.checked)}
                    type="checkbox"
                  />
                  <span>All day</span>
                </label>
              ) : null}
            </div>

            {mode === "task" ? (
              <div className="quick-fields">
                <label className="form-field">
                  <span>Due time</span>
                  <input
                    onChange={(event) => update("startTime", event.target.value)}
                    required
                    type="time"
                    value={draft.startTime}
                  />
                </label>
              </div>
            ) : !draft.allDay ? (
              <div className="quick-fields">
                <label className="form-field">
                  <span>Starts</span>
                  <input
                    onChange={(event) => update("startTime", event.target.value)}
                    required
                    type="time"
                    value={draft.startTime}
                  />
                </label>
                <label className="form-field">
                  <span>Ends</span>
                  <input
                    onChange={(event) => update("endTime", event.target.value)}
                    required
                    type="time"
                    value={draft.endTime}
                  />
                </label>
              </div>
            ) : null}

            <ColorPicker value={draft.color} onChange={(color) => update("color", color)} />

            {mode === "event" ? (
              <section className="repeat-builder" aria-labelledby="repeat-title">
                <div className="form-section-heading">
                  <h3 id="repeat-title">Repeat</h3>
                  {repeats ? <span className="repeat-glyph">↻</span> : null}
                </div>

              <div className="repeat-frequency-row">
                {repeats ? (
                  <label className="form-field interval-field">
                    <span>Every</span>
                    <input
                      aria-label="Repeat interval"
                      max={99}
                      min={1}
                      onChange={(event) => update("interval", event.target.value)}
                      type="number"
                      value={draft.interval}
                    />
                  </label>
                ) : null}
                <label className="form-field form-field-wide">
                  <span>{repeats ? "Unit" : "Pattern"}</span>
                  <select
                    aria-label="Repeat unit"
                    onChange={(event) =>
                      update(
                        "repeatFrequency",
                        event.target.value as RepeatFrequency,
                      )
                    }
                    value={draft.repeatFrequency}
                  >
                    <option value="none">Does not repeat</option>
                    <option value="hourly">Hour(s)</option>
                    <option value="daily">Day(s)</option>
                    <option value="weekly">Week(s)</option>
                    <option value="monthly">Month(s)</option>
                    <option value="yearly">Year(s)</option>
                  </select>
                </label>
              </div>

              {draft.repeatFrequency === "weekly" ? (
                <fieldset className="weekday-picker">
                  <legend>On weekdays</legend>
                  <div>
                    {WEEKDAYS.map((label, weekday) => (
                      <label key={`${label}-${weekday}`}>
                        <input
                          checked={draft.daysOfWeek.includes(weekday)}
                          onChange={() => toggleWeekday(weekday)}
                          type="checkbox"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {usesCalendarPattern ? (
                <div className="calendar-rule-fields">
                  {draft.repeatFrequency === "yearly" ? (
                    <label className="form-field">
                      <span>Month</span>
                      <select
                        onChange={(event) =>
                          update("monthOfYear", event.target.value)
                        }
                        value={draft.monthOfYear}
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="form-field">
                    <span>Monthly pattern</span>
                    <select
                      onChange={(event) =>
                        update(
                          "calendarPattern",
                          event.target.value as CalendarPattern,
                        )
                      }
                      value={draft.calendarPattern}
                    >
                      <option value="dayOfMonth">Date of month</option>
                      <option value="ordinalWeekday">Ordinal weekday</option>
                    </select>
                  </label>
                  {draft.calendarPattern === "dayOfMonth" ? (
                    <label className="form-field">
                      <span>Date</span>
                      <select
                        aria-label="Day of month"
                        onChange={(event) =>
                          update("dayOfMonth", event.target.value)
                        }
                        value={draft.dayOfMonth}
                      >
                        {Array.from({ length: 31 }, (_, index) => (
                          <option key={index + 1} value={index + 1}>{index + 1}</option>
                        ))}
                        <option value="-1">Last day</option>
                      </select>
                    </label>
                  ) : (
                    <>
                      <label className="form-field">
                        <span>Which</span>
                        <select
                          aria-label="Week of month"
                          onChange={(event) =>
                            update("weekOfMonth", event.target.value)
                          }
                          value={draft.weekOfMonth}
                        >
                          <option value="1">First</option>
                          <option value="2">Second</option>
                          <option value="3">Third</option>
                          <option value="4">Fourth</option>
                          <option value="5">Fifth</option>
                          <option value="-1">Last</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span>Weekday</span>
                        <select
                          aria-label="Ordinal weekday"
                          onChange={(event) =>
                            update("ordinalWeekday", event.target.value)
                          }
                          value={draft.ordinalWeekday}
                        >
                          {[
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ].map((weekday, index) => (
                            <option key={weekday} value={index}>{weekday}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>
              ) : null}

              {repeats ? (
                <>
                  <div className="repeat-summary" role="status">
                    <strong>{recurrenceSummary(draft)}</strong>
                  </div>
                  {previewDates.length > 0 ? (
                    <div className="occurrence-preview">
                      <p>Next occurrences</p>
                      <ol aria-label="Next recurrence dates">
                        {previewDates.map((date) => (
                          <li key={date.toISOString()}>
                            <time dateTime={date.toISOString()}>
                              {previewFormatter.format(date)}
                            </time>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  <div className="termination-fields">
                    <label className="form-field">
                      <span>Ends</span>
                      <select
                        aria-label="Repeat ends"
                        onChange={(event) =>
                          update(
                            "terminationType",
                            event.target.value as RecurrenceTerminationType,
                          )
                        }
                        value={draft.terminationType}
                      >
                        <option value="never">Never</option>
                        <option value="onDate">On a date</option>
                        <option value="afterOccurrences">After count</option>
                      </select>
                    </label>
                    {draft.terminationType === "onDate" ? (
                      <label className="form-field">
                        <span>Through date</span>
                        <input
                          min={draft.date}
                          onChange={(event) =>
                            update("untilDate", event.target.value)
                          }
                          required
                          type="date"
                          value={draft.untilDate}
                        />
                      </label>
                    ) : null}
                    {draft.terminationType === "afterOccurrences" ? (
                      <label className="form-field">
                        <span>Occurrences</span>
                        <input
                          max={999}
                          min={1}
                          onChange={(event) =>
                            update("occurrenceCount", event.target.value)
                          }
                          required
                          type="number"
                          value={draft.occurrenceCount}
                        />
                      </label>
                    ) : null}
                  </div>
                </>
              ) : null}
              </section>
            ) : null}

            <button
              aria-expanded={showMore}
              className="disclosure-button"
              onClick={() => setShowMore((current) => !current)}
              type="button"
            >
              {showMore ? "− Fewer details" : "+ More details"}
            </button>

            {showMore ? (
              <section className="optional-details">
                <label className="form-field form-field-wide">
                  <span>Notes</span>
                  <textarea
                    maxLength={5_000}
                    onChange={(event) => update("notes", event.target.value)}
                    placeholder="ADD THE USEFUL DETAILS."
                    rows={3}
                    value={draft.notes}
                  />
                </label>
              </section>
            ) : null}

            {errorMessage ? (
              <div className="form-error" role="alert">{errorMessage}</div>
            ) : null}
          </div>

          <div className="form-actions">
            <button
              className="outline-button"
              disabled={saving}
              onClick={requestCancel}
              type="button"
            >
              Cancel
            </button>
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Saving…" : `Save ${mode}`}
            </button>
          </div>
        </form>
        {discarding ? (
          <DiscardChangesDialog
            onDiscard={onCancel}
            onKeepEditing={() => setDiscarding(false)}
          />
        ) : null}
      </section>
    </div>
  );
}
