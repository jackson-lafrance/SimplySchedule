import type {
  ScheduleSource,
  ScheduleStatus,
} from "@/context/scheduleContextValue";

export default function ProfilePanel({
  lastUpdatedAt,
  onClose,
  source,
  status,
}: {
  lastUpdatedAt: Date | null;
  onClose: () => void;
  source: ScheduleSource;
  status: ScheduleStatus;
}) {
  return (
    <div className="profile-overlay" role="presentation">
      <section
        aria-labelledby="profile-title"
        aria-modal="true"
        className="profile-panel"
        role="dialog"
      >
        <div className="sheet-header">
          <h2 id="profile-title">Profile</h2>
          <button
            aria-label="Close profile"
            className="plain-icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="profile-content">
          <span className={`profile-status profile-status-${status}`} aria-hidden="true" />
          <p className="eyebrow">Schedule data</p>
          <strong>
            {source === "firebase" ? "FIREBASE SYNC" : "LOCAL PREVIEW"}
          </strong>
          <p>
            {source === "firebase"
              ? "Signed in with an anonymous, user-scoped Firebase session."
              : "Events stay in this browser session and are never uploaded."}
          </p>
          {lastUpdatedAt ? (
            <code>
              UPDATED {lastUpdatedAt.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </code>
          ) : null}
        </div>
        <button className="primary-button profile-done" onClick={onClose} type="button">
          Done
        </button>
      </section>
    </div>
  );
}
