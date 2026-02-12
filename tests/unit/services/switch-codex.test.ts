import { describe, expect, test } from "vitest";
import { resolveCodexSwitchTarget } from "@/services/switch-codex";
import { normalizeAccountType } from "@/utils/account-type";

describe("switch codex selector", () => {
  test("normalizes team alias to business", () => {
    expect(normalizeAccountType("team")).toBe("business");
  });

  test("fails deterministically on ambiguous email match", () => {
    expect(() =>
      resolveCodexSwitchTarget(
        [
          { id: "1", email: "a@b.com", accountType: "personal" },
          { id: "2", email: "a@b.com", accountType: "business" }
        ],
        { email: "a@b.com" }
      )
    ).toThrow("Ambiguous");
  });
});
