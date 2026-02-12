import { describe, expect, test } from "vitest";
import { normalizePersistedPlanType, normalizePlanSelector } from "@/utils/plan";

describe("plan normalization utils", () => {
  test("normalizes plan selector with trim+lowercase", () => {
    expect(normalizePlanSelector(" Team ")).toBe("team");
    expect(normalizePlanSelector("")).toBeUndefined();
    expect(normalizePlanSelector("   ")).toBeUndefined();
    expect(normalizePlanSelector(undefined)).toBeUndefined();
  });

  test("normalizes persisted plan type and drops unknown", () => {
    expect(normalizePersistedPlanType(" Business ")).toBe("business");
    expect(normalizePersistedPlanType("unknown")).toBeUndefined();
    expect(normalizePersistedPlanType(" UNKNOWN ")).toBeUndefined();
    expect(normalizePersistedPlanType(undefined)).toBeUndefined();
  });
});
