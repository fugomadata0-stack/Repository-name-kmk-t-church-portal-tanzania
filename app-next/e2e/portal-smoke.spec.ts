import { test, expect } from "@playwright/test";

/**
 * Jaribio la moshi — halina haja ya E2E_EMAIL (kwa ujumla).
 * Kwa ujumbe kamili (login + portal): weka mazingira
 * E2E_BASE_URL, E2E_EMAIL, E2E_PASSWORD kwenye shell.
 */

const gotoPortal = async (page: import("@playwright/test").Page) => {
  await page.goto("/", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  /** RootShell huonyesha spinner hadi authInitialized — hakuna h2 la “Ingia” kabla. */
  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), { timeout: 120_000 })
    .catch(() => undefined);
};

/** Ukurasa wa kuingia (h2) au tatizo la mazingira ya Supabase (h1). */
function loginOrEnvHeading(page: import("@playwright/test").Page) {
  return page
    .getByRole("heading", { name: /Ingia|Imeshindikana kuwasiliana|Supabase/i })
    .first();
}

test.describe("KMT portal — mzunguko wa msingi", () => {
  async function expectNoCriticalUiErrors(page: import("@playwright/test").Page) {
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("nan");
    expect(bodyText).not.toContain("invalid date");
    expect(bodyText).not.toContain("something went wrong");
    expect(bodyText).not.toContain("hitilafu ya kiolesura");
  }

  test("fungua ukurasa (login au mipangilio)", async ({ page }) => {
    await gotoPortal(page);
    await expect(page.locator("body")).toBeVisible();
    await expect(loginOrEnvHeading(page)).toBeVisible({ timeout: 60_000 });
    await expectNoCriticalUiErrors(page);
  });

  test("kichwa cha kuingia au mipangilio kinaonekana", async ({ page }) => {
    await gotoPortal(page);
    await expect(loginOrEnvHeading(page)).toBeVisible({ timeout: 60_000 });
  });

  test("ingia → dashibodi (E2E_EMAIL + E2E_PASSWORD)", async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL?.trim() || !process.env.E2E_PASSWORD, "Weka E2E_EMAIL na E2E_PASSWORD kwa jaribio la kuingia");

    await gotoPortal(page);
    await page.getByLabel("Barua pepe").fill(process.env.E2E_EMAIL!.trim());
    await page.getByLabel("Nenosiri").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Ingia" }).click();

    await expect(page.getByText("Inapakia akaunti…").or(page.getByText("KMK(T) Internal Portal"))).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("KMK(T) Internal Portal")).toBeVisible({ timeout: 45_000 });
    await expectNoCriticalUiErrors(page);
  });

  test("portal modules basic health (live login required)", async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL?.trim() || !process.env.E2E_PASSWORD, "Weka E2E_EMAIL na E2E_PASSWORD kwa health-check ya moduli");

    await gotoPortal(page);
    await page.getByLabel("Barua pepe").fill(process.env.E2E_EMAIL!.trim());
    await page.getByLabel("Nenosiri").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Ingia" }).click();
    await expect(page.getByText("KMK(T) Internal Portal")).toBeVisible({ timeout: 45_000 });

    const moduleButtons = [
      "Dashibodi Kuu",
      "Fedha, Michango & Matumizi",
      "Documents",
      "Gallery",
      "Notifications / Taarifa",
      "Viongozi",
      "Waumini & Familia",
      "Mahudhurio",
      "Analytics",
    ];

    for (const name of moduleButtons) {
      const btn = page.getByRole("button", { name, exact: false }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(250);
        await expect(page.locator("#portal-main-scroll")).toBeVisible();
        await expectNoCriticalUiErrors(page);
      }
    }
  });
});
