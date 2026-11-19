import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fixtureSession } from "./fixture-session";
test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const base = () => process.env["E2E_BASE_URL"] ?? "http://localhost:8083";
const fixture = () =>
  JSON.parse(readFileSync(new URL("./fixtures/mascot-dashboard.json", import.meta.url), "utf8"));
async function mount(page: Page, d: ReturnType<typeof fixture>) {
  await fixtureSession(page);
  await page.route("**/api/**", (r) => r.fulfill({ json: { data: {} } }));
  await page.route("**/api/dashboard", (r) => r.fulfill({ json: { data: d } }));
}
async function fit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('select,input[type="date"]').count()).toBe(0);
}
test("guided food chat reviews matches and exposes adding, added and safe retry states", async ({
  page,
}) => {
  const d = fixture();
  await mount(page, d);
  const f = d.foodLibrary[0];
  let release: (() => void) | undefined,
    calls = 0;
  let sent: unknown;
  await page.route("**/api/ai/parse-food-log", (r) =>
    r.fulfill({
      json: {
        data: {
          source: "fallback",
          result: {
            items: [
              {
                query: "two eggs",
                quantity: 2,
                unit: "piece",
                mealType: null,
                matches: [
                  {
                    id: f.id,
                    name: f.name,
                    preparation: f.preparation_state,
                    servingName: f.serving_name,
                    servingGrams: 50,
                    servingVolumeMl: null,
                  },
                ],
              },
            ],
            clarificationNeeded: false,
          },
        },
      },
    }),
  );
  await page.route("**/api/nutrition/logs/batch", async (r) => {
    sent = r.request().postDataJSON();
    calls++;
    await new Promise<void>((resolve) => (release = resolve));
    return r.fulfill(
      calls === 1
        ? { status: 503, json: { error: { message: "Temporary test failure" } } }
        : { json: { data: 1 } },
    );
  });
  await page.goto(`${base()}/food-helper?mode=parse`);
  await fit(page);
  await page.getByRole("textbox", { name: "Food description" }).fill("two eggs");
  await page.getByRole("button", { name: "Send food description" }).click();
  await expect(page.getByRole("heading", { name: "Review and add", exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: `Food match for two eggs: ${f.name} · ${f.preparation_state}`,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await expect(page.getByRole("button", { name: "Adding…", exact: true })).toHaveCount(2);
  release!();
  await expect(
    page.getByRole("alert").filter({ hasText: "Adding wasn’t confirmed" }),
  ).toBeVisible();
  const first = JSON.stringify(sent);
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await expect(page.getByRole("button", { name: "Adding…", exact: true }).first()).toBeVisible();
  release!();
  await expect(page.getByText("Added", { exact: true })).toBeVisible();
  expect(JSON.stringify(sent)).toBe(first);
  await page.getByRole("button", { name: "Done · 1 added", exact: true }).click();
  await expect(page.getByRole("link", { name: "View food log", exact: true })).toBeVisible();
  await fit(page);
  await page.screenshot({ path: "work/redesign-chat.png", fullPage: true });
});
test("suggestions use a separate screen and a visible choices picker", async ({ page }) => {
  const d = fixture();
  await mount(page, d);
  const f = d.foodLibrary[1];
  await page.route("**/api/ai/meal-suggestions", (r) =>
    r.fulfill({
      json: {
        data: {
          source: "fallback",
          message: "Built from your selected foods.",
          result: {
            suggestions: [
              { candidateId: "meal1", title: "Rice meal", explanation: "Your selected rice." },
            ],
          },
          candidates: [
            {
              id: "meal1",
              items: [{ foodId: f.id, name: f.name, grams: 150 }],
              kcal: 195,
              protein: 4,
              cost: null,
            },
          ],
        },
      },
    }),
  );
  await page.goto(`${base()}/food-helper?mode=meals`);
  await page.getByRole("button", { name: /Choose available foods/ }).click();
  await page.getByRole("textbox", { name: "Search available foods", exact: true }).fill("rice");
  await page
    .getByRole("button", { name: `${f.name} · ${f.preparation_state}`, exact: true })
    .click();
  await page.getByRole("button", { name: /^Done/ }).click();
  await page.getByRole("button", { name: "Suggest meals", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your meal ideas", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Suggest meals", exact: true })).toHaveCount(0);
  await fit(page);
  await page.screenshot({ path: "work/redesign-suggestions.png", fullPage: true });
  await page.getByRole("button", { name: "Review and add meal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add food", exact: true })).toBeVisible();
});
test("workout and exercise pages show demos and explicitly start a one-off session", async ({
  page,
}) => {
  const d = fixture();
  const ex = d.exerciseLibrary[0];
  const w = {
    id: "00000000-0000-4000-8000-000000000990",
    title: "Upper A",
    dayOfWeek: 1,
    current: true,
    sessionStatus: null,
    sessionId: null,
    equipmentAvailable: true,
    estimatedMinutes: 30,
    focus: "Your plan",
    dayLabel: d.date,
    exercises: [
      {
        id: ex.id,
        name: ex.name,
        targetSets: 3,
        targetReps: "8–12",
        restSeconds: 90,
        lastTime: "No previous session",
        sets: [{ id: "set1", weight: 0, reps: 8, rir: 2, done: false }],
      },
    ],
  };
  d.date = "2026-11-19";
  d.trainingStatus = "rest";
  d.workoutLibrary = [w];
  await mount(page, d);
  await page.route(`**/api/workouts/${w.id}`, (r) => r.fulfill({ json: { data: w } }));
  let body: unknown;
  await page.route("**/api/workout-sessions", (r) => {
    body = r.request().postDataJSON();
    d.session = {
      id: "00000000-0000-4000-8000-000000000991",
      status: "in_progress",
      workout_template_id: w.id,
    };
    d.workout = w;
    return r.fulfill({ json: { data: d.session } });
  });
  await page.goto(`${base()}/train`);
  await expect(page.getByText(/No workout is scheduled for Thursday/)).toBeVisible();
  await expect(page.getByText("Review training changes", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /Upper A · Monday/ }).click();
  await page.getByRole("link", { name: /Bodyweight Squat/ }).click();
  await expect(page.getByRole("heading", { name: "Bodyweight Squat", exact: true })).toBeVisible();
  await expect(page.getByText("Start/end positions", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /start position/ })).toBeVisible();
  await fit(page);
  await page.screenshot({ path: "work/redesign-exercise.png", fullPage: true });
  await page.getByRole("link", { name: "Back to workout", exact: true }).click();
  await page.getByRole("button", { name: "Start one-off session", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("weekly schedule stays unchanged");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Start one-off session", exact: true })
    .click();
  await expect.poll(() => body).toEqual({ templateId: w.id, allowUnscheduled: true });
  await expect(page.getByRole("button", { name: "Complete set", exact: false })).toBeVisible();
  await expect(page.getByText("Start/end positions", { exact: true })).toBeVisible();
});
test("saved meals have a library and editor with reachable save and ingredient selection", async ({
  page,
}) => {
  const d = fixture();
  await mount(page, d);
  let saved: unknown;
  await page.route("**/api/meals", (r) => {
    saved = r.request().postDataJSON();
    return r.fulfill({ json: { data: "saved" } });
  });
  await page.goto(`${base()}/saved-meals`);
  await expect(page.getByText("Your meals live here", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create meal", exact: true }).click();
  await page.getByRole("textbox", { name: "Meal name", exact: true }).fill("Rice bowl");
  await page.getByRole("button", { name: "Add ingredient", exact: true }).click();
  await page.getByRole("textbox", { name: "Search choose ingredient", exact: true }).fill("rice");
  await page.getByRole("button", { name: "Rice, cooked · as described", exact: true }).click();
  const save = page.getByRole("button", { name: "Save meal", exact: true });
  const rect = await save.boundingBox();
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(844);
  await save.click();
  await expect
    .poll(() => saved)
    .toMatchObject({ name: "Rice bowl", items: [{ food_id: d.foodLibrary[1].id, grams: 100 }] });
  await fit(page);
});
test("sign out is branded, reports errors and clears this device session on success", async ({
  page,
}) => {
  const d = fixture();
  await mount(page, d);
  let failed = true;
  await page.route("**/auth/v1/logout*", (r) =>
    r.fulfill(
      failed ? { status: 400, json: { msg: "Sign-out test failure" } } : { status: 204, body: "" },
    ),
  );
  await page.goto(`${base()}/settings`);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  failed = false;
  await page.goto(`${base()}/settings`);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("sb-dbiddamqpbeueykajapg-auth-token")),
  ).toBeNull();
});
