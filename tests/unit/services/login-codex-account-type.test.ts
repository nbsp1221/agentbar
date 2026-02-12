import { describe, expect, test } from "vitest";
import { inferCodexAccountType } from "@/services/login-codex";

describe("login codex account type inference", () => {
  test("maps team/business-style claims to business", () => {
    const result = inferCodexAccountType({
      accessPayload: {
        "https://api.openai.com/auth": {
          chatgpt_account_type: "team"
        }
      }
    });

    expect(result).toBe("business");
  });

  test("defaults to personal when no claim exists", () => {
    const result = inferCodexAccountType({
      accessPayload: {},
      idPayload: {}
    });

    expect(result).toBe("personal");
  });
});
