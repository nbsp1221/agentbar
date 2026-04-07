import { describe, expect, test } from "vitest";
import { fetchCodexUsageForProfile, snapshotFromPayload } from "@/providers/codex/usage";
import type { AuthProfile } from "@/store/types";

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

  test("surfaces refresh token reuse when usage refresh fails", async () => {
    const profile: AuthProfile & { provider: "codex" } = {
      id: "p1",
      provider: "codex",
      email: "a@b.com",
      planType: "plus",
      createdAt: "2026-02-11T00:00:00.000Z",
      updatedAt: "2026-02-12T00:00:00.000Z",
      credentials: {
        kind: "codex_oauth",
        accessToken: "expired-access-token",
        refreshToken: "rt",
        expiresAt: Date.parse("2026-02-12T01:00:00.000Z"),
        lastRefresh: "2026-02-12T00:00:00.000Z"
      }
    };

    const fetchImpl = async (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url === "https://chatgpt.com/backend-api/wham/usage") {
        expect(init?.method).toBe("GET");
        return new Response("unauthorized", { status: 401 });
      }

      if (url === "https://auth.openai.com/oauth/token") {
        expect(init?.method).toBe("POST");
        return new Response(
          JSON.stringify({
            error: {
              message: "Your refresh token has already been used to generate a new access token.",
              type: "invalid_request_error",
              code: "refresh_token_reused"
            }
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    const out = await fetchCodexUsageForProfile(profile, fetchImpl as unknown as typeof fetch);

    expect(out.snapshot).toBeUndefined();
    expect(out.error).toBe("refresh_token_reused");
  });
});
