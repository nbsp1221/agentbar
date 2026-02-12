import { describe, expect, test } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  parseOAuthRedirect
} from "../../../../src/providers/codex/oauth";

describe("codex oauth", () => {
  test("builds authorize url with codex oauth params", () => {
    const url = buildAuthorizeUrl({
      state: "state-1",
      verifier: "verifier-1",
      redirectUri: "http://localhost:1455/auth/callback"
    });

    expect(url).toContain("https://auth.openai.com/oauth/authorize");
    expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A1455%2Fauth%2Fcallback");
    expect(url).toContain("code_challenge=");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("state=state-1");
    expect(url).toContain("id_token_add_organizations=true");
    expect(url).toContain("codex_cli_simplified_flow=true");
    expect(url).toContain("originator=pi");
  });

  test("parses redirect url", () => {
    const parsed = parseOAuthRedirect(
      "http://localhost:1455/auth/callback?code=abc123&state=state-1"
    );
    expect(parsed.code).toBe("abc123");
    expect(parsed.state).toBe("state-1");
  });

  test("exchanges code using form-url-encoded payload", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = (async (url: URL | RequestInfo, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          access_token: "access-1",
          refresh_token: "refresh-1"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const result = await exchangeCodeForTokens({
      code: "code-1",
      verifier: "verifier-1",
      fetchImpl
    });

    expect(result.access_token).toBe("access-1");
    expect(calls).toHaveLength(1);
    const init = calls[0]?.init;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(String(init?.body ?? "")).toContain("grant_type=authorization_code");
    expect(String(init?.body ?? "")).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A1455%2Fauth%2Fcallback");
  });
});
