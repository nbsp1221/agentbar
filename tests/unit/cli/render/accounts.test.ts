import { describe, expect, test } from "vitest";
import { formatAccounts } from "@/cli/render/accounts";

describe("cli accounts renderer", () => {
  test("renders codex same-email multi-account rows", () => {
    const out = formatAccounts([
      { provider: "codex", email: "a@b.com", accountType: "personal", id: "1", active: true, note: "short" },
      {
        provider: "codex",
        email: "a@b.com",
        accountType: "business",
        id: "2",
        active: false,
        note: "this is a very long note that should be truncated"
      }
    ]);

    expect(out).toContain("personal");
    expect(out).toContain("business");
    expect(out.toLowerCase()).toContain("note");
    expect(out).toContain("short");
    expect(out).toContain("...");
  });
});
