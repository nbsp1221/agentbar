import { describe, expect, test } from "vitest";
import { formatAmbiguousProfileCandidates, formatProfileCandidateHint } from "@/utils/profile-candidate";

describe("profile candidate hint utils", () => {
  test("formats single candidate with optional plan type", () => {
    expect(formatProfileCandidateHint({ id: "p1", planType: "plus" })).toBe("p1 (plus)");
    expect(formatProfileCandidateHint({ id: "p2" })).toBe("p2");
  });

  test("joins ambiguous candidates into comma-separated hint list", () => {
    expect(
      formatAmbiguousProfileCandidates([
        { id: "p1", planType: "plus" },
        { id: "p2", planType: "team" },
        { id: "p3" }
      ])
    ).toBe("p1 (plus), p2 (team), p3");
  });
});
