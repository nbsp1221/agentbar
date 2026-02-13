import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readSettingValues: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  unsetSetting: vi.fn()
}));

vi.mock("@/config/settings", () => ({
  settingKeys: ["usage.timeoutMs", "usage.ttlMs", "usage.errorTtlMs", "usage.concurrency"],
  readSettingValues: mocks.readSettingValues,
  getSetting: mocks.getSetting,
  setSetting: mocks.setSetting,
  unsetSetting: mocks.unsetSetting
}));

import { getSettingValue, listSettings, setSettingValue, unsetSettingValue } from "@/services/settings";

describe("settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.readSettingValues.mockReturnValue({
      "usage.timeoutMs": 5000,
      "usage.ttlMs": 60000,
      "usage.errorTtlMs": 10000,
      "usage.concurrency": 4
    });

    mocks.getSetting.mockImplementation((key: string) => {
      if (key === "usage.timeoutMs") return 5000;
      if (key === "usage.ttlMs") return 60000;
      if (key === "usage.errorTtlMs") return 10000;
      if (key === "usage.concurrency") return 4;
      return undefined;
    });

    mocks.setSetting.mockImplementation((key: string, value: number) => ({
      "usage.timeoutMs": key === "usage.timeoutMs" ? value : 5000,
      "usage.ttlMs": key === "usage.ttlMs" ? value : 60000,
      "usage.errorTtlMs": key === "usage.errorTtlMs" ? value : 10000,
      "usage.concurrency": key === "usage.concurrency" ? value : 4
    }));

    mocks.unsetSetting.mockImplementation((key: string) => ({
      "usage.timeoutMs": key === "usage.timeoutMs" ? 5000 : 7000,
      "usage.ttlMs": key === "usage.ttlMs" ? 60000 : 45000,
      "usage.errorTtlMs": key === "usage.errorTtlMs" ? 10000 : 9000,
      "usage.concurrency": key === "usage.concurrency" ? 4 : 8
    }));
  });

  test("lists current settings", () => {
    const listed = listSettings();
    expect(mocks.readSettingValues).toHaveBeenCalledTimes(1);
    expect(listed).toEqual({
      "usage.timeoutMs": 5000,
      "usage.ttlMs": 60000,
      "usage.errorTtlMs": 10000,
      "usage.concurrency": 4
    });
  });

  test("gets a supported setting key", () => {
    expect(getSettingValue("usage.timeoutMs")).toBe(5000);
    expect(mocks.getSetting).toHaveBeenCalledWith("usage.timeoutMs");
  });

  test("rejects unknown setting key", () => {
    expect(() => getSettingValue("unknown")).toThrow("Unknown setting key: unknown");
    expect(mocks.getSetting).not.toHaveBeenCalled();
  });

  test("sets setting key with validation", () => {
    const saved = setSettingValue("usage.ttlMs", "120000");
    expect(mocks.setSetting).toHaveBeenCalledWith("usage.ttlMs", 120000);
    expect(saved["usage.ttlMs"]).toBe(120000);
  });

  test("rejects invalid value when setting key", () => {
    expect(() => setSettingValue("usage.concurrency", "0")).toThrow("usage.concurrency must be a positive integer");
    expect(mocks.setSetting).not.toHaveBeenCalled();
  });

  test("unsets one setting key", () => {
    const saved = unsetSettingValue("usage.timeoutMs");
    expect(mocks.unsetSetting).toHaveBeenCalledWith("usage.timeoutMs");
    expect(saved["usage.timeoutMs"]).toBe(5000);
  });
});
