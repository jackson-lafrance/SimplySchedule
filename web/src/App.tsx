import type { CSSProperties } from "react";

import { colors } from "@/theme";

type MarkerStyle = CSSProperties & {
  "--marker-color"?: string;
};

const FOUNDATION_ITEMS = [
  { label: "Tasks + subtasks", color: colors.success },
  { label: "List + calendar views", color: colors.accent },
  { label: "Single + repeating events", color: "#FF9500" },
];

const todayLabel = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  weekday: "long",
}).format(new Date());

function markerStyle(color: string): MarkerStyle {
  return { "--marker-color": color };
}

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#today" aria-label="Simply Schedule home">
          <span className="brand-mark" aria-hidden="true">
            SS
          </span>
          <span className="brand-name">Simply Schedule</span>
        </a>

        <nav className="primary-nav" aria-label="Primary navigation">
          <a className="nav-link nav-link-active" href="#today">
            Today
          </a>
          <a className="nav-link" href="#foundation">
            Foundation
          </a>
        </nav>

        <button className="outline-button header-button" type="button">
          Settings
        </button>
      </header>

      <main className="page-content">
        <section className="page-intro" id="today" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">{todayLabel}</p>
            <h1 id="page-title">Make time for what matters.</h1>
            <p className="intro-copy">
              A clear place for tasks, subtasks, and events.
            </p>
          </div>
          <button className="primary-button" type="button">
            + Add task
          </button>
        </section>

        <div className="dashboard-grid">
          <section className="panel schedule-panel" aria-labelledby="schedule-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Today</p>
                <h2 id="schedule-title">Your schedule</h2>
              </div>
              <span className="status-label">Preview</span>
            </div>

            <div className="empty-state">
              <span
                className="empty-marker"
                style={markerStyle(colors.success)}
                aria-hidden="true"
              />
              <h3>Nothing scheduled yet.</h3>
              <p>
                Tasks and events will appear here once the schedule is connected.
              </p>
            </div>
          </section>

          <aside className="panel foundation-panel" id="foundation" aria-labelledby="foundation-title">
            <div className="panel-heading compact-heading">
              <div>
                <p className="eyebrow">Coming next</p>
                <h2 id="foundation-title">Foundation</h2>
              </div>
            </div>

            <ul className="foundation-list">
              {FOUNDATION_ITEMS.map((item) => (
                <li className="foundation-item" key={item.label}>
                  <span
                    className="foundation-marker"
                    style={markerStyle(item.color)}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>

            <div className="foundation-note">
              <p className="eyebrow">Web foundation</p>
              <p>
                This shell establishes the visual and structural starting point for
                the product.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <span>Simply Schedule</span>
        <span>Web foundation · 0.1.0</span>
      </footer>
    </div>
  );
}
