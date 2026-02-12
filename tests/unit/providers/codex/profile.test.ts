import { describe, expect, test } from "vitest";
import { inferCodexAccountId, inferCodexEmail, inferCodexPlanType } from "@/providers/codex/profile";

describe("codex profile inference", () => {
  test("extracts account id from namespaced auth claim", () => {
    const accountId = inferCodexAccountId({
      accessPayload: {
        "https://api.openai.com/auth": {
          chatgpt_account_id: "acct_123"
        }
      }
    });

    expect(accountId).toBe("acct_123");
  });

  test("extracts email from id token payload", () => {
    const email = inferCodexEmail({
      idPayload: {
        email: "a@b.com"
      }
    });

    expect(email).toBe("a@b.com");
  });

  test("extracts plan type from namespaced auth claims", () => {
    const planType = inferCodexPlanType({
      accessPayload: {
        "https://api.openai.com/auth": {
          chatgpt_plan_type: "Team "
        }
      }
    });

    expect(planType).toBe("team");
  });

  test("returns undefined when no plan claim exists", () => {
    const planType = inferCodexPlanType({
      accessPayload: {},
      idPayload: {}
    });

    expect(planType).toBeUndefined();
  });
});
