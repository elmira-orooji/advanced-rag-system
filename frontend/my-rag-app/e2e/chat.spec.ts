import { expect, test } from "@playwright/test";

import { seedSession, stubApi } from "./helpers.js";

test.describe("Conversation chat E2E", () => {
  test("selects a knowledge base, sends a message, and renders the grounded answer", async ({ page }) => {
    await seedSession(page);
    await stubApi(page, { answer: "You can request a refund within 30 days." });

    await page.goto("/home");

    // Welcome screen with the knowledge-base picker loaded from the stub.
    await expect(page.getByText("What would you like to explore?")).toBeVisible();
    await expect(page.locator('select[aria-label="Select knowledge base"]')).toHaveValue("set-1");

    // Type and submit a question.
    await page.locator('textarea[aria-label="Message"]').fill("What is the refund policy?");
    await page.getByRole("button", { name: "Send message" }).click();

    // The user's question is echoed back in the thread.
    await expect(page.getByText("What is the refund policy?")).toBeVisible();
    // The assistant's grounded answer appears (from the mocked backend).
    await expect(page.getByText(/refund within 30 days/i)).toBeVisible();
    // The conversation was created and we navigated to its chat route.
    await expect(page).toHaveURL(/\/home\/chat\/conv-1/);
  });
});
