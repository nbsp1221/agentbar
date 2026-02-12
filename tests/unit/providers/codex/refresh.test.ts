import { describe, expect, test } from "vitest";
import { ensureFreshCodexProfile } from "@/providers/codex/refresh";
import type { AuthProfile } from "@/store/types";

function b64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = { alg: "none", typ: "JWT" };
  return `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}.`;
}

describe("codex proactive refresh", () => {
  test("refreshes when token is expired and updates expiresAt from access token exp", async () => {
    const now = Date.parse("2026-02-12T00:00:00.000Z");
    const expSeconds = Math.floor((now + 3600 * 1000) / 1000);

    const profile: AuthProfile = {
      id: "p1",
      provider: "codex",
      email: "a@b.com",
      createdAt: "2026-02-11T00:00:00.000Z",
      updatedAt: "2026-02-11T00:00:00.000Z",
      credentials: {
        kind: "codex_oauth",
        accessToken: "old",
        refreshToken: "rt",
        expiresAt: now - 1000
      }
    };

    let called = 0;
    const fetchImpl = async (url: string): Promise<Response> => {
      called++;
      expect(url).toContain("https://auth.openai.com/oauth/token");
      return new Response(
        JSON.stringify({
          access_token: makeJwt({ exp: expSeconds }),
          refresh_token: "rt2",
          id_token: "id2"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const out = await ensureFreshCodexProfile(profile, {
      nowMs: now,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(called).toBe(1);
    expect(out.updatedProfile?.credentials.kind).toBe("codex_oauth");
    expect((out.updatedProfile?.credentials as any).accessToken).toContain(".");
    expect((out.updatedProfile?.credentials as any).refreshToken).toBe("rt2");
    expect((out.updatedProfile?.credentials as any).expiresAt).toBe(expSeconds * 1000);
  });

  test("does not refresh when token is still fresh", async () => {
    const now = Date.parse("2026-02-12T00:00:00.000Z");
    const profile: AuthProfile = {
      id: "p1",
      provider: "codex",
      email: "a@b.com",
      createdAt: "2026-02-11T00:00:00.000Z",
      updatedAt: "2026-02-12T00:00:00.000Z",
      credentials: {
        kind: "codex_oauth",
        accessToken: "ok",
        refreshToken: "rt",
        expiresAt: now + 3600 * 1000
      }
    };

    const fetchImpl = async (): Promise<Response> => {
      throw new Error("should not be called");
    };

    const out = await ensureFreshCodexProfile(profile, {
      nowMs: now,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });

    expect(out.updatedProfile).toBeUndefined();
  });
});

