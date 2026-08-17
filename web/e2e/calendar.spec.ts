import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function expectNoAccessibilityViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

async function expectFirebaseSource(page: Page) {
  await page.getByRole("button", { name: "Open profile" }).click();
  const profile = page.getByRole("dialog", { name: "Profile" });
  await expect(profile.getByText("FIREBASE SYNC")).toBeVisible();
  await expect(profile.getByRole("status")).toHaveText("READY");
  await page.getByRole("button", { name: "Done" }).click();
}

async function createFiveHourlyEvent(page: Page, title: string) {
  await page.getByRole("button", { name: "+ SCHEDULE" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "New schedule" }),
  ).toBeVisible();

  await expect(page.getByLabel("Notes")).toHaveCount(0);
  await page.getByRole("button", { name: "+ More details" }).click();
  await page.getByLabel("Notes").fill("Created through the progressive details panel.");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Start date").fill(localDateKey());
  await page.getByLabel("Starts").fill("00:30");
  await page.getByLabel("Ends", { exact: true }).fill("01:00");
  await page.getByLabel("Repeat unit").selectOption("hourly");
  await page.getByLabel("Repeat interval").fill("5");
  await page.getByLabel("Repeat ends").selectOption("afterOccurrences");
  await page.getByLabel("Occurrences").fill("4");
  await page.getByTitle("Red").click();
  await expect(page.getByLabel("Red")).toBeChecked();
  await page.getByRole("button", { name: "Save event" }).click();

  await expect(page.getByText("REPEATING EVENT SAVED.", { exact: true })).toBeVisible();
  const rows = page.locator(".agenda-row-event").filter({ hasText: title });
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toHaveCSS(
    "border-left-color",
    "rgb(243, 139, 168)",
  );
}

async function createTask(page: Page, title: string, color = "Blue") {
  await page.getByRole("button", { name: "+ SCHEDULE" }).click();
  await page
    .getByRole("group", { name: "Schedule type" })
    .getByRole("button", { name: "task" })
    .click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Due date").fill(localDateKey());
  await page.getByLabel("Due time").fill("14:30");
  await page.getByTitle(color).click();
  await expect(page.getByLabel(color)).toBeChecked();
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByText("TASK SAVED.", { exact: true })).toBeVisible();
  const row = page.locator(".agenda-row-task").filter({ hasText: title });
  await expect(row).toBeVisible();
  return row;
}

test("moves through the restrained Home, Calendar, and Settings hierarchy", async ({
  page,
}) => {
  const today = new Date();
  const currentMonth = monthFormatter.format(today);
  const nextMonth = monthFormatter.format(
    new Date(today.getFullYear(), today.getMonth() + 1, 1),
  );

  await page.goto("/");

  await expect(
    page.getByRole("button", { name: "+ SCHEDULE" }),
  ).toHaveText("+ SCHEDULE");
  await expect(
    page.getByRole("heading", { level: 1, name: "This week" }),
  ).toHaveCount(1);
  await expect(page.locator(".agenda-date-section")).toHaveCount(7);
  await expect(page.locator(".agenda-date-current")).toHaveCount(1);
  await expect(page.getByText("Weekly plan", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Send meeting agenda", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("NOTHING SCHEDULED", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^(EVENT|TASK)$/)).toHaveCount(0);

  await expect(page.locator(".profile-control .sync-dot")).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Profile" })).toBeVisible();
  await expect(page.locator(".profile-status")).toHaveCount(0);
  await expect(
    page
      .getByRole("dialog", { name: "Profile" })
      .getByText(/LOCAL PREVIEW|FIREBASE SYNC/, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "calendar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Calendar" })).toBeVisible();
  await expect(page.getByLabel("Week calendar")).toBeVisible();
  await expect(page.getByText("Viewing", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "month", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: currentMonth })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today", exact: true })).toHaveCount(0);
  await expect(page.locator(".calendar-today-dot")).toHaveCount(1);
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { level: 2, name: nextMonth })).toBeVisible();

  await page.getByRole("button", { name: "day", exact: true }).click();
  await expect(page.locator(".day-view")).toBeVisible();
  await expect(page.locator(".day-view .section-count")).toHaveCount(0);

  await page.getByRole("button", { name: "settings", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Default calendar view")).toBeVisible();
  await expect(page.getByText(/timezone/i)).toHaveCount(0);
});

test("creates and completes colored tasks from the weekly agenda", async ({
  page,
}) => {
  await page.goto("/");
  const row = await createTask(page, "Colored task proof");
  await expect(row).toHaveCSS("border-left-color", "rgb(137, 180, 250)");
  await row.getByRole("button", { name: "Mark Colored task proof complete" }).click();
  await expect(row).toHaveCount(0);
});

test("creates an event quickly and discloses expressive recurrence", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "+ SCHEDULE" }).click();
  await page.getByLabel("Start date").fill("2026-09-04");
  await page.getByLabel("Repeat unit").selectOption("monthly");
  await expect(page.getByLabel("Day of month")).toHaveValue("4");
  await page.getByLabel("Monthly pattern").selectOption("ordinalWeekday");
  await page.getByLabel("Week of month").selectOption("1");
  await page.getByLabel("Ordinal weekday", { exact: true }).selectOption("5");
  await expect(
    page.getByText("EVERY MONTH ON THE FIRST FRIDAY", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Next recurrence dates").getByRole("listitem"))
    .toHaveCount(5);
  await expect(page.getByText("Optional", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Anchored|timezone/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Close schedule editor" }).click();
  await expect(
    page.getByRole("heading", { name: "Discard changes?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discard", exact: true }).click();

  await createFiveHourlyEvent(page, "Browser recurrence proof");
});

test("keeps modal sheets keyboard-safe and confirms dirty cancellation", async ({
  page,
}) => {
  await page.goto("/");

  const scheduleAction = page.getByRole("button", { name: "+ SCHEDULE" });
  await scheduleAction.click();
  const title = page.getByLabel("Title");
  await expect(title).toBeFocused();
  await page.getByRole("button", { name: "Save event" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close schedule editor" }),
  ).toBeFocused();
  await title.focus();
  await title.fill("Unsaved keyboard draft");

  await page.keyboard.press("Escape");
  const discardTitle = page.getByRole("heading", { name: "Discard changes?" });
  await expect(discardTitle).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep editing" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(discardTitle).toHaveCount(0);
  await expect(title).toBeFocused();

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "New schedule" }),
  ).toHaveCount(0);
  await expect(scheduleAction).toBeFocused();

  const profile = page.getByRole("button", { name: "Open profile" });
  await profile.click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { level: 2, name: "Profile" }),
  ).toHaveCount(0);
  await expect(profile).toBeFocused();
});

