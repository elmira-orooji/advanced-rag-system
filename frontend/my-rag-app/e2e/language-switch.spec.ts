import { expect, test } from "@playwright/test";

import { seedSession, stubApi } from "./helpers.js";

test.describe("Language switch", () => {
  test("switches from English to Persian and updates dir attribute", async ({ page }) => {
    await seedSession(page);
    await stubApi(page);

    await page.goto("/home");

    // Should start in English (LTR).
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible({ timeout: 10_000 });

    // Click the language toggle button.
    const langButton = page.getByRole("button", { name: /change language/i });
    await expect(langButton).toBeVisible();
    await langButton.click();

    // Should switch to Persian (RTL).
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // The heading should now be in Persian.
    await expect(page.getByText(/خوش آمدید/i)).toBeVisible({ timeout: 5_000 });
  });

  test("persists language preference across page reloads", async ({ page }) => {
    await seedSession(page);
    await stubApi(page);

    // Set language to Persian before loading.
    await page.addInitScript(() => {
      localStorage.setItem("lang", "fa");
    });

    await page.goto("/home");

    // Should load in Persian (RTL) immediately.
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText(/خوش آمدید/i)).toBeVisible({ timeout: 10_000 });
  });
});