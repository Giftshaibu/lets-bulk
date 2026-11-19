import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { estimatePlan, type GuidedSetup } from "../../src/lib/domain/onboarding";
test.use({ viewport: { width: 320, height: 800 }, reducedMotion: "reduce" });
test("tactile onboarding preserves choices, validates days and confirms sourced food preferences", async ({
  page,
}) => {
  const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8081";
  const dashboard = JSON.parse(
    readFileSync(new URL("./fixtures/mascot-dashboard.json", import.meta.url), "utf8"),
  );
  dashboard.needsOnboarding = true;
  let saved: GuidedSetup | undefined,
    previews = 0;
  await page.route("**/api/**", (r) => r.abort());
  await page.route("**/api/dashboard", (r) => r.fulfill({ json: { data: dashboard } }));
  await page.route("**/api/setup/preview", (r) => {
    previews++;
    return r.fulfill({ json: { data: estimatePlan(r.request().postDataJSON()) } });
  });
  await page.route("**/api/setup", (r) => {
    saved = r.request().postDataJSON();
    return r.fulfill({ json: { data: {} } });
  });
  await page.addInitScript(() => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJleHAiOjQxMDI0NDQ4MDB9.fixture";
    localStorage.setItem(
      "sb-dbiddamqpbeueykajapg-auth-token",
      JSON.stringify({
        access_token: token,
        refresh_token: "fixture-only",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 4102444800,
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          email: "fixture@example.invalid",
          app_metadata: {},
          user_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      }),
    );
  });

  await page.goto(base);
  const fit = async () =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  await expect(page.getByRole("heading", { name: "Let’s start with you" })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('img[src="/chiuli-icon.png"]')).toHaveCount(0);
  await fit();
  await page.getByLabel("Your name", { exact: true }).fill("Fresh start");
  await page.getByRole("button", { name: "Edit Current weight (kg)", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Current weight (kg)", exact: true }).fill("64.5");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "12 months", exact: true }).click();
  await fit();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Current weight (kg)", exact: true }),
  ).toContainText("64.5");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("button", { name: "12 months", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: /Often on your feet/ }).check();
  await fit();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "Friday", exact: true }).uncheck();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Choose 3, 4 or 5");
  await page.getByRole("checkbox", { name: "Friday", exact: true }).check();
  await fit();
  await page.getByRole("button", { name: "What equipment should I select?", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: /Choose foods/ }).click();
  await page.getByRole("button", { name: "Soya pieces", exact: true }).click();
  await page.getByRole("button", { name: /^Done/ }).click();
  await fit();
  await page.getByRole("button", { name: "Show my starting plan", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your starting plan" })).toBeVisible();
  await page.getByRole("button", { name: "Edit answers", exact: true }).click();
  await page.getByRole("radio", { name: "Keep costs low", exact: true }).check();
  await expect(page.getByRole("region", { name: "Your starting plan" })).toHaveCount(0);
  await page.getByRole("button", { name: "Show my starting plan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save my plan", exact: true })).toBeVisible();
  await page.screenshot({ path: "work/onboarding-food.png", fullPage: true });
  await page.getByRole("button", { name: "Save my plan", exact: true }).click();
  await expect.poll(() => saved?.foods).toEqual(["Soya pieces"]);
  expect(saved?.months).toBe(12);
  expect(saved?.weight).toBe(64.5);
  expect(saved?.activity).toBe("moderate");
  expect(saved?.budget).toBe("budget");
  expect(previews).toBe(2);
});
