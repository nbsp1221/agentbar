import { describe, expect, test } from "vitest";
import { normalizeEmailSelector } from "../../../src/utils/string-normalize";

describe("string normalize", () => {
  test("normalizes email-like selectors for matching", () => {
    expect(normalizeEmailSelector(" Alice@Example.com ")).toBe("alice@example.com");
  });
});
