import { describe, expect, test } from "vitest";
import { formatAccounts } from "../../../../src/cli/render/accounts";

describe("cli accounts renderer", () => {
  test("renders codex same-email multi-account rows", () => {
    const out = formatAccounts([
      { provider: "codex", email: "a@b.com", accountType: "personal", id: "1", active: true },
      { provider: "codex", email: "a@b.com", accountType: "business", id: "2", active: false }
    ]);

    expect(out).toContain("personal");
    expect(out).toContain("business");
  });
});
