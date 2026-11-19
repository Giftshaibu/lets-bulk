import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test.use({ viewport: { width: 320, height: 800 }, reducedMotion: "reduce" });
test("mobile refinement sheets, shared identity and editable steppers", async ({ page }) => {
  const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8081";
  const dashboard = JSON.parse(
    readFileSync(new URL("./fixtures/mascot-dashboard.json", import.meta.url), "utf8"),
  );
  await page.route("**/api/**", (r) => r.fulfill({ json: { data: {} } }));
  await page.route("**/api/dashboard", (r) => r.fulfill({ json: { data: dashboard } }));
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

  await page.goto(`${base}/`);
  await expect(page.getByRole("button", { name: "Chiuli status", exact: true })).toHaveCount(1);
  expect(await page.locator("details").count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto(`${base}/progress`);
  await expect(page.getByRole("navigation", { name: "Progress sections" })).toBeVisible();
  await expect(page.getByText("Weekly Check-In", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log weight", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const edit = page.getByRole("button", { name: "Edit Weight (kg)", exact: true });
  await edit.click();
  await page.getByRole("spinbutton", { name: "Weight (kg)", exact: true }).fill("62.5");
  await page.keyboard.press("Enter");
  await expect(edit).toContainText("62.5");
  await page.getByRole("button", { name: "Increase Weight (kg)", exact: true }).click();
  await expect(edit).toContainText("62.6");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(`${base}/settings`);
  await expect(page.getByRole("button", { name: "lb", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "lb", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  let saved: Record<string, unknown> | undefined;
  await page.route("**/api/settings", async (r) => {
    saved = r.request().postDataJSON();
    await r.fulfill({ json: { data: {} } });
  });
  await page.getByRole("button", { name: "Increase Daily calories", exact: true }).click();
  await page.getByRole("checkbox", { name: "Monday", exact: true }).check();
  await page.getByRole("button", { name: "Save settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Confirm new nutrition targets");
  expect(saved).toBeUndefined();
  await page.getByRole("button", { name: "Confirm and save", exact: true }).click();
  await expect.poll(() => saved?.["mass_unit"]).toBe("lb");
  expect((saved?.["nutrition_targets"] as { kcal: number } | undefined)?.kcal).toBe(
    dashboard.activeTarget.calories_target + 50,
  );
  await page.screenshot({ path: "work/refinement-settings.png", fullPage: true });
  dashboard.workout.exercises = [
    {
      id: dashboard.exerciseLibrary[0].id,
      targetSets: 3,
      targetReps: "8–12",
      restSeconds: 90,
      lastTime: "No previous sets",
      nextTarget: "Start light",
    },
  ];
  await page.goto(`${base}/train`);
  await page.getByRole("button", { name: "Bodyweight Squat", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Start/end positions");
  await expect(
    page.getByRole("button", { name: "Still positions · reduced motion", exact: true }),
  ).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Pause positions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play positions", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
});
