import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Dashboard } from "../../src/lib/services/dashboard.service";
test.use({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
test("mascot reactions remain local, header priorities clean up, and identity stays fixed", async ({
  page,
}) => {
  test.setTimeout(180000);
  const base = process.env["E2E_BASE_URL"] ?? "http://localhost:8080";
  const dashboard = JSON.parse(
    readFileSync(new URL("./fixtures/mascot-dashboard.json", import.meta.url), "utf8"),
  ) as Dashboard;
  dashboard.date = "2026-11-19";
  dashboard.rawProfile!.timezone = "Africa/Blantyre";
  dashboard.loggingDates = ["2026-11-17", "2026-11-18"];
  dashboard.weight.series = [{ date: "2026-11-18", kg: 60.25, trend: 60.25 }];
  await page.route("**/api/**", (route) => route.abort());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await expect(page.getByRole("heading", { name: "Chiuli", exact: true })).toBeVisible();
  await expect(page).toHaveTitle(/Chiuli/);
  await expect(page.locator('img[src="/chiuli-icon.png"]')).toBeVisible();

  const manifest = await (await page.request.get(`${base}/site.webmanifest`)).json();
  expect(manifest.name).toBe("Chiuli");
  expect((await page.request.get(`${base}/favicon.ico`)).status()).toBe(200);
  await page.route("**/api/dashboard", (route) => route.fulfill({ json: { data: dashboard } }));
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
  await page.clock.install({ time: new Date("2026-11-19T17:59:00Z") });
  await page.goto(`${base}/progress`);
  const streak = page.locator('[aria-label="Logging streak encouragement"] img');
  const header = page.locator('[aria-label="Chiuli status"] img');
  await expect(streak).toHaveAttribute("data-mascot", "confident");
  let releaseWeight: (() => void) | undefined,
    failWeight = false;
  await page.route("**/api/weight", async (route) => {
    const body = route.request().postDataJSON();
    await new Promise<void>((resolve) => {
      releaseWeight = resolve;
    });
    if (failWeight)
      return route.fulfill({ status: 503, json: { error: { message: "Synthetic save failure" } } });
    dashboard.weight.series = dashboard.weight.series
      .filter((w) => w.date !== body.date)
      .concat({ date: body.date, kg: body.weight_kg, trend: body.weight_kg });
    await route.fulfill({ json: { data: {} } });
  });
  await page.getByRole("button", { name: "Log weight", exact: true }).click();
  const weight = page.locator('[aria-label="Weight logging encouragement"] img');
  await expect(weight).toHaveAttribute("data-mascot", "neutral");
  await page.getByRole("button", { name: "Edit Weight (kg)", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Weight (kg)", exact: true }).fill("60.5");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(weight).toHaveAttribute("data-mascot", "thinking");
  await expect(header).toHaveAttribute("data-mascot", "thinking");
  await expect(streak).toHaveAttribute("data-mascot", "confident");
  await expect(page.getByRole("button", { name: "Edit Weight (kg)", exact: true })).toBeDisabled();
  releaseWeight!();
  await expect(weight).toHaveAttribute("data-mascot", "happy");
  await expect(header).toHaveAttribute("data-mascot", "happy");
  await page.getByRole("button", { name: "Edit Weight (kg)", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Weight (kg)", exact: true }).fill("60");
  await page.keyboard.press("Enter");
  await expect(weight).toHaveAttribute("data-mascot", "neutral");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(weight).toHaveAttribute("data-mascot", "thinking");
  releaseWeight!();
  await expect(weight).toHaveAttribute("data-mascot", "shocked");
  await page.getByRole("button", { name: "Edit Weight (kg)", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Weight (kg)", exact: true }).fill("60.25");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(weight).toHaveAttribute("data-mascot", "thinking");
  releaseWeight!();
  await expect(weight).toHaveAttribute("data-mascot", "grumpy");
  failWeight = true;
  await page.getByRole("button", { name: "Edit Weight (kg)", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Weight (kg)", exact: true }).fill("61");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Save weight", exact: true }).click();
  await expect(weight).toHaveAttribute("data-mascot", "thinking");
  releaseWeight!();
  await expect(weight).toHaveAttribute("data-mascot", "shocked");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(header).toHaveAttribute("data-mascot", "shocked");
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(header).toHaveAttribute("data-mascot", "confident");
  await page.clock.fastForward(60000);
  await expect(streak).toHaveAttribute("data-mascot", "shocked");
  await page.getByRole("button", { name: "Chiuli status", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("after 8 PM");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Chiuli status", exact: true })).toBeFocused();
  await page.goto(`${base}/food`);
  await expect(header).toHaveAttribute("data-mascot", "shocked");
  await page.getByRole("button", { name: "Suggest a meal", exact: true }).click();
  const helper = page.locator('[aria-label="Food helper encouragement"] img');
  await expect(helper).toHaveAttribute("data-mascot", "neutral");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  let releaseParse: (() => void) | undefined;
  await page.route("**/api/ai/parse-food-log", async (route) => {
    await new Promise<void>((resolve) => {
      releaseParse = resolve;
    });
    return route.fulfill({
      json: {
        data: {
          source: "fallback",
          reason: "AI_DISABLED",
          result: {
            items: [],
            clarificationNeeded: true,
            clarificationQuestion: "Use manual search.",
          },
        },
      },
    });
  });
  await page.getByRole("button", { name: "Describe what you ate", exact: true }).click();
  await page.getByLabel("Food description", { exact: true }).fill("two eggs");
  await page.getByRole("button", { name: "Interpret food description", exact: true }).click();
  await expect(helper).toHaveAttribute("data-mascot", "thinking");
  await expect(header).toHaveAttribute("data-mascot", "thinking");
  releaseParse!();
  await expect(helper).toHaveAttribute("data-mascot", "confident");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(header).toHaveAttribute("data-mascot", "shocked");
  await page.goto(`${base}/journey`);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  }
  await expect(page.locator('[aria-current="step"] img')).toHaveAttribute("data-mascot", "happy");
  for (const [status, expression] of [
    ["in_progress", "running"],
    ["completed", "happy"],
    ["abandoned", "grumpy"],
    [null, "neutral"],
  ] as const) {
    dashboard.session = status
      ? ({ id: "00000000-0000-4000-8000-000000000777", status } as NonNullable<
          Dashboard["session"]
        >)
      : null;
    await page.goto(`${base}/train`);
    await expect(page.locator('[aria-label="Workout encouragement"] img')).toHaveAttribute(
      "data-mascot",
      expression,
    );
  }
  await page.goto(`${base}/progress-details?section=weight`);
  await expect(weight).toHaveAttribute("data-mascot", "neutral");
  await page.setViewportSize({ width: 390, height: 844 });
  const assets = [
    "pose-neutral",
    "pose-happy",
    "pose-confident",
    "pose-thinking",
    "pose-grumpy",
    "pose-running",
    "pose-sad",
    "pose-shocked",
    "face-shocked",
    "face-confident",
    "face-grumpy",
    "face-thinking",
    "face-sad",
  ];
  for (const name of assets) {
    const r = await page.request.get(`${base}/mascots/${name}.webp`);
    expect(r.status(), name).toBe(200);
    expect(r.headers()["content-type"], name).toContain("image/webp");
  }
  await page.route("**/mascots/pose-neutral.webp", (route) => route.abort());
  await page.reload();
  await expect(weight).toHaveAttribute("src", "/chiuli-icon.png");
  expect(errors).toEqual([]);
});
