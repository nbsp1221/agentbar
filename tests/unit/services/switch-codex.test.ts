import { describe, expect, test } from "vitest";
import { resolveCodexSwitchTarget } from "@/services/switch-codex";

describe("switch codex selector", () => {
  test("fails deterministically on ambiguous email match", () => {
    expect(() =>
      resolveCodexSwitchTarget(
        [{ id: "1", email: "a@b.com" }, { id: "2", email: "a@b.com" }],
        { email: "a@b.com" }
      )
    ).toThrow("Ambiguous");
  });

  test("selects the matching profile when plan is provided", () => {
    const selected = resolveCodexSwitchTarget(
      [
        { id: "1", email: "a@b.com", planType: "plus" },
        { id: "2", email: "a@b.com", planType: "team" }
      ],
      { email: "a@b.com", plan: "team" }
    );

    expect(selected.id).toBe("2");
  });
});
