import { test, expect } from "@playwright/test";
import { setup } from "./helpers";
test.skip(
  !process.env["E2E_EMAIL"] || !process.env["E2E_PASSWORD"],
  "Disposable test credentials required",
);
test.use({ actionTimeout: 15000 });
test("focused AI fallbacks, reviewed food drafts and native binding configuration preserve core actions", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let authorization = "",
    batch: unknown = null;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/dashboard"))
      authorization = r.headers()["authorization"] ?? authorization;
    if (r.url().endsWith("/api/nutrition/logs/batch")) batch = r.postDataJSON();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(process.env["E2E_EMAIL"]!);
  await page.getByLabel("Password", { exact: true }).fill(process.env["E2E_PASSWORD"]!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const onboarding = page.getByRole("heading", { name: "Let’s start with you" });
  await expect(
    onboarding.or(page.getByRole("heading", { name: "Today", exact: true })),
  ).toBeVisible({ timeout: 30000 });
  if (await onboarding.isVisible()) await setup(page);
  const get = async () => {
    const r = await page.request.get("/api/dashboard", {
      headers: { Authorization: authorization },
    });
    expect(r.status()).toBe(200);
    return (await r.json()).data;
  };
  const initial = await get(),
    targets = initial.targets;
  const post = (path: string, data: unknown) =>
    page.request.post(path, { headers: { Authorization: authorization }, data });
  const today = new Date(`${initial.date}T12:00:00Z`).getUTCDay();
  const settings = await post("/api/settings", {
    first_name: initial.profile.name,
    water_target_ml: 2500,
    diet_type: "omnivore",
    budget_mode: "balanced",
    days: [today, (today + 2) % 7, (today + 4) % 7],
  });
  expect(settings.status()).toBe(200);
  const weekly = page.waitForResponse((r) => r.url().endsWith("/api/checkins/weekly"));
  await page.getByRole("button", { name: "Run weekly check-in", exact: true }).click();
  expect((await weekly).status()).toBe(200);
  await page.getByRole("button", { name: "This week in plain language", exact: true }).click();
  await expect(page.getByText(/Automatic wording isn’t available/).first()).toBeVisible();
  await page.getByRole("button", { name: "Why this change?", exact: true }).first().click();
  await expect(page.getByText(/Automatic wording isn’t available/)).toHaveCount(2);
  const current = await get(),
    egg = current.foodLibrary.find(
      (f: { source_reference: string }) =>
        f.source_reference === "https://fdc.nal.usda.gov/food-details/173424/nutrients",
    ),
    rice = current.foodLibrary.find(
      (f: { source_reference: string }) =>
        f.source_reference === "https://fdc.nal.usda.gov/food-details/168878/nutrients",
    );
  const count = (d: typeof current) => d.meals.flatMap((m: { items: unknown[] }) => m.items).length;
  const fallback = await post("/api/ai/parse-food-log", { text: "two eggs", date: current.date });
  expect(fallback.status()).toBe(200);
  const unavailable = (await fallback.json()).data;
  expect(unavailable.source).toBe("fallback");
  if (process.env["E2E_BASE_URL"]?.includes("workers.dev"))
    expect(unavailable.reason).toBe("AI_DISABLED");
  const noAuth = await page.request.post("/api/ai/parse-food-log", {
    data: { text: "eggs", date: current.date },
  });
  expect(noAuth.status()).toBe(401);
  expect(
    (
      await post("/api/ai/explain-recommendation", {
        recommendationId: "00000000-0000-4000-8000-999999999999",
      })
    ).status(),
  ).toBe(404);
  await page.goto("/food");
  await page.getByRole("button", { name: "Describe what you ate", exact: true }).click();
  await page.getByLabel("Food description", { exact: true }).fill("two eggs");
  await page.getByRole("button", { name: "Interpret food description", exact: true }).click();
  await expect(page.getByText(/Couldn.t interpret that automatically/)).toBeVisible();
  await page.getByRole("button", { name: "Search foods manually instead", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Add food");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.route("**/api/ai/parse-food-log", (route) =>
    route.fulfill({
      json: {
        data: {
          source: "ai",
          result: {
            items: [
              {
                query: "nsima",
                sourceText: "nsima",
                quantity: null,
                unit: null,
                mealType: null,
                confidence: 0.8,
                matches: [],
              },
              {
                query: "egg",
                sourceText: "two eggs",
                quantity: 2,
                unit: "piece",
                mealType: null,
                confidence: 0.95,
                matches: [
                  {
                    id: egg.id,
                    name: egg.name,
                    preparation: egg.preparation_state,
                    servingName: egg.serving_name,
                    servingGrams: egg.serving_grams,
                    servingVolumeMl: egg.serving_volume_ml,
                  },
                ],
              },
            ],
            clarificationNeeded: true,
            clarificationQuestion: "Confirm the foods and portions.",
          },
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Describe what you ate", exact: true }).click();
  await page.getByLabel("Food description", { exact: true }).fill("nsima and two eggs");
  await page.getByRole("button", { name: "Interpret food description", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Log confirmed foods", exact: true }),
  ).toBeDisabled();
  expect(count(await get())).toBe(count(current));
  await page
    .getByRole("checkbox", { name: /Skip this item/ })
    .first()
    .check();
  await page.getByLabel("Food match for egg", { exact: true }).selectOption(egg.id);
  await expect(
    page.getByRole("button", { name: "Log confirmed foods", exact: true }),
  ).toBeEnabled();
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/nutrition/logs/batch"));
  await page.getByRole("button", { name: "Log confirmed foods", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const logged = await get();
  expect(count(logged)).toBe(count(current) + 1);
  expect(logged.targets).toEqual(targets);
  const eggLog = logged.meals
    .flatMap((m: { items: unknown[] }) => m.items)
    .find((i: { foodId: string }) => i.foodId === egg.id);
  expect(eggLog.grams).toBe(100);
  expect((await post("/api/nutrition/logs/batch", batch)).status()).toBe(200);
  expect(count(await get())).toBe(count(logged));
  await page.unroute("**/api/ai/parse-food-log");
  let release: () => void = () => {};
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/ai/parse-food-log", async (route) => {
    await delayed;
    await route.fulfill({
      json: {
        data: {
          source: "ai",
          result: {
            items: [
              {
                query: "egg",
                sourceText: "two eggs",
                quantity: 2,
                unit: "piece",
                mealType: null,
                confidence: 0.9,
                matches: [
                  {
                    id: egg.id,
                    name: egg.name,
                    preparation: egg.preparation_state,
                    servingName: egg.serving_name,
                    servingGrams: egg.serving_grams,
                    servingVolumeMl: egg.serving_volume_ml,
                  },
                ],
              },
            ],
            clarificationNeeded: false,
          },
        },
      },
    });
  });
  await page.getByRole("button", { name: "Describe what you ate", exact: true }).click();
  await page.getByLabel("Food description", { exact: true }).fill("two eggs");
  const lateResponse = page.waitForResponse((r) => r.url().endsWith("/api/ai/parse-food-log"));
  await page.getByRole("button", { name: "Interpret food description", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Suggest a meal", exact: true }).click();
  release();
  await lateResponse;
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await expect(page.getByText("Confirm your food draft", { exact: true })).toHaveCount(0);

  const dialog = page.getByRole("dialog");
  for (const c of await dialog.locator("input[type=checkbox]").all())
    if (await c.isChecked()) await c.uncheck();
  await dialog.getByLabel("Find available foods", { exact: true }).fill("egg");
  await dialog.getByRole("checkbox", { name: /^Egg, whole, cooked, hard-boiled/ }).check();
  await dialog.getByLabel("Find available foods", { exact: true }).fill("rice");
  const riceLabel = dialog.locator("label").filter({ hasText: rice.name });
  await riceLabel.getByRole("checkbox").first().check();
  const suggested = page.waitForResponse((r) => r.url().endsWith("/api/ai/meal-suggestions"));
  await dialog.getByRole("button", { name: "Suggest from these foods", exact: true }).click();
  expect((await suggested).status()).toBe(200);
  await dialog.getByRole("button", { name: "Review this meal", exact: true }).first().click();
  await expect(
    dialog.getByRole("button", { name: "Log confirmed foods", exact: true }),
  ).toBeEnabled();
  expect(count(await get())).toBe(count(logged));
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/train");
  await page.getByText("How do I do this?", { exact: true }).first().click();
  await page.getByRole("button", { name: "Explain more simply", exact: true }).first().click();
  await expect(page.getByText(/Automatic wording isn’t available/)).toBeVisible();
  expect((await get()).targets).toEqual(targets);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
