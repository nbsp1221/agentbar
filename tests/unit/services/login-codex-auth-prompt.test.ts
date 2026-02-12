import { describe, expect, test } from "vitest";
import { buildCodexAuthorizeOutput } from "../../../src/services/login-codex";

describe("login codex authorize output", () => {
  test("keeps the authorization URL as raw standalone text", () => {
    const url =
      "https://auth.openai.com/oauth/authorize?client_id=abc&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A1455%2Fauth%2Fcallback&scope=openid+profile+email+offline_access&state=xyz";

    const output = buildCodexAuthorizeOutput(url);

    expect(output.boxedMessage).not.toContain("http://");
    expect(output.boxedMessage).not.toContain("https://");
    expect(output.rawUrl).toBe(url);
  });
});
