import { getLocalDate } from "../../src/lib/domain/dates";
import { expect, type Page } from "@playwright/test";
export async function setup(page: Page) {
  await page.getByLabel("Your name", { exact: true }).fill("Product fixture");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Goal weight (kg)", { exact: true }).fill("70");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Often on your feet").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const today = new Date(`${getLocalDate()}T12:00:00Z`).getUTCDay();
  if (![1, 3, 5].includes(today)) {
    await page.getByLabel("Monday", { exact: true }).uncheck();
    await page
      .getByLabel(
        ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today]!,
        { exact: true },
      )
      .check();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Beans", { exact: true }).check();
  await page.getByRole("button", { name: "Show my starting plan", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your starting plan" })).toContainText("g protein");
  await page.getByRole("button", { name: "Save my plan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible({
    timeout: 30000,
  });
}
