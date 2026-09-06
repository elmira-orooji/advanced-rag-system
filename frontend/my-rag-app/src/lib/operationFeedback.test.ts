import { describe, expect, it } from "vitest";
import { operationError, processingStageLabel } from "./operationFeedback";

describe("operation feedback", () => {
  it("turns technical network failures into an actionable upload message", () => {
    expect(operationError(new Error("Failed to fetch"), "upload", false)).toMatch(/couldn't be uploaded/i);
  });

  it("uses a meaningful localized processing stage", () => {
    expect(processingStageLabel("embedding", true)).toBe("در حال ایندکس‌کردن");
  });
});
