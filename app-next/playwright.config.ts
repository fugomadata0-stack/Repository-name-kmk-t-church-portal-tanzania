import { defineConfig, devices } from "@playwright/test";

/** Jaribio la mzunguko: `npm run test:e2e`. Kwa kuingia halisi, weka E2E_EMAIL na E2E_PASSWORD kwenye mazingira ya shell (sio .env.local ya Vite). */

const isCi = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  /** CI: `vite preview` moja — epuka msongamano wa workers. */
  workers: isCi ? 1 : undefined,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  /** CI + vite preview baridi — usifikirie spinner / mtandao kwa sekunde 60 tu. */
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:4173",
    trace: "on-first-retry",
    navigationTimeout: 90_000,
    /**
     * GitHub Actions / Linux: /dev/shm ndogo mara nyingi → Chromium ina-crash bila hizi.
     * https://playwright.dev/docs/ci
     */
    ...(isCi
      ? {
          launchOptions: {
            args: ["--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox"],
          },
        }
      : {}),
  },
  webServer: {
    /** Hakikisha dist ipo: `test:e2e` huanzisha `build` kwanza; ikiwa unatumia `test:e2e:run` peke yake, endesha `npm run build` mwanzo. */
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !isCi,
    /** Seva ya preview ya baridi kwenye runner ya GitHub. */
    timeout: 180_000,
  },
});
