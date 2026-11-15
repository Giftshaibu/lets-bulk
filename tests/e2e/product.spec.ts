import { setup } from "./helpers";
import { test, expect } from "@playwright/test";
test.use({ actionTimeout: 15000 });
test.skip(
  !process.env["E2E_EMAIL"] || !process.env["E2E_PASSWORD"],
  "Dedicated test credentials required",
);
test("guided setup, intentional streak, contextual food, separate progress and exercise guide", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(process.env["E2E_EMAIL"]!);
  await page.getByLabel("Password", { exact: true }).fill(process.env["E2E_PASSWORD"]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page
      .getByRole("heading", { name: "Let’s start with you" })
      .or(page.getByRole("heading", { name: "Today", exact: true })),
  ).toBeVisible({ timeout: 30000 });
  if (await page.getByRole("heading", { name: "Let’s start with you" }).isVisible())
    await setup(page);
  await expect(page.getByRole("button", { name: "Save settings", exact: true })).toHaveCount(0);
  await page.goto("/progress");
  await expect(page.getByText(/\d day logging streak/)).toBeVisible();
  await page.getByRole("button", { name: "Log weight", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Weight (kg)", exact: true }).fill("65.4");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(page.getByText("1 day logging streak", { exact: false })).toBeVisible({
    timeout: 20000,
  });
  await page.reload();
  await expect(page.getByText("1 day logging streak", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Week 1,/ }).click();
  await expect(page.getByText(/days with intentional logs/)).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: "Measurements →", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save measurements", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save weight", exact: true })).toHaveCount(0);
  await page.goto("/progress-details?section=photos");
  await expect(
    page.getByRole("button", { name: "Upload private photo", exact: true }),
  ).toBeVisible();
  await page.goto("/food");
  await page.getByRole("button", { name: "Search foods", exact: true }).click();
  await page.getByRole("textbox", { name: "Search foods", exact: true }).fill("Bananas");
  await page.getByRole("button", { name: /^Bananas, raw/ }).click();
  await page.getByLabel("Amount in grams", { exact: true }).fill("75");
  await page.getByLabel("Meal", { exact: true }).selectOption("lunch");
  await page.getByRole("button", { name: "Add to meal", exact: true }).click();
  await expect(page.getByText("75 g", { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("textbox", { name: "Name for saved Lunch", exact: true })
    .fill("My banana meal");
  const savedMeal = page.waitForResponse(
    (r) => r.url().endsWith("/api/meals") && r.request().method() === "POST",
  );
  await page
    .getByRole("form", { name: "Save Lunch as meal", exact: true })
    .getByRole("button", { name: "Save meal", exact: true })
    .click();
  expect((await savedMeal).status()).toBe(200);
  await expect(
    page.getByRole("textbox", { name: "Name for saved Lunch", exact: true }),
  ).toHaveValue("");
  await page.goto("/food-library");
  await expect(page.getByRole("combobox", { name: "Saved meal", exact: true })).toContainText(
    "My banana meal",
  );
  await page.getByRole("button", { name: "Custom foods", exact: true }).click();
  await page.getByRole("button", { name: /Options for Bananas, raw/ }).click();
  await page.getByRole("menuitem", { name: "View nutrition", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("USDA");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/train");
  await expect(page.getByText("How do I do this?", { exact: true }).first()).toBeVisible();
  await page.getByText("How do I do this?", { exact: true }).first().click();
  await expect(page.getByText("Common mistakes", { exact: true }).first()).toBeVisible();
  for (const img of await page.locator("img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);
  }
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Save settings", exact: true })).toBeVisible();
  await expect(page.getByLabel("Flat bench", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Leg press machine", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
