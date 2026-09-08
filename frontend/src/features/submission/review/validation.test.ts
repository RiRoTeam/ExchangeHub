import { describe, expect, it } from "vitest";
import { validateReviewComment } from "./validation";

describe("validateReviewComment", () => {
  it("requires a meaningful comment when declining", () => {
    expect(validateReviewComment("REJECTED", "   ")).toMatch(/comment/i);
    expect(validateReviewComment("REJECTED", "Duplicate opportunity")).toBe("");
  });

  it("keeps the comment optional when publishing", () => {
    expect(validateReviewComment("APPROVED", "")).toBe("");
  });
});
