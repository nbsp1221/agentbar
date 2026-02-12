import { describe, expect, test } from "vitest";
import { snapshotFromPayload } from "../../../../src/providers/codex/usage";

describe("codex usage mapping", () => {
  test("maps wham payload windows", () => {
    const snapshot = snapshotFromPayload({
      plan_type: "plus",
      rate_limit: {
        primary_window: { used_percent: 20, reset_at: 1000, limit_window_seconds: 18000 },
        secondary_window: { used_percent: 30, reset_at: 2000, limit_window_seconds: 604800 }
      }
    });

    expect(snapshot.primaryUsedPercent).toBe(20);
    expect(snapshot.secondaryUsedPercent).toBe(30);
    expect(snapshot.planType).toBe("plus");
  });
});
