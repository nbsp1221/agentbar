import { describe, expect, test } from "vitest";
import { formatAccounts } from "@/cli/render/accounts";

describe("cli accounts renderer", () => {
  test("renders accounts table without account-type column", () => {
    const out = formatAccounts([
      { provider: "codex", email: "a@b.com", id: "1", active: true, note: "short" },
      {
        provider: "codex",
        email: "a@b.com",
        id: "2",
        active: false,
        note: "this is a very long note that should be truncated"
      }
    ]);

    expect(out.toLowerCase()).not.toContain("account");
    expect(out.toLowerCase()).toContain("note");
    expect(out).toContain("short");
    expect(out).toContain("...");
  });
});
