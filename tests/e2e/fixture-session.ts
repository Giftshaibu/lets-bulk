import type { Page } from "@playwright/test";
export async function fixtureSession(page: Page) {
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
}
