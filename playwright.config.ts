import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8080",
    ...(process.env["E2E_PROXY"]
      ? { proxy: { server: process.env["E2E_PROXY"], bypass: "localhost,127.0.0.1" } }
      : {}),
    ignoreHTTPSErrors: process.env["E2E_IGNORE_HTTPS_ERRORS"] === "1",
    launchOptions: process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"]
      ? { executablePath: process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"] }
      : {},
  },
});
