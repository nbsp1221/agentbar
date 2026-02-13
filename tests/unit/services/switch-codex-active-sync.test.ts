import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  outro: vi.fn(),
  resolveStorePath: vi.fn(),
  readStore: vi.fn(),
  setActiveProfile: vi.fn(),
  upsertProfile: vi.fn(),
  ensureFreshCodexProfile: vi.fn(),
  writeCodexAuthFromProfile: vi.fn()
}));

vi.mock("@clack/prompts", () => ({
  outro: mocks.outro
}));

vi.mock("@/store/paths", () => ({
  resolveStorePath: mocks.resolveStorePath
}));

vi.mock("@/store/store", () => ({
  readStore: mocks.readStore,
  setActiveProfile: mocks.setActiveProfile,
  upsertProfile: mocks.upsertProfile
}));

vi.mock("@/providers/codex/refresh", () => ({
  ensureFreshCodexProfile: mocks.ensureFreshCodexProfile
}));

vi.mock("@/providers/codex/apply-auth", () => ({
  writeCodexAuthFromProfile: mocks.writeCodexAuthFromProfile
}));

import { switchCodex } from "@/services/switch-codex";

describe("switch codex active synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveStorePath.mockReturnValue("/tmp/agentbar-store.json");
    mocks.readStore.mockResolvedValue({
      version: 1,
      active: {},
      profiles: [
        {
          id: "p1",
          provider: "codex",
          email: "a@b.com",
          planType: "plus",
          note: undefined,
          createdAt: "2026-02-13T00:00:00.000Z",
          updatedAt: "2026-02-13T00:00:00.000Z",
          credentials: {
            kind: "codex_oauth",
            accessToken: "access-token",
            refreshToken: "refresh-token",
            idToken: "id-token"
          }
        }
      ]
    });
    mocks.ensureFreshCodexProfile.mockResolvedValue({});
    mocks.writeCodexAuthFromProfile.mockReturnValue("/tmp/.codex/auth.json");
    mocks.setActiveProfile.mockResolvedValue(undefined);
    mocks.upsertProfile.mockResolvedValue(undefined);
  });

  test("updates active pointer only after auth.json write succeeds", async () => {
    await switchCodex({ email: "a@b.com" });

    expect(mocks.writeCodexAuthFromProfile).toHaveBeenCalledTimes(1);
    expect(mocks.setActiveProfile).toHaveBeenCalledWith("/tmp/agentbar-store.json", "codex", "p1");

    const writeOrder = mocks.writeCodexAuthFromProfile.mock.invocationCallOrder[0]!;
    const activeOrder = mocks.setActiveProfile.mock.invocationCallOrder[0]!;
    expect(writeOrder).toBeLessThan(activeOrder);
  });

  test("does not update active pointer when auth write fails", async () => {
    mocks.writeCodexAuthFromProfile.mockImplementation(() => {
      throw new Error("write failed");
    });

    await expect(switchCodex({ email: "a@b.com" })).rejects.toThrow("write failed");
    expect(mocks.setActiveProfile).not.toHaveBeenCalled();
  });
});
