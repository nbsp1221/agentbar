import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { formatEtaShort, formatUsageSections } from "@/cli/render/usage";

describe("cli usage renderer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-12T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("formats reset ETA with day/hour units", () => {
    const text = formatEtaShort(Date.now() + 25 * 60 * 60 * 1000);
    expect(text).toBe("1d 1h");
  });

  test("renders provider-specific sections instead of one mixed table", () => {
    const text = formatUsageSections([
      {
        provider: "codex",
        email: "alice@example.com",
        planType: "plus",
        note: "line1\nline2 line3",
        primaryLabel: "5h",
        primaryUsedPercent: 20,
        primaryResetAtMs: Date.now() + 3 * 60 * 60 * 1000,
        secondaryLabel: "weekly",
        secondaryUsedPercent: 30,
        secondaryResetAtMs: Date.now() + 2 * 24 * 60 * 60 * 1000
      },
      {
        provider: "copilot",
        email: "bob@example.com",
        planType: "pro",
        note: "copilot note",
        metrics: [
          {
            label: "premium",
            usedPercent: 10,
            remaining: 270,
            entitlement: 300
          },
          {
            label: "chat",
            usedPercent: 5,
            remaining: 95,
            entitlement: 100
          },
          {
            label: "completions",
            usedPercent: 12,
            remaining: 440,
            entitlement: 500
          }
        ]
      }
    ]);

    expect(text).toContain("Codex Usage");
    expect(text).toContain("Copilot Usage");
    expect(text).toContain("5h left");
    expect(text).toContain("weekly left");
    expect(text).toContain("premium left");
    expect(text).toContain("270/300");
    expect(text).toContain("line1 line2 line3");
    expect(text).toContain("copilot note");
    expect(text).not.toContain("window1");
    expect(text).not.toContain("used1");
  });
});
