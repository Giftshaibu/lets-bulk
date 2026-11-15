import { setup as guidedSetup } from "./helpers";
import { test, expect } from "@playwright/test";
// Run only against a dedicated test account. This suite records synthetic logs.
test.skip(
  !process.env["E2E_EMAIL"] || !process.env["E2E_PASSWORD"],
  "Set credentials for a dedicated test account.",
);
test("logs survive reload and all primary screens render", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(process.env["E2E_EMAIL"]!);
  await page.getByLabel("Password", { exact: true }).fill(process.env["E2E_PASSWORD"]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const heading = page.getByRole("heading", { name: "Let’s start with you" });
  await expect(heading.or(page.getByRole("heading", { name: "Today", exact: true }))).toBeVisible({
    timeout: 30000,
  });
  if (await heading.isVisible()) await guidedSetup(page);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible({
    timeout: 30000,
  });
  const waterBefore = await page.getByText(/^Water: \d+ \/ \d+ ml$/).innerText();
  await page.getByRole("button", { name: "Add water", exact: true }).click();
  await expect(page.getByText(/^Water: \d+ \/ \d+ ml$/)).not.toHaveText(waterBefore, {
    timeout: 30000,
  });
  const waterAfter = await page.getByText(/^Water: \d+ \/ \d+ ml$/).innerText();
  await page.reload();
  await expect(page.getByText(waterAfter, { exact: true })).toBeVisible({ timeout: 30000 });
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Your journey", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log weight", exact: true }).click();
  await page.getByLabel("Weight (kg)", { exact: true }).fill("60.3");
  await page.getByRole("button", { name: "Save weight" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saving" })).toHaveCount(0, {
    timeout: 30000,
  });
  await page.reload();
  await page.goto("/progress-details?section=weight");
  await expect(page.getByText(/^60\.3kg$/).first()).toBeVisible({ timeout: 30000 });
  await page.goto("/food");
  await expect(page.getByRole("heading", { name: "Food", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add food", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/train");
  await expect(page.getByRole("heading", { name: "Train", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
