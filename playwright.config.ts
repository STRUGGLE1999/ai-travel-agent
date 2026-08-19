import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      // Use the system Chrome so no browser download is required.
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      // E2E always runs the deterministic DEMO mode: never spend real
      // model quota from tests, regardless of local .env contents.
      ANTHROPIC_API_KEY: "",
      ANTHROPIC_BASE_URL: "",
      ANTHROPIC_MODEL: "",
      DATABASE_URL: "",
      RATE_LIMIT_SALT: "",
    },
  },
});
