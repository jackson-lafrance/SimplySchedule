import { useState, type FormEvent } from "react";

import {
  alignDateKeyForPreset,
  createEventInputFromDraft,
  recurrencePresetSummary,
  type EventDraft,
  type RecurrencePreset,
} from "@/domain/eventForm";
import type { CreateEventInput, RecurrenceTerminationType } from "@/domain/events";

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function initialDraft(date: string): EventDraft {
  return {
    title: "",
    notes: "",
    date,
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    recurrencePreset: "none",
    terminationType: "never",
    untilDate: date,
    occurrenceCount: "10",
  };
}

export default function CreateEventScreen({
  initialDate,
  onCancel,
  onSave,
}: {
  initialDate: string;
  onCancel: () => void;
  onSave: (event: CreateEventInput) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => initialDraft(initialDate));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeZone = browserTimeZone();

  const update = <Field extends keyof EventDraft>(
    field: Field,
    value: EventDraft[Field],
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const selectRecurrence = (preset: RecurrencePreset) => {
    setDraft((current) => {
      const date = alignDateKeyForPreset(current.date, preset);
      return {
        ...current,
        recurrencePreset: preset,
        date,
        untilDate: current.untilDate < date ? date : current.untilDate,
      };
    });
  };

  const selectDate = (selectedDate: string) => {
    setDraft((current) => {
      const date = alignDateKeyForPreset(
        selectedDate,
        current.recurrencePreset,
      );
      return {
        ...current,
        date,
        untilDate: current.untilDate < date ? date : current.untilDate,
      };
    });
  };

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setErrorMessage(null);

    try {
      const event = createEventInputFromDraft(draft, timeZone);
      setSaving(true);
      await onSave(event);
    } catch (error) {
      setSaving(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "THE EVENT COULD NOT BE SAVED. TRY AGAIN.",
      );
    }
  };

  const repeats = draft.recurrencePreset !== "none";

  return (
    <section className="create-event-screen" aria-labelledby="create-event-title">
      <div className="create-event-heading">
        <div>
          <p className="eyebrow">New schedule entry</p>
          <h2 id="create-event-title">Event details</h2>
        </div>
        <span className="timezone-label">{timeZone}</span>
      </div>

      <form className="event-form" onSubmit={submit}>
        <div className="form-section form-section-primary">
          <label className="form-field form-field-wide">
            <span>Title</span>
            <input
              autoFocus
              maxLength={200}
              onChange={(event) => update("title", event.target.value)}
              placeholder="WHAT IS HAPPENING?"
              required
              type="text"
              value={draft.title}
            />
          </label>
          <label className="form-field form-field-wide">
            <span>Notes <em>Optional</em></span>
            <textarea
              maxLength={5_000}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="ADD THE USEFUL DETAILS."
              rows={3}
              value={draft.notes}
            />
          </label>
        </div>

        <fieldset className="form-section">
          <legend>When</legend>
          <label className="form-field">
            <span>First occurrence</span>
            <input
              onChange={(event) => selectDate(event.target.value)}
              required
              type="date"
              value={draft.date}
            />
          </label>
          <label className="check-field">
            <input
              checked={draft.allDay}
              onChange={(event) => update("allDay", event.target.checked)}
              type="checkbox"
            />
            <span>ALL DAY</span>
          </label>
          {!draft.allDay ? (
            <div className="time-fields">
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
        </fieldset>

        <fieldset className="form-section repeat-section">
          <legend>Repeat</legend>
          <label className="form-field form-field-wide">
            <span>Pattern</span>
            <select
              aria-label="Repeat pattern"
              onChange={(event) =>
                selectRecurrence(event.target.value as RecurrencePreset)
              }
              value={draft.recurrencePreset}
            >
              <option value="none">Does not repeat</option>
              <option value="firstOfMonth">First of every month</option>
              <option value="thirdFriday">Third Friday of every month</option>
              <option value="everyOtherDay">Every other day</option>
              <option value="everyThreeDays">Every three days</option>
              <option value="everyFiveHours">Every five hours</option>
            </select>
          </label>

          {repeats ? (
            <>
              <div className="repeat-summary" role="status">
                <span aria-hidden="true">↻</span>
                <div>
                  <strong>{recurrencePresetSummary(draft.recurrencePreset)}</strong>
                  <small>Occurrences are calculated only for the calendar range you view.</small>
                </div>
              </div>
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
                  <option value="afterOccurrences">After occurrences</option>
                </select>
              </label>
              {draft.terminationType === "onDate" ? (
                <label className="form-field">
                  <span>Through date</span>
                  <input
                    min={draft.date}
                    onChange={(event) => update("untilDate", event.target.value)}
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
            </>
          ) : null}
        </fieldset>

        {errorMessage ? (
          <div className="form-error" role="alert">{errorMessage}</div>
        ) : null}

        <div className="form-actions">
          <button
            className="outline-button"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save event"}
          </button>
        </div>
      </form>
    </section>
  );
}
