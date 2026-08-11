import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { ScheduleProvider } from "@/context/ScheduleContext";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ScheduleProvider>
      <App />
    </ScheduleProvider>
  </StrictMode>,
);
