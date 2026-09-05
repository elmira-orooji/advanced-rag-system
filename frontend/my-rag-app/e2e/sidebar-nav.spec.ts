import { expect, test } from "@playwright/test";

import { seedSession, stubApi } from "./helpers.js";

test.describe("Sidebar navigation", () => {
  test("navigates between Workspace and Knowledge base pages", async ({ page }) => {
    await seedSession(page);
    await stubApi(page);

    await page.goto("/home");

    // Should start on Workspace page.
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible({ timeout: 10_000 });

    // Click Knowledge base in sidebar.
    await page.getByRole("button", { name: /knowledge base/i }).click();

    // Should navigate to the knowledge base page.
    await expect(page.getByText(/onboarding manual/i)).toBeVisible({ timeout: 10_000 });

    // Click Workspace (Home) in sidebar to go back.
    await page.getByRole("button", { name: /workspace|home/i }).first().click();

    // Should be back on Workspace.
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible({ timeout: 10_000 });
  });

  test("shows active state on the current navigation item", async ({ page }) => {
    await seedSession(page);
    await stubApi(page);

    await page.goto("/home");

    // The Workspace/Home button should have aria-current="page".
    const homeButton = page.getByRole("button", { name: /workspace|home/i }).first();
    await expect(homeButton).toHaveAttribute("aria-current", "page");

    // Navigate to Knowledge base.
    await page.getByRole("button", { name: /knowledge base/i }).click();
    await expect(page.getByText(/onboarding manual/i)).toBeVisible({ timeout: 10_000 });

    // Now Knowledge base should be active.
    const kbButton = page.getByRole("button", { name: /knowledge base/i });
    await expect(kbButton).toHaveAttribute("aria-current", "page");
  });

  test("collapses and expands the sidebar", async ({ page }) => {
    await seedSession(page);
    await stubApi(page);

    await page.goto("/home");

    // Sidebar should be expanded initially.
    const collapseButton = page.getByRole("button", { name: /collapse sidebar/i });
    await expect(collapseButton).toBeVisible({ timeout: 10_000 });

    // Click to collapse.
    await collapseButton.click();

    // Navigation labels should be hidden when collapsed.
    await expect(page.getByText("Workspace")).not.toBeVisible({ timeout: 3_000 });

    // Click expand button to restore.
    const expandButton = page.getByRole("button", { name: /expand sidebar/i });
    await expect(expandButton).toBeVisible();
    await expandButton.click();

    // Labels should be visible again.
    await expect(page.getByText("Workspace")).toBeVisible({ timeout: 5_000 });
  });
});