import { describe, expect, test, vi } from "vitest";

const { renderAsciiTableMock } = vi.hoisted(() => ({
  renderAsciiTableMock: vi.fn(() => "<table>")
}));

vi.mock("../../../../src/cli/render/ascii-table", () => ({
  renderAsciiTable: renderAsciiTableMock
}));

import { formatUsageSections } from "../../../../src/cli/render/usage";

describe("cli usage renderer table style", () => {
  test("passes ccusage-like header and border colors for usage tables", () => {
    formatUsageSections([
      {
        provider: "codex",
        email: "alice@example.com",
        accountType: "personal",
        planType: "plus",
        note: "",
        primaryLabel: "5h",
        primaryUsedPercent: 20,
        primaryResetAtMs: Date.now() + 3 * 60 * 60 * 1000,
        secondaryLabel: "weekly",
        secondaryUsedPercent: 30,
        secondaryResetAtMs: Date.now() + 2 * 24 * 60 * 60 * 1000
      }
    ]);

    expect(renderAsciiTableMock).toHaveBeenCalledTimes(1);
    expect(renderAsciiTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        style: {
          head: ["cyan"],
          border: ["grey"]
        }
      })
    );
  });
});
