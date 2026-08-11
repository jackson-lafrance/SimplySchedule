import { expect, test } from "@playwright/test";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

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

test("loads seeded events through authenticated Firestore rules", async ({
  page,
}) => {
  test.skip(
    process.env.FIREBASE_E2E !== "true",
    "Run inside the Firebase Auth/Firestore emulator verification command.",
  );

  await page.goto("/");

  await expect(page.getByText("FIREBASE LIVE", { exact: true })).toBeVisible();
  await expect(page.getByText("Weekly plan", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("READING USER-SCOPED SINGLE EVENTS FROM FIRESTORE."),
  ).toBeVisible();
});
