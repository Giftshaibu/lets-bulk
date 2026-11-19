import { test, expect } from "@playwright/test";
import { setup } from "./helpers";
test.skip(
  !process.env["E2E_EMAIL"] || !process.env["E2E_PASSWORD"],
  "Dedicated disposable account required",
);
test.use({ actionTimeout: 15000 });
test("bread and wheat search, source slices, and 500 ml beer survive logging and saved meals", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let authorization = "";
  page.on("request", (r) => {
    if (r.url().endsWith("/api/dashboard"))
      authorization = r.headers()["authorization"] ?? authorization;
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
  await page.goto("/food");
  await page.getByRole("button", { name: "Search foods", exact: true }).click();
  await page.getByLabel("Search foods", { exact: true }).fill("whole wheat bread");
  await page
    .getByRole("button", { name: /^Bread, whole-wheat, commercially prepared 100 g/ })
    .click();
  await page.getByRole("button", { name: "Use 1 slice (32 g)", exact: true }).click();
  await expect(page.getByLabel("Amount in grams", { exact: true })).toHaveValue("32");
  await page.getByLabel("Meal", { exact: true }).selectOption("breakfast");
  const breadLog = page.waitForResponse(
    (r) => r.url().endsWith("/api/nutrition/logs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Add to meal", exact: true }).click();
  expect((await breadLog).status()).toBe(200);
  await expect(page.getByText("32 g", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Search foods", exact: true }).click();
  await page.getByLabel("Search foods", { exact: true }).fill("beer");
  await page.getByRole("button", { name: /^Alcoholic beverage, beer, regular, all 100 g/ }).click();
  await expect(page.getByText(/Calories include alcohol energy/)).toBeVisible();
  await page.getByRole("button", { name: "500 ml", exact: true }).click();
  await expect(page.getByLabel("Amount in millilitres", { exact: true })).toHaveValue("500");
  await page.getByLabel("Meal", { exact: true }).selectOption("snack");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const beerLog = page.waitForResponse(
    (r) => r.url().endsWith("/api/nutrition/logs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Add to meal", exact: true }).click();
  expect((await beerLog).status()).toBe(200);
  await expect(page.getByText(/500 ml · 502.1 g/).first()).toBeVisible();
  const form = page.getByRole("form", { name: "Save Snack as meal", exact: true });
  await form.getByRole("textbox").fill("Measured drink fixture");
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/meals") && r.request().method() === "POST",
  );
  await form.getByRole("button", { name: "Save meal", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(form.getByRole("textbox")).toHaveValue("");
  await page.reload();
  await expect(page.getByText(/500 ml · 502.1 g/).first()).toBeVisible();
  const response = await page.request.get("/api/dashboard", {
    headers: { Authorization: authorization },
  });
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.foods).toHaveLength(201);
  const beer = data.meals
    .flatMap((m: { items: unknown[] }) => m.items)
    .find((i: { name: string }) => i.name === "Alcoholic beverage, beer, regular, all");
  expect(beer.kcal).toBeCloseTo(215.9, 1);
  expect(beer.grams).toBeCloseTo((29.7 / 29.5735295625) * 500, 3);
  expect(
    data.mealTemplates.find((m: { name: string }) => m.name === "Measured drink fixture").items[0]
      .grams,
  ).toBeCloseTo(beer.grams, 3);
  const search = await page.request.get("/api/foods?q=whole%20wheat%20bread", {
    headers: { Authorization: authorization },
  });
  expect(search.status()).toBe(200);
  expect(
    (await search.json()).data.some(
      (f: { name: string }) => f.name === "Bread, whole-wheat, commercially prepared",
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
