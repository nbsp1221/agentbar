import { describe, expect, test, vi } from "vitest";

const { renderAsciiTableMock } = vi.hoisted(() => ({
  renderAsciiTableMock: vi.fn(() => "<table>")
}));

vi.mock("@/cli/render/ascii-table", () => ({
  renderAsciiTable: renderAsciiTableMock
}));

import { formatAccounts } from "@/cli/render/accounts";

describe("cli accounts renderer table style", () => {
  test("passes ccusage-like header and border colors for accounts table", () => {
    formatAccounts([{ provider: "codex", email: "a@b.com", accountType: "personal", id: "1", active: true, note: "" }]);

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
