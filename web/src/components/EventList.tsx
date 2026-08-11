import type { EventOccurrence } from "@/domain/events";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function eventTime(event: EventOccurrence) {
  if (event.allDay) {
    return "ALL DAY";
  }

  const start = timeFormatter.format(event.startsAt);
  return event.endsAt
    ? `${start} – ${timeFormatter.format(event.endsAt)}`
    : start;
}

export default function EventList({
  events,
  emptyMessage,
  showNotes = false,
}: {
  events: EventOccurrence[];
  emptyMessage: string;
  showNotes?: boolean;
}) {
  if (events.length === 0) {
    return (
      <div className="event-empty-state">
        <span className="empty-state-mark" aria-hidden="true" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ol className="event-list">
      {events.map((event) => (
        <li className="event-list-item" key={event.id}>
          <span
            className={`event-marker ${event.allDay ? "event-marker-all-day" : ""}`}
            aria-hidden="true"
          />
          <div className="event-copy">
            <div className="event-title-row">
              <h3>{event.title}</h3>
              <time dateTime={event.startsAt.toISOString()}>
                {eventTime(event)}
              </time>
            </div>
            {event.isRepeating ? (
              <span className="repeat-label">↻ REPEATS</span>
            ) : null}
            {showNotes && event.notes ? <p>{event.notes}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
