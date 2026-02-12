import { describe, expect, test } from "vitest";
import { snapshotFromCopilotUser } from "@/providers/copilot/usage";

describe("copilot usage mapping", () => {
  test("maps snake_case quota snapshot with request counts", () => {
    const out = snapshotFromCopilotUser({
      copilot_plan: "pro",
      quota_reset_date_utc: "2026-02-13T00:00:00.000Z",
      quota_snapshots: {
        premium_interactions: { percent_remaining: 80, remaining: 240, entitlement: 300 },
        chat: { percent_remaining: 75, remaining: 75, entitlement: 100 },
        completions: { percent_remaining: 60, remaining: 600, entitlement: 1000 }
      }
    });

    expect(out.planType).toBe("pro");
    expect(out.primaryUsedPercent).toBe(20);
    expect(out.secondaryUsedPercent).toBe(25);
    expect(out.metrics.find((m) => m.label === "premium")?.remaining).toBe(240);
    expect(out.metrics.find((m) => m.label === "chat")?.entitlement).toBe(100);
    expect(out.metrics.find((m) => m.label === "completions")?.usedPercent).toBe(40);
    expect(out.resetAtMs).toBe(Date.parse("2026-02-13T00:00:00.000Z"));
  });
});
