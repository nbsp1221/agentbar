import { describe, expect, test } from "vitest";
import { inferCodexAccountId, inferCodexAccountType, inferCodexEmail } from "../../../../src/providers/codex/profile";

describe("codex profile inference", () => {
  test("infers business from team-style claim", () => {
    const accountType = inferCodexAccountType({
      accessPayload: {
        "https://api.openai.com/auth": {
          chatgpt_account_type: "team"
        }
      }
    });

    expect(accountType).toBe("business");
  });

  test("falls back to personal when claims do not include account type", () => {
    const accountType = inferCodexAccountType({
      accessPayload: {},
      idPayload: {}
    });

    expect(accountType).toBe("personal");
  });

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
});

test("infers business from chatgpt_plan_type=team", () => {
  const accountType = inferCodexAccountType({
    idPayload: {
      "https://api.openai.com/auth": {
        chatgpt_plan_type: "team"
      }
    }
  });

  expect(accountType).toBe("business");
});
