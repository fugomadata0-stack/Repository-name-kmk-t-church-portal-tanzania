import { defineConfig, devices } from "@playwright/test";

/** Jaribio la mzunguko: `npm run test:e2e`. Kwa kuingia halisi, weka E2E_EMAIL na E2E_PASSWORD kwenye mazingira ya shell (sio .env.local ya Vite). */

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  /** CI: `vite preview` moja — epuka msongamano wa workers. */
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  /** Preview / cold start inaweza kuchukua zaidi ya ~30s haswa CI. */
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:4173",
    trace: "on-first-retry",
    navigationTimeout: 60_000,
  },
  webServer: {
    /** Hakikisha dist ipo: `test:e2e` huanzisha `build` kwanza; ikiwa unatumia `test:e2e:run` peke yake, endesha `npm run build` mwanzo. */
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
