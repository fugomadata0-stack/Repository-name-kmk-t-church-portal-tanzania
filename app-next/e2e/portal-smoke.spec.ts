import { test, expect } from "@playwright/test";

/**
 * Jaribio la moshi — halina haja ya E2E_EMAIL (kwa ujumla).
 * Kwa ujumbe kamili (login + portal): weka mazingira
 * E2E_BASE_URL, E2E_EMAIL, E2E_PASSWORD kwenye shell.
 */

test.describe("KMT portal — mzunguko wa msingi", () => {
  async function expectNoCriticalUiErrors(page: import("@playwright/test").Page) {
    const bodyText = (await page.locator("body").innerText()).toLowerCase();
    expect(bodyText).not.toContain("nan");
    expect(bodyText).not.toContain("invalid date");
    expect(bodyText).not.toContain("something went wrong");
    expect(bodyText).not.toContain("hitilafu ya kiolesura");
  }

  test("fungua ukurasa (login au mipangilio)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const configured = await page.getByRole("heading", { name: "Ingia" }).isVisible().catch(() => false);
    const needsEnv = await page.getByRole("heading", { name: "Mipangilio ya mfumo" }).isVisible().catch(() => false);
    expect(configured || needsEnv).toBeTruthy();
    await expectNoCriticalUiErrors(page);
  });

  test("kichwa cha kuingia au mipangilio kinaonekana", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Ingia|Mipangilio ya mfumo/ })).toBeVisible();
  });

  test("ingia → dashibodi (E2E_EMAIL + E2E_PASSWORD)", async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL?.trim() || !process.env.E2E_PASSWORD, "Weka E2E_EMAIL na E2E_PASSWORD kwa jaribio la kuingia");

    await page.goto("/");
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

    await page.goto("/");
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
