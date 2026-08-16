import { expect, test, type Page } from "@playwright/test";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function createFiveHourlyEvent(page: Page, title: string) {
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "New event" }),
  ).toBeVisible();

  await expect(page.getByLabel("Notes")).toHaveCount(0);
  await page.getByRole("button", { name: "+ More details" }).click();
  await page.getByLabel("Notes").fill("Created through the progressive details panel.");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Start anchor").fill(localDateKey());
  await page.getByLabel("Starts").fill("00:30");
  await page.getByLabel("Ends", { exact: true }).fill("01:00");
  await page.getByLabel("Repeat unit").selectOption("hourly");
  await page.getByLabel("Repeat interval").fill("5");
  await page.getByLabel("Repeat ends").selectOption("afterOccurrences");
  await page.getByLabel("Occurrences").fill("4");
  await page.getByRole("button", { name: "Save event" }).click();

  await expect(page.getByText("REPEATING EVENT SAVED.", { exact: true })).toBeVisible();
  await expect(
    page.locator(".home-agenda-card").getByText(title, { exact: true }),
  ).toHaveCount(4);
  await expect(
    page.locator(".home-agenda-card").getByText("↻ REPEATS", { exact: true }),
  ).toHaveCount(4);
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

  await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
  await expect(
    page.getByText(/LOCAL PREVIEW|FIREBASE/, { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Weekly plan", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Open profile" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Profile" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "calendar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Calendar" })).toBeVisible();
  await expect(page.getByLabel("Week calendar")).toBeVisible();

  await page.getByRole("button", { name: "month", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: currentMonth })).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("heading", { level: 2, name: nextMonth })).toBeVisible();

  await page.getByRole("button", { name: "day", exact: true }).click();
  await expect(page.locator(".day-view")).toBeVisible();

  await page.getByRole("button", { name: "settings", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  await expect(page.getByLabel("Default calendar view")).toBeVisible();
});

test("creates an event quickly and discloses expressive recurrence", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Add event" }).click();
  await page.getByLabel("Repeat unit").selectOption("monthly");
  await page.getByLabel("Monthly pattern").selectOption("ordinalWeekday");
  await page.getByLabel("Week of month").selectOption("1");
  await page.getByLabel("Ordinal weekday", { exact: true }).selectOption("5");
  await expect(
    page.getByText("EVERY MONTH ON THE FIRST FRIDAY", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close event editor" }).click();

  await createFiveHourlyEvent(page, "Browser recurrence proof");
});

test("persists a created recurrence through Firebase rules", async ({ page }) => {
  test.skip(
    process.env.FIREBASE_E2E !== "true",
    "Run inside the Firebase Auth/Firestore emulator verification command.",
  );

  await page.goto("/");
  await expect(page.getByText("FIREBASE", { exact: true })).toBeVisible();
  await createFiveHourlyEvent(page, "Firebase recurrence proof");

  await page.reload();

  await expect(page.getByText("FIREBASE", { exact: true })).toBeVisible();
  await expect(
    page.locator(".home-agenda-card").getByText("Firebase recurrence proof", {
      exact: true,
    }),
  ).toHaveCount(4);
});
