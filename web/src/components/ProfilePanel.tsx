import { useModalDialog } from "@/components/useModalDialog";
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
  const dialogRef = useModalDialog(onClose);

  return (
    <div
      className="profile-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-labelledby="profile-title"
        aria-modal="true"
        className="profile-panel"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
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
          <p className="eyebrow">Schedule data</p>
          <strong>
            {source === "firebase" ? "FIREBASE SYNC" : "LOCAL PREVIEW"}
          </strong>
          <span
            className={`profile-sync-state status-word-${status}`}
            role="status"
          >
            {status === "loading" ? "SYNCING" : status === "error" ? "ERROR" : "READY"}
          </span>
          <p>
            {source === "firebase"
              ? "Signed in with an anonymous, user-scoped Firebase session."
              : "Tasks and events stay in this browser session and are never uploaded."}
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