test("positions the picker-free mobile agenda at the current day", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-08-19T16:00:00.000Z"));
  await page.goto("/");

  await expect(page.locator(".agenda-date-section")).toHaveCount(7);
  await expect(page.locator(".agenda-date-current")).toHaveAttribute(
    "data-date",
    "2026-08-19",
  );
  if ((page.viewportSize()?.width ?? 1_000) <= 720) {
    await expect
      .poll(() =>
        page.locator(".weekly-agenda-scroll").evaluate((element) => element.scrollTop),
      )
      .toBeGreaterThan(0);
  }
});

test("persists the calendar default and avoids horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  await page.setViewportSize({ width: 320, height: 568 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "+ SCHEDULE" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "settings", exact: true }).click();
  await page
    .getByRole("group", { name: "Week starts on" })
    .getByRole("button", { name: "Sunday" })
    .click();
  await page
    .getByRole("group", { name: "Default calendar view" })
    .getByRole("button", { name: "month" })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "calendar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Month calendar" })).toBeVisible();
  await expect(page.locator(".weekday-row span").first()).toHaveText("Sun");
});

test("has no automated WCAG violations across primary views and the editor", async ({
  page,
}) => {
  await page.goto("/");
  await expectNoAccessibilityViolations(page);

  await page.getByRole("button", { name: "calendar", exact: true }).click();
  await page.getByRole("button", { name: "month", exact: true }).click();
  await expectNoAccessibilityViolations(page);

  await page.getByRole("button", { name: "settings", exact: true }).click();
  await expectNoAccessibilityViolations(page);

  await page.getByRole("button", { name: "+ SCHEDULE" }).click();
  await expectNoAccessibilityViolations(page);
});

test("persists a created recurrence through Firebase rules", async ({ page }) => {
  test.skip(
    process.env.FIREBASE_E2E !== "true",
    "Run inside the Firebase Auth/Firestore emulator verification command.",
  );

  await page.goto("/");
  await expectFirebaseSource(page);
  await createFiveHourlyEvent(page, "Firebase recurrence proof");
  await createTask(page, "Firebase task proof", "Teal");

  await page.reload();

  await expectFirebaseSource(page);
  await expect(
    page.locator(".weekly-agenda-scroll").getByText("Firebase recurrence proof", {
      exact: true,
    }),
  ).toHaveCount(4);
  const task = page.locator(".agenda-row-task").filter({
    hasText: "Firebase task proof",
  });
  await expect(task).toHaveCSS("border-left-color", "rgb(148, 226, 213)");
  await task
    .getByRole("button", { name: "Mark Firebase task proof complete" })
    .click();
  await expect(task).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Firebase task proof", { exact: true }),
  ).toHaveCount(0);
});
