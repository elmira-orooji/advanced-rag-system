import { expect, test } from "@playwright/test";

import { regularUser, seedSession, stubApi } from "./helpers.js";

test.describe("Authentication", () => {
  test("shows validation errors for an empty login form", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator("#username-error")).toBeVisible();
    await expect(page.locator("#password-error")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("signs in successfully and lands on the dashboard", async ({ page }) => {
    await stubApi(page);
    await page.goto("/");

    await page.locator("#username").fill(regularUser.username);
    await page.locator("#password").fill("supersecret");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/home(\/|$)/);
    await expect(page.locator('aside[aria-label="Main sidebar"]')).toBeVisible();
    await expect(page.getByText(regularUser.organization_name)).toBeVisible();
  });

  test("logs out and returns to the sign-in screen", async ({ page }) => {
    await stubApi(page);
    await seedSession(page);
    await page.goto("/home");

    await expect(page.locator('aside[aria-label="Main sidebar"]')).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("#username")).toBeVisible();
  });
});
