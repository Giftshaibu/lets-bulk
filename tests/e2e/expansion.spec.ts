import { setup as guidedSetup } from "./helpers";
import { test, expect } from "@playwright/test";
test.skip(
  !process.env["E2E_EMAIL"] || !process.env["E2E_PASSWORD"],
  "Use a dedicated disposable test account.",
);
test("settings, sourced foods and accepted training changes persist", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let authorization = "";
  page.on("request", (r) => {
    if (r.url().endsWith("/api/dashboard"))
      authorization = r.headers()["authorization"] ?? authorization;
  });
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(process.env["E2E_EMAIL"]!);
  await page.getByLabel("Password", { exact: true }).fill(process.env["E2E_PASSWORD"]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const setup = page.getByRole("heading", { name: "Let’s start with you" });
  await expect(setup.or(page.getByRole("heading", { name: "Today", exact: true }))).toBeVisible({
    timeout: 30000,
  });
  if (await setup.isVisible()) await guidedSetup(page);
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.goto("/settings");
  await page.getByLabel("Goal weight (kg)", { exact: true }).fill("70");
  await page.getByLabel("Optional target date").fill("2027-12-01");
  for (const day of ["Monday", "Wednesday", "Friday", "Saturday"])
    await page.getByLabel(day, { exact: true }).uncheck();
  for (const day of ["Tuesday", "Thursday", "Sunday"])
    await page.getByLabel(day, { exact: true }).check();
  await page.getByLabel("Weight log", { exact: true }).uncheck();
  await page.getByLabel("Water target", { exact: true }).uncheck();
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/settings") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save settings", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await page.goto("/settings");
  await expect(page.getByLabel("Goal weight (kg)", { exact: true })).toHaveValue("70");
  await expect(page.getByLabel("Weight log", { exact: true })).not.toBeChecked();
  await expect(page.getByText("Training days (3 per week)", { exact: true })).toBeVisible();
  const baselineResponse = await page.request.get("/api/dashboard", {
    headers: { Authorization: authorization },
  });
  const baseline = (await baselineResponse.json()).data;
  await page.goto("/food");
  await page.getByRole("button", { name: "Add food", exact: true }).first().click();
  await page.getByLabel("Search foods", { exact: true }).fill("Bananas, raw");
  await page.getByRole("button", { name: /^Bananas, raw/ }).click();
  await expect(page.getByRole("link", { name: "Nutrient source" })).toHaveAttribute(
    "href",
    "https://fdc.nal.usda.gov/food-details/173944/nutrients",
  );
  const logged = page.waitForResponse(
    (r) => r.url().endsWith("/api/nutrition/logs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Add to meal", exact: true }).click();
  expect((await logged).status()).toBe(200);
  await page.goto("/train");
  await page
    .locator("summary")
    .filter({ hasText: /(?:Upper A|Full body 1) ·/ })
    .first()
    .click();
  const proposed = page.waitForResponse((r) => r.url().endsWith("/api/training/recommendations"));
  await page.getByRole("button", { name: "Propose one extra set", exact: true }).first().click();
  expect((await proposed).status()).toBe(200);
  await page.goto("/");
  const applied = page.waitForResponse((r) =>
    /\/api\/recommendations\/[^/]+\/accept$/.test(r.url()),
  );
  await page.getByRole("button", { name: "Apply", exact: true }).first().click();
  expect((await applied).status()).toBe(200);
  await expect(page.getByText(/accepted · Your request/).first()).toBeVisible({ timeout: 30000 });
  const dashboard = await page.request.get("/api/dashboard", {
    headers: { Authorization: authorization },
  });
  expect(dashboard.status()).toBe(200);
  const { data } = await dashboard.json();
  expect(data.rawProfile.goal_weight_kg).toBe(70);
  expect(data.trainingDays).toHaveLength(3);
  expect(data.targets.kcal).toBe(baseline.targets.kcal);
  expect(data.activeProgram.version).toBe(baseline.activeProgram.version + 1);
  expect(data.programExercises.reduce((n: number, p: { sets: number }) => n + p.sets, 0)).toBe(
    baseline.programExercises.reduce((n: number, p: { sets: number }) => n + p.sets, 0) + 1,
  );
  expect(data.completionPolicy.weight).toBe(false);
  expect(data.eaten.kcal).toBeCloseTo(baseline.eaten.kcal + 89, 1);
  await page.goto("/progress-details?section=weight");
  await expect(page.getByRole("heading", { name: "Observed maintenance estimate" })).toBeVisible();
  await expect(page.getByText(/Needs 21 substantially logged food days/)).toBeVisible();
  expect(errors).toEqual([]);
});
