import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readStore: vi.fn()
}));

vi.mock("@/store/store", () => ({
  readStore: mocks.readStore
}));

import { listAccounts } from "@/services/accounts-list";

describe("accounts list active semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("marks only codex active and never marks copilot active", async () => {
    mocks.readStore.mockResolvedValue({
      version: 1,
      active: {
        codex: "cx-1",
        copilot: "cp-1"
      },
      profiles: [
        {
          id: "cx-1",
          provider: "codex",
          email: "cx@example.com",
          createdAt: "2026-02-13T00:00:00.000Z",
          updatedAt: "2026-02-13T00:00:00.000Z",
          credentials: { kind: "codex_oauth", accessToken: "a", refreshToken: "r" }
        },
        {
          id: "cp-1",
          provider: "copilot",
          email: "cp@example.com",
          createdAt: "2026-02-13T00:00:00.000Z",
          updatedAt: "2026-02-13T00:00:00.000Z",
          credentials: { kind: "copilot_token", githubToken: "g" }
        }
      ]
    });

    const rows = await listAccounts();
    const codex = rows.find((r) => r.provider === "codex");
    const copilot = rows.find((r) => r.provider === "copilot");

    expect(codex?.active).toBe(true);
    expect(copilot?.active).toBe(false);
  });
});
