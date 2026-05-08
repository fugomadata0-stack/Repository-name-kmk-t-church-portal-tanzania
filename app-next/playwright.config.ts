import { defineConfig, devices } from "@playwright/test";

/** Jaribio la mzunguko: `npm run test:e2e`. Kwa kuingia halisi, weka E2E_EMAIL na E2E_PASSWORD kwenye mazingira ya shell (sio .env.local ya Vite). */

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
