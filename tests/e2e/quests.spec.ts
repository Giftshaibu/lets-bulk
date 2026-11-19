import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Dashboard } from "../../src/lib/services/dashboard.service";
test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
test("loading, aligned nutrition, mobile quests, dropdowns, XP and reduced motion", async ({
  page,
}) => {
  test.setTimeout(180000);
  const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8080";
  const dashboard = JSON.parse(
    readFileSync(new URL("./fixtures/mascot-dashboard.json", import.meta.url), "utf8"),
  ) as Dashboard;
  dashboard.date = "2026-11-19";
  dashboard.rewards = { totalXp: 120, todayXp: 65 };
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", (r) => r.abort());
  let release: (() => void) | undefined;
  let hold = true;
  await page.route("**/api/dashboard", async (r) => {
    if (hold)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await r.fulfill({ json: { data: dashboard } });
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
  await expect(page.getByRole("status")).toHaveText("Loading your logs…");
  await expect(page.locator("main img")).toHaveCount(1);
  await expect(page.locator("main img")).toHaveAttribute("data-mascot", "thinking");
  hold = false;
  release!();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(page.getByLabel("XP summary")).toContainText("120 XP total");
  for (const width of [320, 360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const tiles = page.getByRole("list", { name: "Quest checklist" }).getByRole("listitem");
    expect(await tiles.count()).toBe(5);
    for (const tile of await tiles.all())
      expect(await tile.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    const macros = page.locator('[aria-label="Nutrition macros"] > div');
    const boxes = await macros.evaluateAll((es) =>
      es.map((e) => e.getBoundingClientRect().toJSON()),
    );
    expect(boxes).toHaveLength(3);
    expect(Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y))).toBeLessThan(1);
    expect(
      Math.max(...boxes.map((b) => b.height)) - Math.min(...boxes.map((b) => b.height)),
    ).toBeLessThan(1);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page
    .getByRole("list", { name: "Quest checklist" })
    .locator("span")
    .evaluateAll((es) => es.forEach((e) => ((e as HTMLElement).style.fontSize = "20px")));
  for (const tile of await page
    .getByRole("list", { name: "Quest checklist" })
    .getByRole("listitem")
    .all())
    expect(await tile.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/quests-mobile.png", fullPage: true });
  let rewarded = false;
  await page.route("**/api/water", async (r) => {
    const grants = rewarded
      ? []
      : [
          {
            id: "00000000-0000-4000-8000-000000000015",
            date: "2026-11-19",
            kind: "water",
            slot: "",
            points: 15,
          },
        ];
    rewarded = true;
    dashboard.rewards = { totalXp: 135, todayXp: 80 };
    await r.fulfill({ json: { data: {}, rewards: { ...dashboard.rewards, grants } } });
  });
  await page.getByRole("button", { name: "Add water", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "+15 XP" })).toBeVisible();
  await expect(page.getByLabel("XP summary")).toContainText("135 XP total");
  await page.reload();
  await expect(page.getByLabel("XP summary")).toContainText("135 XP total");
  await page.getByRole("button", { name: "Add water", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "+15 XP" })).toHaveCount(0);
  await page.getByRole("button", { name: "Hear encouragement from Chiuli" }).first().click();
  await expect(
    page.getByRole("status").filter({ hasText: "One intentional action" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".mascot-float")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page.goto(`${base}/food`);
  await page.getByRole("button", { name: "Describe what you ate", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    close = page.getByRole("button", { name: "Close", exact: true });
  const title = await dialog.getByRole("heading").boundingBox(),
    x = await close.boundingBox();
  expect(x!.x).toBeGreaterThan(title!.x);
  expect(Math.abs(x!.y - title!.y)).toBeLessThan(3);
  const date = dialog.getByLabel("Date", { exact: true }),
    meal = dialog.getByLabel("Helper meal", { exact: true });
  const a = await date.boundingBox(),
    b = await meal.boundingBox();
  expect(Math.abs(a!.width - b!.width)).toBeLessThan(1);
  expect(a!.height).toBeGreaterThanOrEqual(48);
  expect(b!.height).toBeGreaterThanOrEqual(48);
  await page.setViewportSize({ width: 320, height: 560 });
  await dialog.getByLabel("Food description").focus();
  expect(await dialog.evaluate((e) => e.clientHeight <= innerHeight - 24)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
