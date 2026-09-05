import { expect, test } from "@playwright/test";

import { seedSession, stubApi } from "./helpers.js";

const conversations = [
  {
    id: "conv-1",
    title: "Refund policy question",
    document_id: null,
    document_set_id: "set-1",
    assistant_id: null,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "conv-2",
    title: "Onboarding steps",
    document_id: null,
    document_set_id: "set-1",
    assistant_id: null,
    created_at: "2025-02-02T00:00:00Z",
    updated_at: "2025-02-02T00:00:00Z",
  },
];

test.describe("Conversation CRUD", () => {
  test("lists existing conversations in the sidebar", async ({ page }) => {
    await seedSession(page);
    await stubApi(page, { conversations });

    await page.goto("/home");

    // Both conversations should appear in the sidebar.
    await expect(page.getByText("Refund policy question")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Onboarding steps")).toBeVisible();
  });

  test("renames a conversation via the sidebar rename button", async ({ page }) => {
    await seedSession(page);
    await stubApi(page, { conversations });

    await page.goto("/home");

    await expect(page.getByText("Refund policy question")).toBeVisible({ timeout: 10_000 });

    // Click the rename button for the first conversation.
    const renameButton = page.getByRole("button", { name: /rename.*refund policy question/i });
    await expect(renameButton).toBeVisible();
    await renameButton.click();

    // A dialog or inline edit should appear. Check for an input field.
    const editInput = page.locator('input[type="text"]');
    await expect(editInput.first()).toBeVisible({ timeout: 5_000 });
  });

  test("deletes a conversation via the sidebar delete button", async ({ page }) => {
    await seedSession(page);
    await stubApi(page, { conversations });

    await page.goto("/home");

    await expect(page.getByText("Onboarding steps")).toBeVisible({ timeout: 10_000 });

    // Click the delete button for the second conversation.
    const deleteButton = page.getByRole("button", { name: /delete.*onboarding steps/i });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // A confirmation dialog should appear.
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  });
});