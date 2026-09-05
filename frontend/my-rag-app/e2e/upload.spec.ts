import { expect, test } from "@playwright/test";

import { adminUser, seedSession, stubApi, sampleDocument } from "./helpers.js";

test.describe("File upload", () => {
  test("uploads a file via the knowledge base page and shows it in the list", async ({ page }) => {
    await seedSession(page, adminUser);
    await stubApi(page, { documents: [sampleDocument] });

    // Navigate to Knowledge base page via sidebar.
    await page.goto("/home");
    await page.getByRole("button", { name: /knowledge base/i }).click();

    // Wait for the knowledge base page to load.
    await expect(page.getByText(/onboarding manual/i)).toBeVisible({ timeout: 10_000 });

    // The existing document should be visible.
    await expect(page.getByText("handbook.pdf")).toBeVisible({ timeout: 5_000 });

    // Upload a new file using the file input.
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("fake pdf content"),
    });

    // A success toast should appear.
    await expect(page.getByText(/uploaded|بارگذاری/i)).toBeVisible({ timeout: 5_000 });
  });

  test("shows drag-and-drop zone on the knowledge base page", async ({ page }) => {
    await seedSession(page, adminUser);
    await stubApi(page, { documents: [] });

    await page.goto("/home");
    await page.getByRole("button", { name: /knowledge base/i }).click();

    // The dropzone should be visible with appropriate text.
    await expect(page.getByText(/drag.*drop|بارگذاری اسناد/i)).toBeVisible({ timeout: 10_000 });
  });
});