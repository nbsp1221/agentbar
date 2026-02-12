import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  intro: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
  requestDeviceCode: vi.fn(),
  pollForAccessToken: vi.fn(),
  fetchCopilotLabel: vi.fn(),
  fetchCopilotUsageForProfile: vi.fn(),
  resolveStorePath: vi.fn(),
  upsertProfile: vi.fn(),
  setActiveProfile: vi.fn(),
  randomUUID: vi.fn()
}));

vi.mock("@clack/prompts", () => ({
  intro: mocks.intro,
  note: mocks.note,
  outro: mocks.outro,
  spinner: () => ({
    start: mocks.spinnerStart,
    stop: mocks.spinnerStop
  })
}));

vi.mock("node:crypto", () => ({
  randomUUID: mocks.randomUUID
}));

vi.mock("@/providers/copilot/device-flow", () => ({
  requestDeviceCode: mocks.requestDeviceCode,
  pollForAccessToken: mocks.pollForAccessToken
}));

vi.mock("@/providers/copilot/identity", () => ({
  fetchCopilotLabel: mocks.fetchCopilotLabel
}));

vi.mock("@/providers/copilot/usage", () => ({
  fetchCopilotUsageForProfile: mocks.fetchCopilotUsageForProfile
}));

vi.mock("@/store/paths", () => ({
  resolveStorePath: mocks.resolveStorePath
}));

vi.mock("@/store/store", () => ({
  upsertProfile: mocks.upsertProfile,
  setActiveProfile: mocks.setActiveProfile
}));

import { loginCopilot } from "@/services/login-copilot";

describe("login copilot", () => {
  const ttyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");

  beforeEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true
    });

    mocks.requestDeviceCode.mockResolvedValue({
      device_code: "dev-code",
      user_code: "user-code",
      verification_uri: "https://github.com/login/device",
      interval: 1,
      expires_in: 600
    });
    mocks.pollForAccessToken.mockResolvedValue("gh-token");
    mocks.fetchCopilotLabel.mockResolvedValue("alice@example.com");
    mocks.fetchCopilotUsageForProfile.mockResolvedValue({
      snapshot: {
        planType: "Business ",
        primaryUsedPercent: 0,
        secondaryUsedPercent: 0,
        metrics: []
      }
    });
    mocks.resolveStorePath.mockReturnValue("/tmp/agentbar-store.json");
    mocks.randomUUID.mockReturnValue("copilot-1");
    mocks.upsertProfile.mockResolvedValue(undefined);
    mocks.setActiveProfile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (ttyDescriptor) {
      Object.defineProperty(process.stdin, "isTTY", ttyDescriptor);
    } else {
      delete (process.stdin as any).isTTY;
    }
    vi.clearAllMocks();
  });

  test("stores normalized planType from usage snapshot during login", async () => {
    await loginCopilot();

    expect(mocks.upsertProfile).toHaveBeenCalledWith(
      "/tmp/agentbar-store.json",
      expect.objectContaining({
        id: "copilot-1",
        provider: "copilot",
        email: "alice@example.com",
        planType: "business"
      })
    );
  });

  test("does not persist unknown planType", async () => {
    mocks.fetchCopilotUsageForProfile.mockResolvedValue({
      snapshot: {
        planType: "unknown",
        primaryUsedPercent: 0,
        secondaryUsedPercent: 0,
        metrics: []
      }
    });

    await loginCopilot();

    const savedProfile = mocks.upsertProfile.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(savedProfile.planType).toBeUndefined();
  });

  test("continues login when usage lookup fails", async () => {
    mocks.fetchCopilotUsageForProfile.mockRejectedValue(new Error("network"));

    await expect(loginCopilot()).resolves.toBeUndefined();

    const savedProfile = mocks.upsertProfile.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(savedProfile.provider).toBe("copilot");
    expect(savedProfile.email).toBe("alice@example.com");
    expect(savedProfile.planType).toBeUndefined();
    expect(mocks.setActiveProfile).toHaveBeenCalledWith("/tmp/agentbar-store.json", "copilot", "copilot-1");
  });
});
