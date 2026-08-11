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
    page.getByRole("heading", { level: 1, name: "Create event" }),
  ).toBeVisible();

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("First occurrence").fill(localDateKey());
  await page.getByLabel("Starts").fill("00:30");
  await page.getByLabel("Ends", { exact: true }).fill("01:00");
  await page.getByLabel("Repeat pattern").selectOption("everyFiveHours");
  await page.getByLabel("Repeat ends").selectOption("afterOccurrences");
  await page.getByLabel("Occurrences").fill("4");
  await page.getByRole("button", { name: "Save event" }).click();

  await expect(page.getByText("REPEATING EVENT SAVED.", { exact: true })).toBeVisible();
  await expect(
    page.locator(".selected-day").getByText(title, { exact: true }),
  ).toHaveCount(4);
  await expect(
    page.locator(".selected-day").getByText("↻ REPEATS", { exact: true }),
  ).toHaveCount(4);
}

test("navigates the calendar and switches to the monthly agenda", async ({
  page,
}) => {
  const today = new Date();
  const currentMonth = monthFormatter.format(today);
  const nextMonth = monthFormatter.format(
    new Date(today.getFullYear(), today.getMonth() + 1, 1),
  );

  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: currentMonth }),
  ).toBeVisible();
  await expect(
    page.getByText(/LOCAL PREVIEW|FIREBASE LIVE/, { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Weekly plan", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: nextMonth }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Today", exact: true }).last().click();
  await expect(
    page.getByRole("heading", { level: 1, name: currentMonth }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByLabel("Monthly agenda")).toBeVisible();
  await expect(page.getByText("Design review", { exact: true }).first()).toBeVisible();
});

test("creates and expands a bounded five-hour recurrence", async ({ page }) => {
  await page.goto("/");
  await createFiveHourlyEvent(page, "Browser recurrence proof");
});

test("persists a created recurrence through Firebase rules", async ({ page }) => {
  test.skip(
    process.env.FIREBASE_E2E !== "true",
    "Run inside the Firebase Auth/Firestore emulator verification command.",
  );

  await page.goto("/");
  await expect(page.getByText("FIREBASE LIVE", { exact: true })).toBeVisible();
  await createFiveHourlyEvent(page, "Firebase recurrence proof");

  await page.reload();

  await expect(page.getByText("FIREBASE LIVE", { exact: true })).toBeVisible();
  await expect(
    page.locator(".selected-day").getByText("Firebase recurrence proof", {
      exact: true,
    }),
  ).toHaveCount(4);
  await expect(
    page.getByText(
      "READING AND WRITING USER-SCOPED EVENTS IN THE VISIBLE RANGE.",
    ),
  ).toBeVisible();
});
